export const FILE_WRITE_PROMPT = `# File Writing Guidelines
- Use file_path with absolute paths
- Content is written exactly as provided
- Directories are created automatically if they don't exist
- Existing files are overwritten without confirmation
- Use FileEditTool for partial modifications instead of rewriting entire files
- Always read a file before overwriting it
- Do not write documentation files (*.md) or README files unless explicitly requested
- Only write new files when creating them is necessary; prefer editing existing files`;
