import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { getAppDataDir } from './utils/shell.ts';
import { SESSIONS_DIR } from './constants/common.ts';
import type { Conversation, Message } from './types/message.ts';
import { DEFAULT_MODEL, COMPACT_THRESHOLD, MAX_CONVERSATION_MESSAGES } from './constants/common.ts';

export interface SessionMeta {
  id: string;
  title: string;
  model: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

export interface HistoryListOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'updatedAt' | 'createdAt' | 'title';
  sortDir?: 'asc' | 'desc';
}

export const HISTORY_BACKUP_COUNT = 5;

function getSessionsDir(): string {
  const dataDir = getAppDataDir();
  return resolve(dataDir, SESSIONS_DIR);
}

function getSessionPath(sessionId: string): string {
  return resolve(getSessionsDir(), `${sessionId}.json`);
}

function ensureSessionsDir(): void {
  const dir = getSessionsDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function saveSession(conversation: Conversation): void {
  ensureSessionsDir();
  const filePath = getSessionPath(conversation.id);
  conversation.updatedAt = Date.now();

  try {
    writeFileSync(filePath, JSON.stringify(toStorable(conversation), null, 2), 'utf-8');
  } catch {
    throw new Error(`Failed to save session: ${conversation.id}`);
  }
}

export function loadSession(sessionId: string): Conversation | null {
  const filePath = getSessionPath(sessionId);
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    return fromStorable(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function deleteSession(sessionId: string): boolean {
  const filePath = getSessionPath(sessionId);
  if (!existsSync(filePath)) {
    return false;
  }

  try {
    unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

export function listSessions(options: HistoryListOptions = {}): SessionMeta[] {
  const { limit = 50, offset = 0, sortBy = 'updatedAt', sortDir = 'desc' } = options;
  const dir = getSessionsDir();

  if (!existsSync(dir)) {
    return [];
  }

  let sessions: SessionMeta[] = [];

  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const filePath = resolve(dir, file);
      try {
        const stat = statSync(filePath);
        const raw = readFileSync(filePath, 'utf-8');
        const header = JSON.parse(raw);

        sessions.push({
          id: header.id ?? basename(file, '.json'),
          title: header.title ?? 'Untitled',
          model: header.model ?? DEFAULT_MODEL,
          messageCount: Array.isArray(header.messages) ? header.messages.length : 0,
          createdAt: header.createdAt ?? stat.birthtimeMs,
          updatedAt: header.updatedAt ?? stat.mtimeMs,
          tags: header.tags,
        });
      } catch {
        continue;
      }
    }
  } catch {
    return [];
  }

  sessions.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const modifier = sortDir === 'asc' ? 1 : -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal) * modifier;
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * modifier;
    }
    return 0;
  });

  return sessions.slice(offset, offset + limit);
}

export function findSessionByTitle(title: string): SessionMeta | null {
  const sessions = listSessions({ limit: 500 });
  const lower = title.toLowerCase();
  return sessions.find(s => s.title.toLowerCase().includes(lower)) ?? null;
}

export function getOrCreateSession(sessionId?: string): Conversation {
  if (sessionId) {
    const existing = loadSession(sessionId);
    if (existing) {
      return existing;
    }
  }

  const id = sessionId ?? generateSessionId();
  return {
    id,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: DEFAULT_MODEL,
    title: undefined,
    tags: undefined,
  };
}

export function autoSaveSession(conversation: Conversation): void {
  if (conversation.messages.length === 0) return;
  saveSession(conversation);
}

export function shouldCompact(messages: Message[]): boolean {
  return messages.length >= COMPACT_THRESHOLD;
}

export function shouldCompactAggressively(messages: Message[]): boolean {
  return messages.length >= MAX_CONVERSATION_MESSAGES;
}

export function trimOldConversations(maxCount: number): void {
  const sessions = listSessions({ sortBy: 'updatedAt', sortDir: 'desc' });
  if (sessions.length <= maxCount) return;

  const toRemove = sessions.slice(maxCount);
  for (const session of toRemove) {
    deleteSession(session.id);
  }
}

export function exportSession(sessionId: string): string | null {
  const conversation = loadSession(sessionId);
  if (!conversation) return null;

  const exportData = {
    exportedAt: new Date().toISOString(),
    app: 'tcoder',
    version: '0.1.0',
    conversation,
  };

  return JSON.stringify(exportData, null, 2);
}

export function importSession(json: string): Conversation | null {
  try {
    const data = JSON.parse(json);
    if (data.conversation) {
      return fromStorable(data.conversation);
    }
    return fromStorable(data);
  } catch {
    return null;
  }
}

export function generateSessionTitle(messages: Message[]): string {
  const firstUser = messages.find(m => m.type === 'user');
  if (!firstUser || firstUser.type !== 'user') return 'Untitled Session';

  const content = typeof firstUser.content === 'string'
    ? firstUser.content
    : firstUser.content?.[0]?.text ?? '';

  const cleaned = content.trim().replace(/\n/g, ' ');
  if (cleaned.length <= 60) return cleaned || 'New Session';
  return cleaned.slice(0, 57) + '...';
}

function generateSessionId(): string {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toStorable(conversation: Conversation): Record<string, unknown> {
  return { ...conversation };
}

function fromStorable(data: Record<string, unknown>): Conversation {
  return {
    id: data.id as string,
    messages: (data.messages as Message[]) ?? [],
    createdAt: data.createdAt as number,
    updatedAt: data.updatedAt as number,
    model: (data.model as string) ?? DEFAULT_MODEL,
    title: data.title as string | undefined,
    tags: data.tags as string[] | undefined,
  };
}
