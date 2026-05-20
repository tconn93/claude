import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { z } from 'zod';
import { createToolResult, createErrorResult } from '../shared/toolHelpers.ts';
import { CLAUDE_CONFIG_DIR, SKILLS_DIR } from '../../constants/common.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { SkillInput } from './types.ts';

const skillInputSchema = z.object({
  skill: z.string().describe('The name of a skill from the available-skills list. Do not guess names.'),
  args: z.string().optional().describe('Optional arguments for the skill'),
});

interface SkillDefinition {
  name: string;
  description: string;
  source: 'project' | 'user';
  path: string;
}

function discoverSkills(workingDir: string): SkillDefinition[] {
  const skills: SkillDefinition[] = [];

  const projectSkillsDir = join(workingDir, '.omc', SKILLS_DIR);
  if (existsSync(projectSkillsDir)) {
    try {
      const entries = readdirSync(projectSkillsDir);
      for (const entry of entries) {
        const fullPath = join(projectSkillsDir, entry);
        if (statSync(fullPath).isDirectory()) {
          skills.push({
            name: entry,
            description: `Project skill: ${entry}`,
            source: 'project',
            path: fullPath,
          });
        }
      }
    } catch { /* ignore */ }
  }

  const homeDir = process.env.HOME || '/root';
  const globalSkillsDir = join(homeDir, '.omc', SKILLS_DIR);
  if (existsSync(globalSkillsDir)) {
    try {
      const entries = readdirSync(globalSkillsDir);
      for (const entry of entries) {
        const fullPath = join(globalSkillsDir, entry);
        if (statSync(fullPath).isDirectory()) {
          skills.push({
            name: entry,
            description: `Global skill: ${entry}`,
            source: 'user',
            path: fullPath,
          });
        }
      }
    } catch { /* ignore */ }
  }

  return skills;
}

export const skillTool: ToolDefinition<SkillInput> = {
  name: 'Skill',
  description: `Execute a skill within the main conversation.

When users ask you to perform tasks, check if any of the available skills match. Skills provide specialized capabilities and domain knowledge.

When users reference a "slash command" or "/<something>", they are referring to a skill. Use this tool to invoke it.

How to invoke:
- Set 'skill' to the exact name of an available skill (no leading slash). For plugin-namespaced skills use the fully qualified 'plugin:skill' form.
- Set 'args' to pass optional arguments.

Important:
- Available skills are listed in system-reminder messages in the conversation
- Only invoke a skill that appears in that list, or one the user explicitly typed as '/<name>' in their message. Never guess or invent a skill name from training data
- NEVER mention a skill without actually calling this tool
- Do not invoke a skill that is already running`,
  isReadOnly: false,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(skillInputSchema);
  },

  async execute(
    input: SkillInput,
    context: ToolUseContext,
    onProgress?: (progress: { type: string; data: Record<string, unknown>; timestamp: number }) => void,
  ): Promise<ToolResult> {
    const validated = skillInputSchema.parse(input);
    const skills = discoverSkills(context.workingDirectory);

    const matched = skills.find((s) => s.name === validated.skill);

    if (!matched) {
      const available = skills.map((s) => s.name).join(', ') || 'none';
      return createErrorResult(
        `Skill "${validated.skill}" not found. Available skills: ${available}`,
        { available: skills.map((s) => s.name) },
      );
    }

    onProgress?.({
      type: 'skill',
      data: { skillName: validated.skill, stage: 'invoking' },
      timestamp: Date.now(),
    });

    try {
      const result = `Skill invoked: ${validated.skill} (${matched.source})${validated.args ? ` with args: ${validated.args}` : ''}`;

      onProgress?.({
        type: 'skill',
        data: { skillName: validated.skill, stage: 'complete' },
        timestamp: Date.now(),
      });

      return createToolResult(result, false, {
        skill: validated.skill,
        source: matched.source,
        args: validated.args,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Skill invocation failed: ${message}`);
    }
  },

  renderResult(result: ToolResult) {
    if (result.isError) return `Error: ${result.content}`;
    return result.content;
  },

  renderProgress(progress) {
    if (progress.type === 'skill') {
      const { skillName, stage } = progress.data;
      if (stage === 'invoking') return `Invoking skill: ${skillName}`;
      if (stage === 'complete') return `Skill complete: ${skillName}`;
    }
    return 'Running skill...';
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
    const prop: Record<string, unknown> = { type: mapZodName(def.typeName) };
    if (def.values) prop.enum = def.values;
    if (zodField.description) prop.description = zodField.description;
    result.properties[key] = prop;
    const fieldShape = schema._def.shape()[key] as z.ZodType & { isOptional?: () => boolean };
    if (def.typeName === 'ZodOptional' || def.typeName === 'ZodDefault' || fieldShape?.isOptional?.()) continue;
    result.required.push(key);
  }
  return result;
}

function mapZodName(typeName: string): string {
  const m: Record<string, string> = {
    ZodString: 'string', ZodNumber: 'number', ZodBoolean: 'boolean',
    ZodArray: 'array', ZodObject: 'object', ZodEnum: 'string',
    ZodOptional: 'string', ZodDefault: 'string', ZodRecord: 'object',
  };
  return m[typeName] || 'string';
}
