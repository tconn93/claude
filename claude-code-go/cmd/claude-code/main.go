package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/spf13/cobra"
	"github.com/tyler/claude-code-go/internal/agent"
	"github.com/tyler/claude-code-go/internal/llm"
	"github.com/tyler/claude-code-go/internal/proxy"
	"github.com/tyler/claude-code-go/internal/server"
	"github.com/tyler/claude-code-go/internal/tools"
	"github.com/tyler/claude-code-go/internal/ui"
)

func main() {
	var serve bool
	var providerName string
	var modelName string

	var rootCmd = &cobra.Command{
		Use:   "claude-code",
		Short: "Claude Code CLI (Go port)",
		Run: func(cmd *cobra.Command, args []string) {
			cfg, _ := config.Load("config.yaml")
			if providerName == "" {
				providerName = cfg.DefaultProvider
			}

			if serve {
				runServer(providerName, modelName, cfg)
			} else {
				runCLI(providerName, modelName, cfg)
			}
		},
	}

	rootCmd.Flags().BoolVarP(&serve, "serve", "s", false, "Start the web backend server")
	rootCmd.Flags().StringVarP(&providerName, "provider", "p", "", "LLM provider to use (anthropic, openai, gemini)")
	rootCmd.Flags().StringVarP(&modelName, "model", "m", "", "Model name to use")

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func getProvider(name, model string, cfg *config.Config) llm.Provider {
	pCfg, ok := cfg.Providers[name]
	if !ok {
		// Fallback to env if not in config
		if name == "anthropic" || name == "" {
			key := os.Getenv("ANTHROPIC_API_KEY")
			if model == "" {
				model = "claude-3-5-sonnet-20241022"
			}
			return llm.NewAnthropicProvider(key, "", model)
		}
		log.Fatalf("Provider %s not configured in config.yaml and no env fallback", name)
	}

	if model == "" {
		model = pCfg.Model
	}

	switch pCfg.Type {
	case "anthropic":
		return llm.NewAnthropicProvider(pCfg.APIKey, pCfg.BaseURL, model)
	case "openai":
		return proxy.NewProxiedProvider(&proxy.OpenAITranslator{}, pCfg.BaseURL, pCfg.APIKey, model)
	case "openai-responses":
		baseURL := pCfg.BaseURL
		if baseURL == "" {
			baseURL = "https://api.openai.com/v1/responses"
		}
		return proxy.NewProxiedProvider(&proxy.OpenAIResponsesTranslator{}, baseURL, pCfg.APIKey, model)
	default:
		log.Fatalf("Unsupported provider type: %s", pCfg.Type)
		return nil
	}
}

func runServer(providerName, modelName string, cfg *config.Config) {
	provider := getProvider(providerName, modelName, cfg)

	registry := tools.NewRegistry()
	registry.Register(&tools.BashTool{})
	registry.Register(&tools.FileReadTool{})
	registry.Register(&tools.FileWriteTool{})
	registry.Register(&tools.GrepTool{})

	a := agent.NewAgent(provider, registry, "You are Claude Code, an agentic coding assistant.")
	
	s := server.NewServer(a)
	if err := s.Start(":8080"); err != nil {
		log.Fatal(err)
	}
}

func runCLI(providerName, modelName string, cfg *config.Config) {
	provider := getProvider(providerName, modelName, cfg)

	registry := tools.NewRegistry()
	registry.Register(&tools.BashTool{})
	registry.Register(&tools.FileReadTool{})
	registry.Register(&tools.FileWriteTool{})
	registry.Register(&tools.GrepTool{})

	a := agent.NewAgent(provider, registry, "You are Claude Code, an agentic coding assistant.")

	if err := ui.RunTUI(a); err != nil {
		log.Fatal(err)
	}
}
