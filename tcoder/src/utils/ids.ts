import { randomUUID } from 'node:crypto';

export function generateUUID(): string {
  return randomUUID();
}

export function generateShortId(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export function generateSessionId(): string {
  return `session_${generateShortId(12)}`;
}

export function generateMessageId(): string {
  return `msg_${generateShortId(16)}`;
}

export function generateToolUseId(): string {
  return `toolu_${generateShortId(8)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function generateConversationId(): string {
  return `conv_${generateShortId(10)}`;
}

export function generateTaskId(): string {
  return `task_${generateShortId(8)}`;
}

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${generateShortId(6)}`;
}

export function generateHookId(): string {
  return `hook_${generateShortId(8)}`;
}

export function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function extractTimestamp(id: string): number | null {
  const match = id.match(/_(0?[a-z0-9]{7,8})(?:_|$)/);
  if (!match) return null;
  const parsed = parseInt(match[1], 36);
  return isNaN(parsed) ? null : parsed;
}
