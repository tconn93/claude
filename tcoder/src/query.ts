import type { Message, AssistantMessage, TokenUsage, TextBlock, ThinkingBlock } from './types/message.ts';
import type { ToolDefinition, ToolResult } from './types/tool.ts';
import { getSystemPrompt } from './constants/prompts.ts';
import { DEFAULT_MAX_TOKENS, COMPACT_THRESHOLD, MAX_TOOL_CALLS_PER_TURN } from './constants/common.ts';

export interface QueryOptions {
  messages: Message[];
  systemPrompt: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
  signal?: AbortSignal;
  stream?: boolean;
}

export interface QueryResult {
  message: AssistantMessage;
  finishReason: string;
  usage: TokenUsage;
  duration: number;
  toolCalls: ParsedToolCall[];
  responseId: string;
}

export interface ParsedToolCall {
  id: string;
  callId: string;
  name: string;
  input: Record<string, unknown>;
}

export interface StreamEvent {
  type: 'text' | 'thinking' | 'tool_use' | 'error' | 'done' | 'usage';
  text?: string;
  thinking?: string;
  toolCall?: ParsedToolCall;
  error?: string;
  usage?: TokenUsage;
}

const XAI_BASE_URL = 'https://api.x.ai/v1/responses';
const DEFAULT_MODEL = 'grok-4.3';
const DEFAULT_TEMPERATURE = 0.7;
const RETRY_MAX = 3;
const RETRY_BASE_DELAY_MS = 1000;

export { DEFAULT_MODEL };

// -- Message building --

export function buildUserInput(messages: Message[]): string {
  const parts: string[] = [];
  for (const msg of messages) {
    if (msg.type === 'user') {
      if (typeof msg.content === 'string') {
        parts.push(msg.content);
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          const b = block as Record<string, unknown>;
          if (b.type === 'text' && b.text) {
            parts.push(b.text as string);
          } else if (b.type === 'tool_result') {
            parts.push(`[Tool result for ${b.toolUseId}]: ${b.content}`);
          }
        }
      }
    }
  }
  return parts.join('\n');
}

export function parseAssistantResponse(data: Record<string, unknown>): AssistantMessage {
  const output = (data.output as unknown[]) ?? [];
  const parsed: (TextBlock | ThinkingBlock)[] = [];

  for (const item of output) {
    const o = item as Record<string, unknown>;
    if (o.type === 'message') {
      const content = o.content;
      if (typeof content === 'string') {
        parsed.push({ type: 'text', text: content });
      } else if (Array.isArray(content)) {
        for (const part of content) {
          const p = part as Record<string, unknown>;
          if (p.type === 'output_text') {
            parsed.push({ type: 'text', text: (p.text as string) ?? '' });
          }
        }
      }
    } else if (o.type === 'reasoning') {
      const summaries = o.summary as Array<{ text: string }> | undefined;
      if (summaries && summaries.length > 0) {
        parsed.push({ type: 'thinking', thinking: summaries.map(s => s.text).join('\n') });
      }
    }
  }

  return {
    type: 'assistant',
    role: 'assistant',
    content: parsed,
    uuid: generateMessageId(),
    timestamp: Date.now(),
    model: data.model as string,
    usage: extractUsage(data),
    stopReason: (data.status as string) === 'completed' ? 'end_turn' : 'tool_use',
  };
}

export function extractToolCalls(data: Record<string, unknown>): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  const output = (data.output as unknown[]) ?? [];

  for (const item of output) {
    const o = item as Record<string, unknown>;
    if (o.type === 'function_call') {
      calls.push({
        id: (o.id as string) ?? '',
        callId: (o.call_id as string) ?? '',
        name: (o.name as string) ?? '',
        input: typeof o.arguments === 'string'
          ? (() => { try { return JSON.parse(o.arguments as string); } catch { return {}; } })()
          : (o.arguments as Record<string, unknown>) ?? {},
      });
    }
  }

  return calls;
}

export function createToolResultMessage(
  toolUseId: string,
  result: ToolResult,
  parentUuid?: string,
): Message {
  return {
    type: 'user',
    role: 'user',
    content: [
      {
        type: 'tool_result',
        toolUseId,
        content: result.content,
        isError: result.isError,
      },
    ],
    uuid: generateMessageId(),
    parentUuid,
  };
}

export function shouldCompact(messages: Message[]): boolean {
  return messages.length >= COMPACT_THRESHOLD;
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateMessageTokens(messages: Message[]): number {
  let total = 0;
  for (const msg of messages) {
    if (msg.type === 'user' && typeof msg.content === 'string') {
      total += estimateTokenCount(msg.content);
    } else if (msg.type === 'assistant') {
      for (const block of msg.content) {
        if (block.type === 'text') {
          total += estimateTokenCount((block as TextBlock).text);
        }
      }
    }
  }
  return total;
}

function extractUsage(data: Record<string, unknown>): TokenUsage {
  const usage = data.usage as Record<string, number> | undefined;
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
  };
}

