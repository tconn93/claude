import type { ToolDefinition } from '../types/tool.ts';

export function getIdentityPrompt(): string {
  return `You are tcoder, an interactive AI coding assistant. You help users with software engineering tasks using a set of tools for reading, writing, editing, and searching code, running commands, and managing tasks.

You are powered by Grok, xAI's most capable model family.

# Environment
- Primary working directory: {workingDirectory}
- Platform: {platform}
- Shell: {shell}
- Git branch: {gitBranch}`;
}

export function getToolUseGuidelines(): string {
  return `# Using your tools
- Prefer dedicated tools over Bash when one fits (Read, Edit, Write) — reserve Bash for shell-only operations.
- You can call multiple tools in a single response.
- Make all independent tool calls in parallel when there are no dependencies between them.
- If some tool calls depend on previous calls to inform dependent values, run them sequentially.

# Doing tasks
- The user will primarily request software engineering tasks.
- For exploratory questions respond in 2-3 sentences with a recommendation and main tradeoff.
- Prefer editing existing files to creating new ones.
- Be careful not to introduce security vulnerabilities.
- Do not add features, refactor, or introduce abstractions beyond what the task requires.
- Default to writing no comments. Only add one when the WHY is non-obvious.`;
}

export function getToolPrompt(tool: ToolDefinition): string {
  const lines: string[] = [];
  lines.push(`## ${tool.name}`);
  lines.push(tool.description);
  if (tool.prompt) {
    lines.push(tool.prompt);
  }
  return lines.join('\n');
}

export function getSystemPrompt(
  tools: ToolDefinition[],
  workingDirectory: string,
  platform: string,
  shell: string,
  gitBranch: string,
): string {
  const sections: string[] = [];

  sections.push(
    getIdentityPrompt()
      .replace('{workingDirectory}', workingDirectory)
      .replace('{platform}', platform)
      .replace('{shell}', shell)
      .replace('{gitBranch}', gitBranch || 'none'),
  );

  sections.push(getToolUseGuidelines());

  if (tools.length > 0) {
    sections.push('# Available Tools\n');
    for (const tool of tools) {
      sections.push(getToolPrompt(tool));
    }
  }

  sections.push(`# Session
- Session ID: {sessionId}
- Model: {model}
- Date: {date}`);

  return sections.join('\n\n');
}
