package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
)

// Anthropic types
type AnthropicRequest struct {
	Model     string    `json:"model"`
	Messages  []Message `json:"messages"`
	System    string    `json:"system,omitempty"`
	MaxTokens int       `json:"max_tokens"`
	Tools     []Tool    `json:"tools,omitempty"`
	Stream    bool      `json:"stream,omitempty"`
}

type Message struct {
	Role    string         `json:"role"`
	Content []ContentBlock `json:"content"`
}

type ContentBlock struct {
	Type    string   `json:"type"`
	Text    string   `json:"text,omitempty"`
	ToolUse *ToolUse `json:"tool_use,omitempty"`
	ToolRes *ToolRes `json:"tool_result,omitempty"`
}

type ToolUse struct {
	ID    string         `json:"id"`
	Name  string         `json:"name"`
	Input map[string]any `json:"input"`
}

type ToolRes struct {
	ToolUseID string `json:"tool_use_id"`
	Content   string `json:"content"`
	IsError   bool   `json:"is_error,omitempty"`
}

type Tool struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	InputSchema map[string]any `json:"input_schema"`
}

// OpenAI Chat Completions types
type ChatRequest struct {
	Model    string          `json:"model"`
	Messages []ChatMessage   `json:"messages"`
	Tools    []ChatTool      `json:"tools,omitempty"`
	Stream   bool            `json:"stream,omitempty"`
}

type ChatMessage struct {
	Role       string         `json:"role"`
	Content    any            `json:"content,omitempty"`
	ToolCalls  []ChatToolCall `json:"tool_calls,omitempty"`
	ToolCallID string         `json:"tool_call_id,omitempty"`
}

type ChatTool struct {
	Type     string       `json:"type"`
	Function ChatFunction `json:"function"`
}

type ChatFunction struct {
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Parameters  map[string]any `json:"parameters,omitempty"`
}

type ChatToolCall struct {
	ID       string       `json:"id"`
	Type     string       `json:"type"`
	Function ChatCallFunc `json:"function"`
}

