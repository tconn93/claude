package config

import (
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	DefaultProvider string              `yaml:"default_provider"`
	Providers       map[string]Provider `yaml:"providers"`
}

type Provider struct {
	Type    string `yaml:"type"` // anthropic, openai, gemini, etc.
	APIKey  string `yaml:"api_key"`
	BaseURL string `yaml:"base_url,omitempty"`
	Model   string `yaml:"model"`
}

func Load(path string) (*Config, error) {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return &Config{
				DefaultProvider: "anthropic",
				Providers:       make(map[string]Provider),
			}, nil
		}
		return nil, err
	}
	defer f.Close()

	var cfg Config
	if err := yaml.NewDecoder(f).Decode(&cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}
