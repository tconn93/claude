package proxy

import (
	"encoding/json"
	"fmt"
	"github.com/tyler/claude-code-go/internal/llm"
)

type OpenAIResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Message      OpenAIMessage `json:"message"`
		FinishReason string        `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
	} `json:"usage"`
}

type OpenAIStreamChunk struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Delta struct {
			Role      string           `json:"role,omitempty"`
			Content   string           `json:"content,omitempty"`
			ToolCalls []OpenAIToolCall `json:"tool_calls,omitempty"`
		} `json:"delta"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
}

func (t *OpenAITranslator) TranslateResponse(resp any) (*llm.MessageResponse, error) {
	oaiResp, ok := resp.(*OpenAIResponse)
	if !ok {
		return nil, fmt.Errorf("invalid response type")
	}

	if len(oaiResp.Choices) == 0 {
		return nil, fmt.Errorf("no choices in response")
	}

	choice := oaiResp.Choices[0]
	llmResp := &llm.MessageResponse{
		ID:    oaiResp.ID,
		Type:  "message",
		Role:  llm.RoleAssistant,
		Model: oaiResp.Model,
		Usage: llm.Usage{
			InputTokens:  oaiResp.Usage.PromptTokens,
			OutputTokens: oaiResp.Usage.CompletionTokens,
		},
	}

	if choice.Message.Content != nil {
		contentStr, ok := choice.Message.Content.(string)
		if ok {
			llmResp.Content = append(llmResp.Content, llm.ContentBlock{
				Type: "text",
				Text: contentStr,
			})
		}
	}

	for _, tc := range choice.Message.ToolCalls {
		var input map[string]any
		json.Unmarshal([]byte(tc.Function.Arguments), &input)
		llmResp.Content = append(llmResp.Content, llm.ContentBlock{
			Type: "tool_use",
			ToolUse: &llm.ToolUse{
				ID:    tc.ID,
				Name:  tc.Function.Name,
				Input: input,
			},
		})
	}

	return llmResp, nil
}

func (t *OpenAITranslator) TranslateStreamEvent(event any) (*llm.StreamEvent, error) {
	chunk, ok := event.(*OpenAIStreamChunk)
	if !ok {
		return nil, fmt.Errorf("invalid stream chunk type")
	}

	if len(chunk.Choices) == 0 {
		return nil, nil // Or return a specific event
	}

	choice := chunk.Choices[0]
	delta := choice.Delta

	if delta.Content != "" {
		return &llm.StreamEvent{
			Type: "content_block_delta",
			Delta: &llm.Delta{
				Type: "text_delta",
				Text: delta.Content,
			},
		}, nil
	}

	if len(delta.ToolCalls) > 0 {
		tc := delta.ToolCalls[0]
		// For simplicity, we'll assume tool calls come in one chunk or handle buffering elsewhere
		// Anthropic's tool_use event is different from deltas, but we'll map it to a content block delta or similar
		return &llm.StreamEvent{
			Type: "content_block_start",
			ContentBlock: &llm.ContentBlock{
				Type: "tool_use",
				ToolUse: &llm.ToolUse{
					ID:    tc.ID,
					Name:  tc.Function.Name,
					Input: make(map[string]any), // Arguments will come in deltas
				},
			},
		}, nil
	}

	return nil, nil
}