// -- Legacy API aliases --

export async function queryClaude(options: QueryOptions): Promise<QueryResult> {
  return queryXAI(options);
}

export async function* queryClaudeStream(options: QueryOptions): AsyncGenerator<StreamEvent> {
  yield* queryXAIStream(options);
}

// -- Core XAI API functions --

export function buildRequestBody(
  userInput: string,
  systemPrompt: string,
  model: string,
  maxTokens: number,
  temperature: number,
  tools: ToolDefinition[] | undefined,
  previousResponseId: string | undefined,
  functionCallOutputs: Array<{ call_id: string; output: string }> | undefined,
  stream: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    max_output_tokens: maxTokens,
    temperature,
    stream,
  };

  if (previousResponseId) {
    body.previous_response_id = previousResponseId;
  }

  if (functionCallOutputs && functionCallOutputs.length > 0) {
    body.input = functionCallOutputs.map(fco => ({
      type: 'function_call_output',
      call_id: fco.call_id,
      output: fco.output,
    }));
  } else {
    body.input = userInput;
  }

  if (systemPrompt && !previousResponseId) {
    body.instructions = systemPrompt;
  }

  if (tools && tools.length > 0) {
    body.tools = tools.map(t => ({
      type: 'function',
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    }));
    body.tool_choice = 'auto';
  }

  return body;
}

export async function queryXAI(options: QueryOptions): Promise<QueryResult> {
  const {
    messages,
    systemPrompt,
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    tools,
    signal,
  } = options;

  const startTime = Date.now();
  const userInput = buildUserInput(messages);

  return makeXaiRequest(userInput, systemPrompt, model, maxTokens, temperature, tools, signal, startTime, undefined, undefined);
}

async function makeXaiRequest(
  userInput: string,
  systemPrompt: string,
  model: string,
  maxTokens: number,
  temperature: number,
  tools: ToolDefinition[] | undefined,
  signal: AbortSignal | undefined,
  startTime: number,
  previousResponseId: string | undefined,
  functionCallOutputs: Array<{ call_id: string; output: string }> | undefined,
): Promise<QueryResult> {
  const body = buildRequestBody(userInput, systemPrompt, model, maxTokens, temperature, tools, previousResponseId, functionCallOutputs, false);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < RETRY_MAX; attempt++) {
    try {
      const response = await makeXaiApiCall(body, signal);
      const data = await response.json() as Record<string, unknown>;

      if (data.error) {
        const err = data.error as Record<string, unknown>;
        const errType = err.type as string;
        if (errType === 'rate_limit_error') {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
        throw new Error(`XAI API error: ${(err.message as string) ?? JSON.stringify(data.error)}`);
      }

      const message = parseAssistantResponse(data);
      const toolCalls = extractToolCalls(data);

      return {
        message,
        finishReason: (data.status as string) === 'completed' && toolCalls.length === 0 ? 'end_turn' : 'tool_use',
        usage: extractUsage(data),
        duration: Date.now() - startTime,
        toolCalls,
        responseId: (data.id as string) ?? '',
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (signal?.aborted) break;
      if (attempt < RETRY_MAX - 1) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('XAI API call failed');
}

export async function* queryXAIStream(options: QueryOptions): AsyncGenerator<StreamEvent> {
  const {
    messages,
    systemPrompt,
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    tools,
    signal,
  } = options;

  const startTime = Date.now();
  const userInput = buildUserInput(messages);
  const body = buildRequestBody(userInput, systemPrompt, model, maxTokens, temperature, tools, undefined, undefined, true);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < RETRY_MAX; attempt++) {
    try {
      const response = await makeXaiApiCall(body, signal);
      if (!response.body) {
        throw new Error('No response body');
      }

      let buffer = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let responseData: Record<string, unknown> = {};

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
                yield { type: 'text', text: (event.delta as string) ?? '' };
              } else if (eventType === 'response.reasoning_text.delta') {
                yield { type: 'thinking', thinking: (event.delta as string) ?? '' };
              } else if (eventType === 'response.created') {
                responseData = (event.response as Record<string, unknown>) ?? {};
              } else if (eventType === 'response.completed') {
                responseData = (event.response as Record<string, unknown>) ?? {};
              } else if (eventType === 'response.output_item.added') {
                const item = event.item as Record<string, unknown> | undefined;
                if (item?.type === 'function_call') {
                  yield {
                    type: 'tool_use',
                    toolCall: {
                      id: (item.id as string) ?? '',
                      callId: (item.call_id as string) ?? '',
                      name: (item.name as string) ?? '',
                      input: typeof item.arguments === 'string'
                        ? (() => { try { return JSON.parse(item.arguments as string); } catch { return {}; } })()
                        : (item.arguments as Record<string, unknown>) ?? {},
                    },
                  };
                }
              } else if (eventType === 'error') {
                yield { type: 'error', error: (event.message as string) ?? 'Stream error' };
              }
            } catch {
              // Skip malformed SSE
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      yield {
        type: 'done',
        usage: extractUsage(responseData),
        text: `Completed in ${Date.now() - startTime}ms`,
      };

      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (signal?.aborted) break;
      if (attempt < RETRY_MAX - 1) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        yield { type: 'error', error: `Retrying in ${delay}ms...` };
        await sleep(delay);
      }
    }
  }

  if (lastError) {
    yield { type: 'error', error: lastError.message };
  }
}

