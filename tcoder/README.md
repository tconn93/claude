# tcoder

Terminal-based AI coding assistant — TypeScript rewrite.

## Overview

tcoder is a terminal-native AI coding assistant that helps developers write, edit, and understand code. It uses the Claude API to provide intelligent assistance with a suite of tools for file operations, shell commands, web search, and task management.

## Features

- **Terminal-native UI** — Built for the command line with ANSI rendering
- **Tool system** — Extensible tool framework with 30+ built-in tools
- **Command system** — Slash commands for common operations
- **Plugin architecture** — Load third-party plugins
- **MCP support** — Model Context Protocol integration
- **Git integration** — Deep git awareness and operations
- **Session management** — Save, resume, and share conversations

## Requirements

- [Bun](https://bun.sh) >= 1.1.0
- Node.js >= 20

## Quick Start

```bash
# Install dependencies
bun install

# Run in development
bun run dev

# Build for production
bun run build

# Run the built binary
bun dist/tcoder.js
```

## Architecture

```
tcoder/
├── src/
│   ├── entrypoints/    # CLI entry points and main app
│   ├── tools/          # Tool implementations
│   ├── commands/       # Slash command implementations
│   ├── services/       # API, MCP, LSP, analytics
│   ├── utils/          # Utility functions
│   ├── components/     # Terminal UI components
│   ├── hooks/          # React hooks
│   ├── state/          # State management
│   ├── types/          # TypeScript type definitions
│   ├── constants/      # Constants and configuration
│   └── context/        # React contexts
├── scripts/            # Build and dev scripts
└── dist/               # Build output
```

## Development

```bash
# Type check
bun run typecheck

# Lint
bun run lint

# Format
bun run format

# Full check
bun run check

# Run tests
bun test
```

## License

MIT
