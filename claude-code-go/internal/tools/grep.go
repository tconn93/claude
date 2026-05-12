package tools

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
)

type GrepTool struct{}

func (t *GrepTool) Name() string {
	return "grep"
}

func (t *GrepTool) Description() string {
	return "Search for a pattern in files within a directory."
}

func (t *GrepTool) InputSchema() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"pattern": map[string]any{
				"type":        "string",
				"description": "The regex pattern to search for.",
			},
			"path": map[string]any{
				"type":        "string",
				"description": "The directory to search in.",
			},
		},
		"required": []string{"pattern"},
	}
}

func (t *GrepTool) Execute(ctx context.Context, input map[string]any) (string, error) {
	pattern, ok := input["pattern"].(string)
	if !ok {
		return "", fmt.Errorf("missing pattern")
	}
	path, ok := input["path"].(string)
	if !ok {
		path = "."
	}

	cmd := exec.CommandContext(ctx, "grep", "-r", "-n", "--exclude-dir=.git", pattern, path)
	out, err := cmd.CombinedOutput()
	if err != nil && len(out) == 0 {
		return "", fmt.Errorf("grep failed: %w", err)
	}

	res := string(out)
	if res == "" {
		return "No matches found.", nil
	}

	// Limit output to first 100 matches
	lines := strings.Split(res, "\n")
	if len(lines) > 100 {
		res = strings.Join(lines[:100], "\n") + "\n... (truncated)"
	}

	return res, nil
}
