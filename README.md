# Claude Code Go

A high-performance, production-ready port of Anthropic's Claude Code CLI, rewritten in idiomatic Go 1.24+.

## Features

- **Blazing Fast:** Written in Go for superior startup time and low memory footprint.
- **Intelligent Proxy:** Native support for Anthropic Messages API, with an internal translation proxy for OpenAI, Gemini, and more.
- **Rich UI:** Includes both a beautiful Terminal UI (using Bubbletea) and a modern Web UI (Next.js 15 + Vercel AI SDK).
- **Tool System:** Fully extensible tool registry with safe sandboxing (Bash, File Operations, Grep, etc.).
- **Multi-Agent Support:** Core loop designed for parallel tool execution and agent coordination.

## Getting Started

### Prerequisites

- Go 1.24+
- Node.js 18+ (for frontend)
- Anthropic API Key (set as `ANTHROPIC_API_KEY` environment variable)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tconn93/claude
   cd claude
   ```

2. Initialize dependencies:
   ```bash
   go mod download
   cd frontend && npm install
   ```

### Running

#### CLI Mode (TUI)
```bash
make run-cli
```

#### Web Mode
Starts both the Go backend and the Next.js frontend:
```bash
make run
```

## Architecture

The project is structured to be modular and extensible:

- `internal/agent`: Core agent logic and loop.
- `internal/llm`: Provider abstractions and native Anthropic support.
- `internal/proxy`: The translation proxy for multi-provider support.
- `internal/tools`: Reimplemented tools from the original Claude Code.
- `internal/ui`: Bubbletea-based terminal interface.
- `internal/server`: Go backend for the web frontend.
- `frontend`: Next.js 15 application using Vercel AI SDK.

## How the Proxy Works

The core agent always communicates using the **Anthropic Messages API** format. When a non-Anthropic provider is used (e.g., OpenAI), the `internal/proxy` transparently translates:

1. **Requests:** Anthropic messages and tools are mapped to the target provider's schema.
2. **Streaming:** Provider-specific SSE events are mapped back to Anthropic's `content_block_delta` format.
3. **Tool Calls:** Function calling results are mapped back to Anthropic's `tool_result` blocks.

This allows the agent's logic to remain provider-agnostic while supporting any LLM.

## License

MIT
