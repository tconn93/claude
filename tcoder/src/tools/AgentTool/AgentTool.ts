import { z } from 'zod';
import { createToolResult, createErrorResult } from '../shared/toolHelpers.ts';
import { AGENT_PROMPT } from './prompt.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { AgentInput, AgentType } from './types.ts';

const agentInputSchema = z.object({
  type: z.enum(['explore', 'executor', 'architect', 'planner', 'reviewer', 'general']).describe('Type of sub-agent to spawn'),
  task: z.string().describe('The task for the sub-agent to perform'),
  model: z.string().optional().describe('Model to use for the sub-agent'),
  maxTurns: z.number().min(1).max(50).optional().describe('Maximum number of turns for the sub-agent'),
  contextFiles: z.array(z.string()).optional().describe('Files to include in the sub-agent context'),
  workingDirectory: z.string().optional().describe('Working directory for the sub-agent'),
});

const AGENT_DESCRIPTIONS: Record<AgentType, string> = {
  explore: 'Codebase exploration agent - searches, reads files, discovers patterns',
  executor: 'Implementation agent - writes and edits code, runs tests',
  architect: 'Architecture agent - designs systems, makes architectural decisions',
  planner: 'Planning agent - creates implementation plans and task breakdowns',
  reviewer: 'Code review agent - reviews changes for quality, security, and correctness',
  general: 'General purpose agent - can handle any task type',
};

export const agentTool: ToolDefinition<AgentInput> = {
  name: 'Task',
  description: `Spawn a sub-agent to handle a specific task. Sub-agents have their own context and tools.

Available agent types:
- explore: Codebase exploration and pattern discovery
- executor: Code implementation and testing
- architect: System design and architecture decisions
- planner: Task planning and decomposition
- reviewer: Code review and quality assessment
- general: Any task type

Usage:
- Use sub-agents for complex, multi-step tasks
- Agents can be spawned in parallel for independent tasks
- Provide clear, specific task descriptions
- Use maxTurns to limit iteration count`,
  prompt: AGENT_PROMPT,
  isReadOnly: false,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(agentInputSchema);
  },

  needsPermissions: () => true,

  async execute(
    input: AgentInput,
    context: ToolUseContext,
    onProgress?: (progress: { type: string; data: Record<string, unknown>; timestamp: number }) => void,
  ): Promise<ToolResult> {
    const validated = agentInputSchema.parse(input);

    onProgress?.({
      type: 'agent',
      data: { agentName: validated.type, task: validated.task, stage: 'starting' },
      timestamp: Date.now(),
    });

    const agentDesc = AGENT_DESCRIPTIONS[validated.type];

    const result = [
      `# Sub-Agent: ${validated.type}`,
      `## Type: ${agentDesc}`,
      `## Task`,
      validated.task,
    ];

    if (validated.contextFiles && validated.contextFiles.length > 0) {
      result.push(`## Context Files\n${validated.contextFiles.join('\n')}`);
    }

    if (validated.maxTurns) {
      result.push(`## Max Turns: ${validated.maxTurns}`);
    }

    result.push(`\n---\n*Note: Sub-agent execution is simulated. In production, this would spawn a real agent process with isolated context.*`);

    onProgress?.({
      type: 'agent',
      data: { agentName: validated.type, task: validated.task, stage: 'complete' },
      timestamp: Date.now(),
    });

    return createToolResult(result.join('\n\n'), false, {
      agentType: validated.type,
      task: validated.task,
      maxTurns: validated.maxTurns,
      simulated: true,
    });
  },

  renderResult(result: ToolResult) {
    if (result.isError) return `Error: ${result.content}`;
    return result.content;
  },

  renderProgress(progress) {
    if (progress.type === 'agent') {
      const { agentName, stage } = progress.data;
      if (stage === 'starting') return `Starting ${agentName} agent...`;
      if (stage === 'thinking') return `${agentName} agent is thinking...`;
      if (stage === 'complete') return `${agentName} agent completed`;
    }
    return 'Running sub-agent...';
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
