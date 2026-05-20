# tcoder - Required Permissions

This file lists all commands that require elevated permissions for the tcoder build/development process.

## Setup
- [ ] `bun install` - Install project dependencies
- [ ] `bun run build` - Build the project bundle

## Development
- [ ] `bun run typecheck` - Run TypeScript type checking (`tsc --noEmit`)
- [ ] `bun run lint` - Run biome linter

## Testing
- [ ] `bun test` - Run test suite

## Notes
- All commands are local-only and do not require network access beyond initial `bun install`
- No destructive operations needed
- No sudo required