// -- Background/conversation continuation --

export interface XAIConversationState {
  previousResponseId: string | undefined;
}

export async function continueWithToolResults(
  userInput: string,
  systemPrompt: string,
  model: string,
  maxTokens: number,
  temperature: number,
  tools: ToolDefinition[] | undefined,
  signal: AbortSignal | undefined,
  previousResponseId: string,
  functionCallOutputs: Array<{ call_id: string; output: string }>,
): Promise<QueryResult> {
  return makeXaiRequest(
    userInput,
    systemPrompt,
    model,
    maxTokens,
    temperature,
    tools,
    signal,
    Date.now(),
    previousResponseId,
    functionCallOutputs,
  );
}

async function makeXaiApiCall(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Response> {
  const apiKey = getApiKey();
  const response = await fetch(XAI_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
  }

  return response;
}

export function buildQuerySystemPrompt(
  tools: ToolDefinition[],
  workingDirectory: string,
  platform: string,
  shell: string,
  gitBranch: string,
  sessionId: string,
  model: string,
): string {
  return getSystemPrompt(tools, workingDirectory, platform, shell, gitBranch)
    .replace('{sessionId}', sessionId)
    .replace('{model}', model)
    .replace('{date}', new Date().toISOString());
}

export async function executeToolCalls(
  toolCalls: ParsedToolCall[],
  toolMap: Map<string, ToolDefinition>,
  context: {
    sessionId: string;
    permissionMode: 'auto' | 'acceptEdits' | 'bypassPermissions' | 'default' | 'dontAsk' | 'plan';
    workingDirectory: string;
    signal: AbortSignal;
    messages: Message[];
    onProgress?: (toolName: string, status: 'started' | 'completed' | 'error') => void;
  },
): Promise<{ messages: Message[]; functionCallOutputs: Array<{ call_id: string; output: string }> }> {
  const resultMessages: Message[] = [];
  const functionCallOutputs: Array<{ call_id: string; output: string }> = [];
  let callIndex = 0;

  for (const call of toolCalls) {
    if (callIndex >= MAX_TOOL_CALLS_PER_TURN) break;

    const tool = toolMap.get(call.name);
    if (!tool) {
      const errMsg = `Unknown tool: ${call.name}`;
      resultMessages.push(createToolResultMessage(call.callId, { content: errMsg, isError: true }));
      functionCallOutputs.push({ call_id: call.callId, output: errMsg });
      continue;
    }

    const toolContext = {
      sessionId: context.sessionId,
      toolUseId: call.callId,
      messageId: `msg_${Date.now()}`,
      signal: context.signal,
      permissionMode: context.permissionMode,
      workingDirectory: context.workingDirectory,
      messages: context.messages,
    };

    context.onProgress?.(call.name, 'started');

    try {
      const permission = await tool.canUse(toolContext);
      if (!permission.allowed) {
        const errMsg = `Permission denied: ${permission.reason ?? 'Tool requires additional permissions'}`;
        resultMessages.push(createToolResultMessage(call.callId, { content: errMsg, isError: true }));
        functionCallOutputs.push({ call_id: call.callId, output: errMsg });
        context.onProgress?.(call.name, 'error');
        continue;
      }

      const result = await tool.execute(call.input, toolContext);
      resultMessages.push(createToolResultMessage(call.callId, result));
      functionCallOutputs.push({ call_id: call.callId, output: result.content });
      context.onProgress?.(call.name, 'completed');
    } catch (err) {
      const errMsg = `Tool execution error: ${err instanceof Error ? err.message : String(err)}`;
      resultMessages.push(createToolResultMessage(call.callId, { content: errMsg, isError: true }));
      functionCallOutputs.push({ call_id: call.callId, output: errMsg });
      context.onProgress?.(call.name, 'error');
    }

    callIndex++;
  }

  return { messages: resultMessages, functionCallOutputs };
}

function getApiKey(): string {
  return (
    process.env.XAI_API_KEY ??
    process.env.ANTHROPIC_API_KEY ??
    ''
  );
}

function generateMessageId(): string {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
