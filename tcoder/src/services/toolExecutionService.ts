import type { ToolDefinition, ToolResult, ToolUseContext, ToolProgress } from '../types/tool.ts';
import { MAX_TOOL_CALLS_PER_TURN } from '../constants/common.ts';
import { policyLimits } from './policy/limits.ts';

export interface ToolExecutionRequest {
  tool: ToolDefinition;
  input: Record<string, unknown>;
  context: ToolUseContext;
}

export interface ToolExecutionResponse {
  result: ToolResult;
  toolName: string;
  durationMs: number;
  toolUseId: string;
}

export interface BatchToolExecution {
  requests: ToolExecutionRequest[];
  parallel: boolean;
  abortSignal?: AbortSignal;
}

export interface ToolExecutionError {
  toolName: string;
  toolUseId: string;
  error: string;
  isPermissionError: boolean;
}

export class ToolExecutionService {
  private activeExecutions = new Map<string, AbortController>();
  private turnCallCount = 0;

  async executeTool(request: ToolExecutionRequest): Promise<ToolExecutionResponse> {
    const { tool, input, context } = request;

    // Check policy
    const limitCheck = policyLimits.checkLimit('tool_calls_per_turn', this.turnCallCount + 1);
    if (!limitCheck.allowed) {
      return {
        result: {
          content: `Tool execution blocked: ${limitCheck.reason}`,
          isError: true,
          metadata: { blockedByPolicy: true },
        },
        toolName: tool.name,
        durationMs: 0,
        toolUseId: context.toolUseId,
      };
    }

    // Check permissions
    const canUse = await tool.canUse(context);
    if (!canUse.allowed) {
      return {
        result: {
          content: `Permission denied: ${canUse.reason}`,
          isError: true,
          metadata: { permissionDenied: true },
        },
        toolName: tool.name,
        durationMs: 0,
        toolUseId: context.toolUseId,
      };
    }

    // Check if tool is enabled
    const isEnabled = await tool.isEnabled(context);
    if (!isEnabled) {
      return {
        result: {
          content: `Tool '${tool.name}' is not enabled`,
          isError: true,
        },
        toolName: tool.name,
        durationMs: 0,
        toolUseId: context.toolUseId,
      };
    }

    const startTime = Date.now();

    try {
      const result = await tool.execute(input, context, (progress: ToolProgress) => {
        // Progress can be forwarded to UI layer
      });

      this.turnCallCount++;
      policyLimits.recordToolCall();

      return {
        result,
        toolName: tool.name,
        durationMs: Date.now() - startTime,
        toolUseId: context.toolUseId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        result: {
          content: `Tool execution error: ${errorMessage}`,
          isError: true,
          metadata: { executionError: true, error: errorMessage },
        },
        toolName: tool.name,
        durationMs: Date.now() - startTime,
        toolUseId: context.toolUseId,
      };
    }
  }

  async executeBatch(batch: BatchToolExecution): Promise<{
    responses: ToolExecutionResponse[];
    errors: ToolExecutionError[];
  }> {
    const responses: ToolExecutionResponse[] = [];
    const errors: ToolExecutionError[] = [];

    if (batch.parallel) {
      const results = await Promise.allSettled(
        batch.requests.map(async (req) => {
          try {
            return await this.executeTool(req);
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            throw {
              toolName: req.tool.name,
              toolUseId: req.context.toolUseId,
              error: errMsg,
              isPermissionError: false,
            };
          }
        }),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          responses.push(result.value);
        } else {
          errors.push(result.reason as ToolExecutionError);
        }
      }
    } else {
      for (const req of batch.requests) {
        try {
          const response = await this.executeTool(req);
          responses.push(response);
        } catch (error) {
          errors.push({
            toolName: req.tool.name,
            toolUseId: req.context.toolUseId,
            error: error instanceof Error ? error.message : String(error),
            isPermissionError: false,
          });
        }
      }
    }

    return { responses, errors };
  }

  cancelExecution(toolUseId: string): boolean {
    const controller = this.activeExecutions.get(toolUseId);
    if (controller) {
      controller.abort();
      this.activeExecutions.delete(toolUseId);
      return true;
    }
    return false;
  }

  cancelAllExecutions(): void {
    for (const [, controller] of this.activeExecutions) {
      controller.abort();
    }
    this.activeExecutions.clear();
  }

  resetTurn(): void {
    this.turnCallCount = 0;
  }

  getTurnCallCount(): number {
    return this.turnCallCount;
  }

  getActiveExecutionCount(): number {
    return this.activeExecutions.size;
  }

  isUnderLimit(): boolean {
    return this.turnCallCount < MAX_TOOL_CALLS_PER_TURN;
  }
}

export const toolExecutionService = new ToolExecutionService();
