package proxy

import (
	"encoding/json"
	"fmt"
	"github.com/tyler/claude-code-go/internal/llm"
)

type OpenAIResponsesTranslator struct{}

type OpenAIResponseRequest struct {
	Model  string       `json:"model"`
	Input  []OpenAIItem `json:"input"`
	Tools  []OpenAITool `json:"tools,omitempty"`
	Stream bool         `json:"stream,omitempty"`
	Store  bool         `json:"store,omitempty"`
}

type OpenAIItem struct {
	Type      string               `json:"type"`
	Role      string               `json:"role,omitempty"`
	Content   []OpenAIContentPart `json:"content,omitempty"`
	CallID    string               `json:"call_id,omitempty"`
	Name      string               `json:"name,omitempty"`
	Arguments string               `json:"arguments,omitempty"`
	Output    string               `json:"output,omitempty"`
}

type OpenAIContentPart struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
}

type OpenAIResponseObject struct {
	ID     string       `json:"id"`
	Object string       `json:"object"`
	Output []OpenAIItem `json:"output"`
	Usage  struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

func (t *OpenAIResponsesTranslator) TranslateRequest(req llm.MessageRequest) (any, error) {
	oaiReq := OpenAIResponseRequest{
		Model:  req.Model,
		Stream: req.Stream,
		Store:  true,
	}

	if req.System != "" {
		oaiReq.Input = append(oaiReq.Input, OpenAIItem{
			Type: "message",
			Role: "system",
			Content: []OpenAIContentPart{{Type: "text", Text: req.System}},
		})
	}

	for _, msg := range req.Messages {
		for _, block := range msg.Content {
			switch block.Type {
			case "text":
				oaiReq.Input = append(oaiReq.Input, OpenAIItem{
					Type: "message",
					Role: string(msg.Role),
					Content: []OpenAIContentPart{{Type: "text", Text: block.Text}},
				})
			case "tool_use":
				args, _ := json.Marshal(block.ToolUse.Input)
				oaiReq.Input = append(oaiReq.Input, OpenAIItem{
					Type:      "function_call",
					CallID:    block.ToolUse.ID,
					Name:      block.ToolUse.Name,
					Arguments: string(args),
				})
			case "tool_result":
				oaiReq.Input = append(oaiReq.Input, OpenAIItem{
					Type:   "function_call_output",
					CallID: block.ToolRes.ToolUseID,
					Output: block.Content,
				})
			}
		}
	}

	for _, tool := range req.Tools {
		oaiReq.Tools = append(oaiReq.Tools, OpenAITool{
			Type: "function",
			Function: OpenAIFunction{
				Name:        tool.Name,
				Description: tool.Description,
				Parameters:  tool.InputSchema,
			},
		})
	}

	return oaiReq, nil
}

func (t *OpenAIResponsesTranslator) TranslateResponse(resp any) (*llm.MessageResponse, error) {
	oaiResp, ok := resp.(*OpenAIResponseObject)
	if !ok {
		// Try to unmarshal if it's a map (generic JSON decode)
		if m, ok := resp.(map[string]any); ok {
			b, _ := json.Marshal(m)
			if err := json.Unmarshal(b, &oaiResp); err != nil {
				return nil, fmt.Errorf("failed to unmarshal OpenAI response: %v", err)
			}
		} else {
			return nil, fmt.Errorf("invalid response type: %T", resp)
		}
	}

	llmResp := &llm.MessageResponse{
		ID:    oaiResp.ID,
		Type:  "message",
		Role:  llm.RoleAssistant,
		Model: "claude-3-5-sonnet", // Compatibility
		Usage: llm.Usage{
			InputTokens:  oaiResp.Usage.InputTokens,
			OutputTokens: oaiResp.Usage.OutputTokens,
		},
	}

	for _, item := range oaiResp.Output {
		if item.Type == "message" {
			for _, part := range item.Content {
				llmResp.Content = append(llmResp.Content, llm.ContentBlock{
					Type: "text",
					Text: part.Text,
				})
			}
		} else if item.Type == "function_call" {
			var input map[string]any
			json.Unmarshal([]byte(item.Arguments), &input)
			llmResp.Content = append(llmResp.Content, llm.ContentBlock{
				Type: "tool_use",
				ToolUse: &llm.ToolUse{
					ID:    item.CallID,
					Name:  item.Name,
					Input: input,
				},
			})
		}
	}

	return llmResp, nil
}

func (t *OpenAIResponsesTranslator) TranslateStreamEvent(event any) (*llm.StreamEvent, error) {
	// SSE streaming for /v1/responses uses a slightly different item-based delta format
	// For now, we'll keep it simple or implement as needed.
	return nil, nil
}
