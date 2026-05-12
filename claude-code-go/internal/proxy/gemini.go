package proxy

import (
	"fmt"
	"github.com/tyler/claude-code-go/internal/llm"
)

type GeminiTranslator struct{}

func (t *GeminiTranslator) TranslateRequest(req llm.MessageRequest) (any, error) {
	// Gemini translation logic
	return nil, nil
}

func (t *GeminiTranslator) TranslateResponse(resp any) (*llm.MessageResponse, error) {
	return nil, fmt.Errorf("not implemented")
}

func (t *GeminiTranslator) TranslateStreamEvent(event any) (*llm.StreamEvent, error) {
	return nil, fmt.Errorf("not implemented")
}
