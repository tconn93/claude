# Standalone Anthropic-to-OpenAI Proxy

This is a standalone Go application that translates Anthropic Messages API requests into OpenAI Chat Completions API requests. It allows agents and tools designed for Claude to work with OpenAI models seamlessly.

## Setup

1.  **Set Environment Variables:**
    ```bash
    export OPENAI_API_KEY=your_openai_key
    export PROXY_PORT=8081  # Optional, defaults to 8081
    ```

2.  **Run the Proxy:**
    ```bash
    go run proxy/cmd/proxy/main.go
    ```

## Usage

Configure your agent or tool to use `http://localhost:8081/v1` as its base URL for the Anthropic API.

The proxy currently supports:
- Request translation (roles, system prompts, content blocks).
- Tool/Function calling definition translation.
- Basic response pass-through (mapping results back to Anthropic format is handled by the client or can be extended in `main.go`).

## Features to be added
- [ ] SSE Streaming translation.
- [ ] Full response body re-mapping.
- [ ] Cost tracking.
