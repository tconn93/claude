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

// Simplified types for the standalone proxy
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

type OpenAIRequest struct {
	Model     string          `json:"model"`
	Messages  []OpenAIMessage `json:"messages"`
	Tools     []OpenAITool    `json:"tools,omitempty"`
	Stream    bool            `json:"stream,omitempty"`
}

type OpenAIMessage struct {
	Role       string           `json:"role"`
	Content    any              `json:"content,omitempty"`
	ToolCalls  []OpenAIToolCall `json:"tool_calls,omitempty"`
	ToolCallID string           `json:"tool_call_id,omitempty"`
}

type OpenAITool struct {
	Type     string         `json:"type"`
	Function OpenAIFunction `json:"function"`
}

type OpenAIFunction struct {
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Parameters  map[string]any `json:"parameters,omitempty"`
}

type OpenAIToolCall struct {
	ID       string         `json:"id"`
	Type     string         `json:"type"`
	Function OpenAICallFunc `json:"function"`
}

type OpenAICallFunc struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

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

func main() {
	port := os.Getenv("PROXY_PORT")
	if port == "" {
		port = "8081"
	}

	http.HandleFunc("/v1/messages", handleAnthropicToTarget)

	fmt.Printf("Standalone Anthropic-to-OpenAI Proxy (Responses API) starting on :%s\n", port)
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
	
	var body []byte
	if strings.Contains(targetURL, "/responses") {
		oaiReq := translateToResponses(anthroReq)
		body, _ = json.Marshal(oaiReq)
	} else {
		oaiReq := translateToChatCompletions(anthroReq)
		body, _ = json.Marshal(oaiReq)
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

	if !strings.Contains(targetURL, "/responses") {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
		return
	}

	// Translate Response back to Anthropic format
	var oaiResp OpenAIResponseObject
	if err := json.NewDecoder(resp.Body).Decode(&oaiResp); err != nil {
		http.Error(w, "Failed to decode OpenAI response", http.StatusInternalServerError)
		return
	}

	anthroResp := translateFromResponses(oaiResp)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(anthroResp)
}

func translateToResponses(req AnthropicRequest) OpenAIResponseRequest {
	targetModel := os.Getenv("TARGET_MODEL")
	if targetModel == "" {
		targetModel = "gpt-4o"
	}

	oaiReq := OpenAIResponseRequest{
		Model:  targetModel,
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
					Role: msg.Role,
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

	return oaiReq
}

func translateToChatCompletions(req AnthropicRequest) OpenAIRequest {
	targetModel := os.Getenv("TARGET_MODEL")
	if targetModel == "" {
		targetModel = "gpt-4o"
	}

	oaiReq := OpenAIRequest{
		Model:  targetModel,
		Stream: req.Stream,
	}

	if req.System != "" {
		oaiReq.Messages = append(oaiReq.Messages, OpenAIMessage{
			Role:    "system",
			Content: req.System,
		})
	}

	for _, msg := range req.Messages {
		oaiMsg := OpenAIMessage{
			Role: msg.Role,
		}

		var textParts []string
		for _, block := range msg.Content {
			switch block.Type {
			case "text":
				textParts = append(textParts, block.Text)
			case "tool_use":
				oaiMsg.ToolCalls = append(oaiMsg.ToolCalls, OpenAIToolCall{
					ID:   block.ToolUse.ID,
					Type: "function",
					Function: OpenAICallFunc{
						Name:      block.ToolUse.Name,
						Arguments: "{}", 
					},
				})
			case "tool_result":
				oaiMsg.Role = "tool"
				oaiMsg.ToolCallID = block.ToolRes.ToolUseID
				oaiMsg.Content = block.Content
			}
		}
		
		if oaiMsg.Role != "tool" {
			oaiMsg.Content = strings.Join(textParts, "\n")
		}
		
		oaiReq.Messages = append(oaiReq.Messages, oaiMsg)
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

	return oaiReq
}

func translateFromResponses(oaiResp OpenAIResponseObject) any {
	// Map back to Anthropic Messages response format
	resp := map[string]any{
		"id":    oaiResp.ID,
		"type":  "message",
		"role":  "assistant",
		"model": "claude-3-5-sonnet", // Identity theft for compatibility
		"content": []any{},
		"usage": map[string]any{
			"input_tokens":  oaiResp.Usage.InputTokens,
			"output_tokens": oaiResp.Usage.OutputTokens,
		},
	}

	content := []any{}
	for _, item := range oaiResp.Output {
		if item.Type == "message" {
			for _, part := range item.Content {
				content = append(content, map[string]any{
					"type": "text",
					"text": part.Text,
				})
			}
		} else if item.Type == "function_call" {
			var input map[string]any
			json.Unmarshal([]byte(item.Arguments), &input)
			content = append(content, map[string]any{
				"type": "tool_use",
				"id":   item.CallID,
				"name": item.Name,
				"input": input,
			})
		}
	}
	resp["content"] = content
	return resp
}
