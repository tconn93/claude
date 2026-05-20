import type { Message, AssistantMessage, TextBlock as AppTextBlock, ThinkingBlock } from '../../types/message.ts';
import type { ToolDefinition, ToolInputSchema } from '../../types/tool.ts';
import { DEFAULT_MODEL, DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } from '../../constants/common.ts';

export interface XAIClientConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

export interface XAIMessageResult {
  content: (AppTextBlock | ThinkingBlock)[];
  usage: { inputTokens: number; outputTokens: number };
  stopReason: string;
  model: string;
  id: string;
}

export interface XAIStreamCallbacks {
  onText?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onToolUse?: (toolUse: { id: string; name: string; input: Record<string, unknown> }) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: XAIMessageResult) => void;
}

function toolToXAIFormat(tool: ToolDefinition): Record<string, unknown> {
  return {
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  };
}

export class XAIClient {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private abortController: AbortController | null = null;

  constructor(config: XAIClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.x.ai/v1';
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL;
  }

  async createMessage(
    messages: Record<string, unknown>[],
    options?: {
      model?: string;
      instructions?: string;
      tools?: ToolDefinition[];
      maxTokens?: number;
      temperature?: number;
      signal?: AbortSignal;
    },
  ): Promise<XAIMessageResult> {
    const model = options?.model ?? this.defaultModel;
    const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
    const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;

    const body: Record<string, unknown> = {
      model,
      max_output_tokens: maxTokens,
      temperature,
      input: messages,
    };

    if (options?.instructions) {
      body.instructions = options.instructions;
    }

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools.map(toolToXAIFormat);
      body.tool_choice = 'auto';
    }

    try {
      const response = await fetch(`${this.baseUrl}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: options?.signal ?? this.createSignal(),
      });

      if (!response.ok) {
        throw await this.handleHttpError(response);
      }

      const data = await response.json() as Record<string, unknown>;
      return this.parseResponse(data, model);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createStream(
    messages: Record<string, unknown>[],
    callbacks: XAIStreamCallbacks,
    options?: {
      model?: string;
      instructions?: string;
      tools?: ToolDefinition[];
      maxTokens?: number;
      temperature?: number;
    },
  ): Promise<XAIMessageResult> {
    const model = options?.model ?? this.defaultModel;
    const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
    const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;

    const body: Record<string, unknown> = {
      model,
      max_output_tokens: maxTokens,
      temperature,
      input: messages,
      stream: true,
    };

    if (options?.instructions) {
      body.instructions = options.instructions;
    }

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools.map(toolToXAIFormat);
      body.tool_choice = 'auto';
    }

    try {
      const response = await fetch(`${this.baseUrl}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: this.createSignal(),
      });

      if (!response.ok) {
        throw await this.handleHttpError(response);
      }

      return this.processStream(response, model, callbacks);
    } catch (error) {
      const apiError = this.handleError(error);
      callbacks.onError?.(apiError);
      throw apiError;
    }
  }

  private async processStream(
    response: Response,
    model: string,
    callbacks: XAIStreamCallbacks,
  ): Promise<XAIMessageResult> {
    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedContent = '';
    let accumulatedThinking = '';
    let responseId = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let stopReason = 'end_turn';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data) as Record<string, unknown>;
            const eventType = event.type as string;

            if (eventType === 'response.output_text.delta') {
              accumulatedContent += (event.delta as string) ?? '';
              callbacks.onText?.(event.delta as string);
            } else if (eventType === 'response.reasoning_text.delta') {
              accumulatedThinking += (event.delta as string) ?? '';
              callbacks.onThinking?.(event.delta as string);
            } else if (eventType === 'response.created') {
              const resp = event.response as Record<string, unknown>;
              responseId = resp?.id as string ?? '';
            } else if (eventType === 'response.completed') {
              const resp = event.response as Record<string, unknown>;
              responseId = resp?.id as string ?? '';
              const usage = resp?.usage as Record<string, number> | undefined;
              inputTokens = usage?.input_tokens ?? 0;
              outputTokens = usage?.output_tokens ?? 0;
            } else if (eventType === 'response.output_item.added') {
              const item = event.item as Record<string, unknown> | undefined;
              if (item?.type === 'function_call') {
                callbacks.onToolUse?.({
                  id: (item.call_id as string) ?? '',
                  name: item.name as string ?? '',
                  input: typeof item.arguments === 'string'
                    ? (() => { try { return JSON.parse(item.arguments as string); } catch { return {}; } })()
                    : (item.arguments as Record<string, unknown>) ?? {},
                });
              }
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    const content: (AppTextBlock | ThinkingBlock)[] = [];
    if (accumulatedContent) {
      content.push({ type: 'text', text: accumulatedContent });
    }
    if (accumulatedThinking) {
      content.push({ type: 'thinking', thinking: accumulatedThinking });
    }

    const result: XAIMessageResult = {
      content,
      usage: { inputTokens, outputTokens },
      stopReason,
      model,
      id: responseId,
    };

    callbacks.onComplete?.(result);
    return result;
  }

  private parseResponse(data: Record<string, unknown>, model: string): XAIMessageResult {
    const output = (data.output as unknown[]) ?? [];
    const content: (AppTextBlock | ThinkingBlock)[] = [];

    for (const item of output) {
      const o = item as Record<string, unknown>;
      if (o.type === 'message' || o.type === 'text') {
        const c = o.content;
        if (typeof c === 'string') {
          content.push({ type: 'text', text: c });
        } else if (Array.isArray(c)) {
          for (const part of c) {
            const p = part as Record<string, unknown>;
            if (p.type === 'text' || p.type === 'output_text') {
              content.push({ type: 'text', text: (p.text as string) ?? '' });
            }
          }
        }
      } else if (o.type === 'reasoning' || o.type === 'thinking') {
        content.push({
          type: 'thinking',
          thinking: (o.content as string) ?? (o.summary as string) ?? '',
        });
      }
    }

    const usage = data.usage as Record<string, number> | undefined;

    return {
      content,
      usage: {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
      },
      stopReason: (data.stop_reason as string) ?? 'end_turn',
      model: (data.model as string) ?? model,
      id: (data.id as string) ?? '',
    };
  }

  private createSignal(): AbortSignal | undefined {
    this.abortController = new AbortController();
    return this.abortController.signal;
  }

  private async handleHttpError(response: Response): Promise<Error> {
    const body = await response.text().catch(() => '');
    return new Error(`XAI HTTP ${response.status}: ${body}`);
  }

  private handleError(error: unknown): Error {
    if (error instanceof Error) return error;
    return new Error(String(error));
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }
}
