package llm

import (
	"context"
	"io"
)

// Role represents the role of a message author.
type Role string

const (
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
	RoleSystem    Role = "system"
)

// ContentBlock represents a single block of content in a message.
type ContentBlock struct {
	Type     string    `json:"type"`
	Text     string    `json:"text,omitempty"`
	ToolUse  *ToolUse  `json:"tool_use,omitempty"`
	ToolRes  *ToolRes  `json:"tool_result,omitempty"`
}

// ToolUse represents a tool use block.
type ToolUse struct {
	ID    string         `json:"id"`
	Name  string         `json:"name"`
	Input map[string]any `json:"input"`
}

// ToolRes represents a tool result block.
type ToolRes struct {
	ToolUseID string `json:"tool_use_id"`
	Content   string `json:"content"`
	IsError   bool   `json:"is_error,omitempty"`
}

// Message represents a single message in a conversation.
type Message struct {
	Role    Role           `json:"role"`
	Content []ContentBlock `json:"content"`
}

// Tool represents a tool definition.
type Tool struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	InputSchema map[string]any `json:"input_schema"`
}

// MessageRequest represents a request to the Messages API.
type MessageRequest struct {
	Model      string    `json:"model"`
	Messages   []Message `json:"messages"`
	System     string    `json:"system,omitempty"`
	MaxTokens  int       `json:"max_tokens"`
	Tools      []Tool    `json:"tools,omitempty"`
	ToolChoice any       `json:"tool_choice,omitempty"`
	Stream     bool      `json:"stream,omitempty"`
}

// MessageResponse represents a response from the Messages API.
type MessageResponse struct {
	ID           string         `json:"id"`
	Type         string         `json:"type"`
	Role         Role           `json:"role"`
	Content      []ContentBlock `json:"content"`
	Model        string         `json:"model"`
	StopReason   string         `json:"stop_reason"`
	StopSequence string         `json:"stop_sequence"`
	Usage        Usage          `json:"usage"`
}

// Usage represents token usage information.
type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

// Delta represents a chunk of content in a streaming response.
type Delta struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
}

// StreamEvent represents an event in a streaming response.
type StreamEvent struct {
	Type         string        `json:"type"`
	Message      *Message      `json:"message,omitempty"`
	Index        int           `json:"index,omitempty"`
	ContentBlock *ContentBlock `json:"content_block,omitempty"`
	Delta        *Delta        `json:"delta,omitempty"`
	Usage        *Usage        `json:"usage,omitempty"`
}

// Provider defines the interface for an LLM provider.
type Provider interface {
	CreateMessage(ctx context.Context, req MessageRequest) (*MessageResponse, error)
	StreamMessage(ctx context.Context, req MessageRequest) (<-chan StreamEvent, <-chan error)
}
