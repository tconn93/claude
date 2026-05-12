package agent

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/tyler/claude-code-go/internal/llm"
	"github.com/tyler/claude-code-go/internal/tools"
)

type Agent struct {
	Provider llm.Provider
	Registry *tools.Registry
	History  []llm.Message
	System   string
	Logger   *slog.Logger
}

func NewAgent(provider llm.Provider, registry *tools.Registry, system string) *Agent {
	return &Agent{
		Provider: provider,
		Registry: registry,
		History:  []llm.Message{},
		System:   system,
		Logger:   slog.Default(),
	}
}

func (a *Agent) Run(ctx context.Context, userInput string) error {
	a.History = append(a.History, llm.Message{
		Role: llm.RoleUser,
		Content: []llm.ContentBlock{
			{Type: "text", Text: userInput},
		},
	})

	for {
		req := llm.MessageRequest{
			Messages: a.History,
			System:   a.System,
			Tools:    a.getTools(),
		}

		a.Logger.Info("calling llm", "history_len", len(a.History))
		resp, err := a.Provider.CreateMessage(ctx, req)
		if err != nil {
			return err
		}

		// Append assistant message to history
		assistantMsg := llm.Message{
			Role:    llm.RoleAssistant,
			Content: resp.Content,
		}
		a.History = append(a.History, assistantMsg)

		var toolResults []llm.ContentBlock
		hasToolCalls := false

		for _, block := range resp.Content {
			if block.Type == "text" {
				fmt.Printf("\nAssistant: %s\n", block.Text)
			} else if block.Type == "tool_use" {
				hasToolCalls = true
				fmt.Printf("\nExecuting Tool: %s with input %v\n", block.ToolUse.Name, block.ToolUse.Input)
				
				tool := a.Registry.Get(block.ToolUse.Name)
				if tool == nil {
					toolResults = append(toolResults, llm.ContentBlock{
						Type: "tool_result",
						ToolRes: &llm.ToolRes{
							ToolUseID: block.ToolUse.ID,
							Content:   fmt.Sprintf("Error: tool %s not found", block.ToolUse.Name),
							IsError:   true,
						},
					})
					continue
				}

				res, err := tool.Execute(ctx, block.ToolUse.Input)
				isError := false
				if err != nil {
					res = err.Error()
					isError = true
				}

				toolResults = append(toolResults, llm.ContentBlock{
					Type: "tool_result",
					ToolRes: &llm.ToolRes{
						ToolUseID: block.ToolUse.ID,
						Content:   res,
						IsError:   isError,
					},
				})
			}
		}

		if !hasToolCalls {
			break
		}

		// Append tool results as a user message
		a.History = append(a.History, llm.Message{
			Role:    llm.RoleUser,
			Content: toolResults,
		})
	}

	return nil
}

func (a *Agent) getTools() []llm.Tool {
	var l []llm.Tool
	for _, t := range a.Registry.List() {
		l = append(l, llm.Tool{
			Name:        t.Name(),
			Description: t.Description(),
			InputSchema: t.InputSchema(),
		})
	}
	return l
}