type ChatCallFunc struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type ChatResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Model   string `json:"model"`
	Choices []struct {
		Index   int         `json:"index"`
		Message ChatMessage `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

// OpenAI Responses API types
type ResponsesRequest struct {
	Model        string             `json:"model"`
	Input        any                `json:"input"`
	Instructions string             `json:"instructions,omitempty"`
	Tools        []ChatTool         `json:"tools,omitempty"`
	Stream       bool               `json:"stream,omitempty"`
	Store        bool               `json:"store,omitempty"`
}

type ResponsesInputItem struct {
	Type      string               `json:"type"`
	Role      string               `json:"role,omitempty"`
	Content   []ResponsesContentPart `json:"content,omitempty"`
	CallID    string               `json:"call_id,omitempty"`
	Name      string               `json:"name,omitempty"`
	Arguments string               `json:"arguments,omitempty"`
	Output    string               `json:"output,omitempty"`
}

type ResponsesContentPart struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
}

type ResponsesResponse struct {
	ID     string                `json:"id"`
	Object string                `json:"object"`
	Output []ResponsesOutputItem `json:"output"`
	Usage  struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

type ResponsesOutputItem struct {
	ID      string               `json:"id"`
	Type    string               `json:"type"`
	Role    string               `json:"role,omitempty"`
	Content []ResponsesContentPart `json:"content,omitempty"`
	Status  string               `json:"status,omitempty"`
	// For function_call items in output
	CallID    string `json:"call_id,omitempty"`
	Name      string `json:"name,omitempty"`
	Arguments string `json:"arguments,omitempty"`
}

func main() {
	port := os.Getenv("PROXY_PORT")
	if port == "" {
		port = "8081"
	}

	http.HandleFunc("/v1/messages", handleAnthropicToTarget)

	fmt.Printf("Anthropic-to-Target Proxy starting on :%s\n", port)
	fmt.Printf("Target API URL: %s\n", getTargetURL())
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func getTargetURL() string {
	url := os.Getenv("TARGET_API_URL")
	if url == "" {
		return "https://api.openai.com/v1/responses"
	}
	return url
}

func handleAnthropicToTarget(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("XAI_API_KEY")
	}
	if apiKey == "" {
		http.Error(w, "API Key not set", http.StatusInternalServerError)
		return
	}

	var anthroReq AnthropicRequest
	if err := json.NewDecoder(r.Body).Decode(&anthroReq); err != nil {
		http.Error(w, "Invalid Anthropic request", http.StatusBadRequest)
		return
	}

	targetURL := getTargetURL()
	useResponses := strings.Contains(targetURL, "/responses")

	var body []byte
	if useResponses {
		body, _ = json.Marshal(translateToResponses(anthroReq))
	} else {
		body, _ = json.Marshal(translateToChat(anthroReq))
	}

	req, err := http.NewRequestWithContext(r.Context(), "POST", targetURL, bytes.NewReader(body))
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create request: %v", err), http.StatusInternalServerError)
		return
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, fmt.Sprintf("Request failed: %v", err), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response", http.StatusInternalServerError)
		return
	}

	if resp.StatusCode >= 400 {
		log.Printf("Upstream error %d: %s", resp.StatusCode, string(respBody))
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(respBody)
		return
	}

	if useResponses {
		var rResp ResponsesResponse
		if err := json.Unmarshal(respBody, &rResp); err != nil {
			log.Printf("Failed to decode response: %v\nBody: %s", err, string(respBody))
			http.Error(w, "Failed to decode response", http.StatusInternalServerError)
			return
		}
		anthroResp := translateFromResponses(rResp)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(anthroResp)
		return
	}

	// Chat Completions path
	var chatResp ChatResponse
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		log.Printf("Failed to decode chat response: %v\nBody: %s", err, string(respBody))
		http.Error(w, "Failed to decode chat response", http.StatusInternalServerError)
		return
	}
	anthroResp := translateFromChat(chatResp)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(anthroResp)
}

func translateToResponses(req AnthropicRequest) ResponsesRequest {
	targetModel := os.Getenv("TARGET_MODEL")
	if targetModel == "" {
		targetModel = "gpt-4o"
	}

	r := ResponsesRequest{
		Model:        targetModel,
		Instructions: req.System,
		Stream:       req.Stream,
		Store:        true,
	}

	// Build input array using input_text / function_call / function_call_output items.
	// xAI's Responses API uses the OpenAI Responses API input item types.
	var input []ResponsesInputItem
	for _, msg := range req.Messages {
		for _, block := range msg.Content {
			switch block.Type {
			case "text":
				input = append(input, ResponsesInputItem{
					Type: "input_text",
					Role: msg.Role,
					Content: []ResponsesContentPart{{Type: "input_text", Text: block.Text}},
				})
			case "tool_use":
				args, _ := json.Marshal(block.ToolUse.Input)
				input = append(input, ResponsesInputItem{
					Type:      "function_call",
					CallID:    block.ToolUse.ID,
					Name:      block.ToolUse.Name,
					Arguments: string(args),
				})
			case "tool_result":
				input = append(input, ResponsesInputItem{
					Type:   "function_call_output",
					CallID: block.ToolRes.ToolUseID,
					Output: block.ToolRes.Content,
				})
			}
		}
	}

	if len(input) > 0 {
		r.Input = input
	}
	for _, tool := range req.Tools {
		r.Tools = append(r.Tools, ChatTool{
			Type: "function",
			Function: ChatFunction{
				Name:        tool.Name,
				Description: tool.Description,
				Parameters:  tool.InputSchema,
			},
		})
	}
	return r
}

func translateToChat(req AnthropicRequest) ChatRequest {
	targetModel := os.Getenv("TARGET_MODEL")
	if targetModel == "" {
		targetModel = "gpt-4o"
	}

	c := ChatRequest{
		Model:  targetModel,
		Stream: req.Stream,
	}

	if req.System != "" {
		c.Messages = append(c.Messages, ChatMessage{
			Role:    "system",
			Content: req.System,
		})
	}

	for _, msg := range req.Messages {
		cm := ChatMessage{Role: msg.Role}
		var textParts []string

		for _, block := range msg.Content {
			switch block.Type {
			case "text":
				textParts = append(textParts, block.Text)
			case "tool_use":
				args, _ := json.Marshal(block.ToolUse.Input)
				cm.ToolCalls = append(cm.ToolCalls, ChatToolCall{
					ID:   block.ToolUse.ID,
					Type: "function",
					Function: ChatCallFunc{
						Name:      block.ToolUse.Name,
						Arguments: string(args),
					},
				})
			case "tool_result":
				cm.Role = "tool"
				cm.ToolCallID = block.ToolRes.ToolUseID
				cm.Content = block.ToolRes.Content
			}
		}

		if cm.Role != "tool" {
			cm.Content = strings.Join(textParts, "\n")
		}
		c.Messages = append(c.Messages, cm)
	}

	for _, tool := range req.Tools {
		c.Tools = append(c.Tools, ChatTool{
			Type: "function",
			Function: ChatFunction{
				Name:        tool.Name,
				Description: tool.Description,
				Parameters:  tool.InputSchema,
			},
		})
	}
	return c
}

func translateFromResponses(r ResponsesResponse) any {
	resp := map[string]any{
		"id":      r.ID,
		"type":    "message",
		"role":    "assistant",
		"model":   "claude-sonnet-4-6",
		"stop_reason": "end_turn",
		"content": []any{},
		"usage": map[string]any{
			"input_tokens":  r.Usage.InputTokens,
			"output_tokens": r.Usage.OutputTokens,
		},
	}

	var content []any
	for _, item := range r.Output {
		switch item.Type {
		case "message":
			for _, part := range item.Content {
				content = append(content, map[string]any{
					"type": "text",
					"text": part.Text,
				})
			}
		case "function_call":
			var input map[string]any
			json.Unmarshal([]byte(item.Arguments), &input)
			content = append(content, map[string]any{
				"type":  "tool_use",
				"id":    item.CallID,
				"name":  item.Name,
				"input": input,
			})
		}
	}
	resp["content"] = content
	return resp
}

func translateFromChat(r ChatResponse) any {
	resp := map[string]any{
		"id":      r.ID,
		"type":    "message",
		"role":    "assistant",
		"model":   "claude-sonnet-4-6",
		"stop_reason": "end_turn",
		"content": []any{},
		"usage": map[string]any{
			"input_tokens":  r.Usage.PromptTokens,
			"output_tokens": r.Usage.CompletionTokens,
		},
	}

	if len(r.Choices) == 0 {
		return resp
	}

	msg := r.Choices[0].Message
	var content []any

	if msg.Content != nil {
		switch v := msg.Content.(type) {
		case string:
			if v != "" {
				content = append(content, map[string]any{
					"type": "text",
					"text": v,
				})
			}
		}
	}

	for _, tc := range msg.ToolCalls {
		var input map[string]any
		json.Unmarshal([]byte(tc.Function.Arguments), &input)
		content = append(content, map[string]any{
			"type":  "tool_use",
			"id":    tc.ID,
			"name":  tc.Function.Name,
			"input": input,
		})
	}

	resp["content"] = content
	return resp
}
