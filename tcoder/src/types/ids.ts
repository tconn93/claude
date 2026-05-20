export type SessionId = string & { readonly __brand: 'SessionId' };
export type MessageId = string & { readonly __brand: 'MessageId' };
export type ToolCallId = string & { readonly __brand: 'ToolCallId' };
export type AgentId = string & { readonly __brand: 'AgentId' };
export type TaskId = string & { readonly __brand: 'TaskId' };

export function createSessionId(): SessionId {
  return crypto.randomUUID() as SessionId;
}

export function createMessageId(): MessageId {
  return crypto.randomUUID() as MessageId;
}

export function createToolCallId(): ToolCallId {
  return `toolu_${crypto.randomUUID().slice(0, 8)}` as ToolCallId;
}

export function createAgentId(): AgentId {
  return crypto.randomUUID() as AgentId;
}

export function createTaskId(): TaskId {
  return crypto.randomUUID() as TaskId;
}
