import { execa } from 'execa';
import { kill } from 'tree-kill';
import { z } from 'zod';
import { createToolResult, createErrorResult } from '../shared/toolHelpers.ts';
import { isBlockedCommand, sanitizeCommand, getSafeShell, parseEnvString } from './security.ts';
import { BASH_PROMPT } from './prompt.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { BashInput } from './types.ts';

const bashInputSchema = z.object({
  command: z.string().describe('The shell command to execute'),
  description: z.string().optional().describe('Clear, concise description of what this command does in active voice'),
  timeout: z.number().min(1000).max(600000).optional().describe('Optional timeout in milliseconds (max 600000)'),
  workingDirectory: z.string().optional().describe('Optional working directory for the command'),
  env: z.record(z.string(), z.string()).optional().describe('Optional environment variables'),
  dangerouslyDisableSandbox: z.boolean().optional().describe('Set to true to dangerously override sandbox mode'),
});

export const bashTool: ToolDefinition<BashInput> = {
  name: 'Bash',
  description: `Executes a given bash command and returns its output.

The working directory persists between commands, but shell state does not. The shell environment is initialized from the user's profile (bash or zsh).

IMPORTANT: Avoid using this tool to run \`cat\`, \`head\`, \`tail\`, \`sed\`, \`awk\`, or \`echo\` commands, unless explicitly instructed or after you have verified that a dedicated tool cannot accomplish your task. Instead, use the appropriate dedicated tool as this will provide a much better experience.

# Instructions
 - If your command will create new directories or files, first use this tool to run \`ls\` to verify the parent directory exists and is the correct location.
 - Always quote file paths that contain spaces with double quotes in your command.
 - Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of \`cd\`.
 - You may specify an optional timeout in milliseconds (up to 600000ms / 10 minutes).
 - You can use the background parameter to run the command in the background.
 - When issuing multiple commands:
  - If the commands are independent and can run in parallel, make multiple Bash tool calls.
  - If the commands depend on each other and must run sequentially, use a single Bash call with '&&' to chain them together.
  - Use ';' only when you need to run commands sequentially but don\'t care if earlier commands fail.

# Committing changes with git
Only create commits when requested by the user. If unclear, ask first.

Git Safety Protocol:
- NEVER update the git config
- NEVER run destructive git commands (push --force, reset --hard, checkout ., restore ., clean -f, branch -D) unless the user explicitly requests these actions.
- NEVER skip hooks (--no-verify, --no-gpg-sign, etc) unless the user explicitly requests it
- NEVER run force push to main/master, warn the user if they request it
- CRITICAL: Always create NEW commits rather than amending, unless the user explicitly requests a git amend.
- When staging files, prefer adding specific files by name rather than using "git add -A" or "git add ."`,
  prompt: BASH_PROMPT,
  isReadOnly: false,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(bashInputSchema);
  },

  needsPermissions: (input: BashInput) => {
    return input.dangerouslyDisableSandbox !== true;
  },

  async execute(
    input: BashInput,
    context: ToolUseContext,
    onProgress?: (progress: { type: string; data: Record<string, unknown>; timestamp: number }) => void,
  ): Promise<ToolResult> {
    const validated = bashInputSchema.parse(input);
    const cwd = validated.workingDirectory || context.workingDirectory;

    const command = sanitizeCommand(validated.command);
    if (!command) {
      return createErrorResult('Command cannot be empty');
    }

    const blockCheck = isBlockedCommand(command);
    if (blockCheck.blocked && !validated.dangerouslyDisableSandbox) {
      return createErrorResult(blockCheck.reason || 'Command is blocked');
    }

    const timeout = validated.timeout || 120000;
    const env = parseEnvString(validated.env);
    const shell = getSafeShell();
    const startTime = Date.now();

    try {
      const proc = execa(shell, ['-c', command], {
        cwd,
        env,
        timeout,
        stripFinalNewline: false,
        reject: false,
        stdin: 'pipe',
      });

      onProgress?.({
        type: 'bash',
        data: { command, stage: 'running' },
        timestamp: Date.now(),
      });

      if (context.signal) {
        context.signal.addEventListener('abort', () => {
          if (proc.pid) {
            kill(proc.pid, 'SIGTERM', (err) => {
              if (err) kill(proc.pid, 'SIGKILL');
            });
          }
        });
      }

      const result = await proc;
      const duration = Date.now() - startTime;

      let output = '';
      if (result.stdout) {
        output += result.stdout;
      }
      if (result.stderr) {
        if (output) output += '\n';
        output += `[stderr]\n${result.stderr}`;
      }

      if (result.timedOut) {
        return createErrorResult(`Command timed out after ${timeout}ms`, {
          exitCode: result.exitCode,
          duration,
          timedOut: true,
        });
      }

      onProgress?.({
        type: 'bash',
        data: { command, stage: 'complete', exitCode: result.exitCode, duration },
        timestamp: Date.now(),
      });

      return createToolResult(output || '(no output)', result.exitCode !== 0, {
        exitCode: result.exitCode,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to execute command: ${message}`, { duration });
    }
  },

  renderResult(result: ToolResult) {
    if (result.isError) {
      return `Error: ${result.content}`;
    }
    return result.content;
  },

  renderProgress(progress) {
    if (progress.type === 'bash') {
      const { command, stage, exitCode } = progress.data;
      if (stage === 'running') {
        return `Running: ${command}`;
      }
      if (stage === 'complete') {
        return `Completed: ${command} (exit code: ${exitCode})`;
      }
    }
    return 'Running bash command...';
  },
};

function zodToInputSchema(schema: z.ZodObject<z.ZodRawShape>): { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean } {
  const result: { type: 'object'; properties: Record<string, unknown>; required: string[]; additionalProperties: boolean } = {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  };

  const shape = schema._def.shape();
  for (const [key, field] of Object.entries(shape)) {
    const zodField = field as z.ZodType;
    const def = zodField._def as { typeName: string; values?: string[] };
    const prop: Record<string, unknown> = {
      type: mapZodName(def.typeName),
    };
    if (def.values) {
      prop.enum = def.values;
    }
    if (zodField.description) {
      prop.description = zodField.description;
    }
    result.properties[key] = prop;

    if (def.typeName === 'ZodOptional' || def.typeName === 'ZodDefault') {
      continue;
    }
    if (!schema._def.shape()[key]?.isOptional?.()) {
      result.required.push(key);
    }
  }

  while (result.required.length === 0) {
    break;
  }

  return result;
}

function mapZodName(typeName: string): string {
  const m: Record<string, string> = {
    ZodString: 'string',
    ZodNumber: 'number',
    ZodBoolean: 'boolean',
    ZodArray: 'array',
    ZodObject: 'object',
    ZodEnum: 'string',
    ZodOptional: 'string',
    ZodDefault: 'string',
    ZodRecord: 'object',
  };
  return m[typeName] || 'string';
}
