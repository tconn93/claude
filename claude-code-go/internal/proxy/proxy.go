package proxy

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/tyler/claude-code-go/internal/llm"
)

// ProviderTranslator defines how to translate between Anthropic and a target provider.
type ProviderTranslator interface {
	TranslateRequest(req llm.MessageRequest) (any, error)
	TranslateResponse(resp any) (*llm.MessageResponse, error)
	TranslateStreamEvent(event any) (*llm.StreamEvent, error)
}

// ProxiedProvider wraps a generic LLM client with a translator.
type ProxiedProvider struct {
	Translator ProviderTranslator
	Endpoint   string
	APIKey     string
	Model      string
	Client     *http.Client
}

func NewProxiedProvider(translator ProviderTranslator, endpoint, apiKey, model string) *ProxiedProvider {
	return &ProxiedProvider{
		Translator: translator,
		Endpoint:   endpoint,
		APIKey:     apiKey,
		Model:      model,
		Client:     &http.Client{},
	}
}

func (p *ProxiedProvider) CreateMessage(ctx context.Context, req llm.MessageRequest) (*llm.MessageResponse, error) {
	if req.Model == "" {
		req.Model = p.Model
	}

	translatedReq, err := p.Translator.TranslateRequest(req)
	if err != nil {
		return nil, err
	}

	body, err := json.Marshal(translatedReq)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", p.Endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Authorization", "Bearer "+p.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.Client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errData map[string]any
		json.NewDecoder(resp.Body).Decode(&errData)
		return nil, fmt.Errorf("provider api error (status %d): %v", resp.StatusCode, errData)
	}

	// Use a generic map for decoding to allow the translator to handle the specific type
	var rawResp map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&rawResp); err != nil {
		return nil, err
	}

	return p.Translator.TranslateResponse(rawResp)
}

func (p *ProxiedProvider) StreamMessage(ctx context.Context, req llm.MessageRequest) (<-chan llm.StreamEvent, <-chan error) {
	events := make(chan llm.StreamEvent)
	errs := make(chan error, 1)

	req.Stream = true
	if req.Model == "" {
		req.Model = p.Model
	}

	go func() {
		defer close(events)
		defer close(errs)

		translatedReq, err := p.Translator.TranslateRequest(req)
		if err != nil {
			errs <- err
			return
		}

		body, err := json.Marshal(translatedReq)
		if err != nil {
			errs <- err
			return
		}

		httpReq, err := http.NewRequestWithContext(ctx, "POST", p.Endpoint, bytes.NewReader(body))
		if err != nil {
			errs <- err
			return
		}

		httpReq.Header.Set("Authorization", "Bearer "+p.APIKey)
		httpReq.Header.Set("Content-Type", "application/json")

		resp, err := p.Client.Do(httpReq)
		if err != nil {
			errs <- err
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			errs <- fmt.Errorf("provider api error (status %d)", resp.StatusCode)
			return
		}

		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(line, "data: ") {
				continue
			}
			data := strings.TrimPrefix(line, "data: ")
			if data == "[DONE]" {
				break
			}

			// Same issue as CreateMessage, need to know the type
			var chunk OpenAIStreamChunk
			if err := json.Unmarshal([]byte(data), &chunk); err != nil {
				continue
			}

			ev, err := p.Translator.TranslateStreamEvent(&chunk)
			if err != nil {
				continue
			}
			if ev != nil {
				events <- *ev
			}
		}

		if err := scanner.Err(); err != nil {
			errs <- err
		}
	}()

	return events, errs
}
