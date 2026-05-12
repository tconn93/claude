package llm

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

type AnthropicProvider struct {
	APIKey  string
	BaseURL string
	Model   string
	Client  *http.Client
}

func NewAnthropicProvider(apiKey, baseURL, model string) *AnthropicProvider {
	if baseURL == "" {
		baseURL = "https://api.anthropic.com/v1"
	}
	return &AnthropicProvider{
		APIKey:  apiKey,
		BaseURL: baseURL,
		Model:   model,
		Client:  &http.Client{},
	}
}

func (p *AnthropicProvider) CreateMessage(ctx context.Context, req MessageRequest) (*MessageResponse, error) {
	if req.Model == "" {
		req.Model = p.Model
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", p.BaseURL+"/messages", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("x-api-key", p.APIKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")
	httpReq.Header.Set("content-type", "application/json")

	resp, err := p.Client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errResp struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		json.NewDecoder(resp.Body).Decode(&errResp)
		return nil, fmt.Errorf("anthropic api error (status %d): %s", resp.StatusCode, errResp.Error.Message)
	}

	var msgResp MessageResponse
	if err := json.NewDecoder(resp.Body).Decode(&msgResp); err != nil {
		return nil, err
	}

	return &msgResp, nil
}

func (p *AnthropicProvider) StreamMessage(ctx context.Context, req MessageRequest) (<-chan StreamEvent, <-chan error) {
	events := make(chan StreamEvent)
	errs := make(chan error, 1)

	req.Stream = true
	if req.Model == "" {
		req.Model = p.Model
	}

	go func() {
		defer close(events)
		defer close(errs)

		body, err := json.Marshal(req)
		if err != nil {
			errs <- err
			return
		}

		httpReq, err := http.NewRequestWithContext(ctx, "POST", p.BaseURL+"/messages", bytes.NewReader(body))
		if err != nil {
			errs <- err
			return
		}

		httpReq.Header.Set("x-api-key", p.APIKey)
		httpReq.Header.Set("anthropic-version", "2023-06-01")
		httpReq.Header.Set("content-type", "application/json")

		resp, err := p.Client.Do(httpReq)
		if err != nil {
			errs <- err
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			var errResp struct {
				Error struct {
					Message string `json:"message"`
				} `json:"error"`
			}
			json.NewDecoder(resp.Body).Decode(&errResp)
			errs <- fmt.Errorf("anthropic api error (status %d): %s", resp.StatusCode, errResp.Error.Message)
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

			var event StreamEvent
			if err := json.Unmarshal([]byte(data), &event); err != nil {
				continue
			}
			events <- event
		}

		if err := scanner.Err(); err != nil {
			errs <- err
		}
	}()

	return events, errs
}
