import { detectShell, type ShellType, type ShellInfo } from '../shell.ts';
import { ShellCommand, type ShellCommandOptions, type ShellCommandResult } from './ShellCommand.ts';

export interface ShellSession {
  id: string;
  shellType: ShellType;
  createdAt: number;
  lastUsedAt: number;
  commandCount: number;
  history: ShellHistoryEntry[];
}

export interface ShellHistoryEntry {
  command: string;
  exitCode: number;
  startedAt: number;
  duration: number;
}

export class Shell {
  private info: ShellInfo;
  private sessions: Map<string, ShellSession> = new Map();
  private activeSessionId: string | null = null;

  constructor() {
    this.info = detectShell();
  }

  get type(): ShellType {
    return this.info.type;
  }

  get path(): string {
    return this.info.path;
  }

  get version(): string {
    return this.info.version;
  }

  get isInteractive(): boolean {
    return this.info.isInteractive;
  }

  get activeSession(): ShellSession | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) ?? null;
  }

  createSession(): ShellSession {
    const id = generateSessionId();
    const session: ShellSession = {
      id,
      shellType: this.info.type,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      commandCount: 0,
      history: [],
    };
    this.sessions.set(id, session);
    this.activeSessionId = id;
    return session;
  }

  switchSession(id: string): boolean {
    if (this.sessions.has(id)) {
      this.activeSessionId = id;
      return true;
    }
    return false;
  }

  closeSession(id?: string): void {
    const targetId = id ?? this.activeSessionId;
    if (targetId) {
      this.sessions.delete(targetId);
      if (this.activeSessionId === targetId) {
        this.activeSessionId = null;
      }
    }
  }

  listSessions(): ShellSession[] {
    return Array.from(this.sessions.values());
  }

  async execute(
    command: string,
    options?: ShellCommandOptions,
  ): Promise<ShellCommandResult> {
    const session = this.activeSession;
    const startTime = Date.now();

    const result = await ShellCommand.quick(command, options);

    if (session) {
      session.commandCount++;
      session.lastUsedAt = Date.now();
      session.history.push({
        command,
        exitCode: result.exitCode,
        startedAt: startTime,
        duration: Date.now() - startTime,
      });
      if (session.history.length > 1000) {
        session.history = session.history.slice(-1000);
      }
    }

    return result;
  }

  createCommand(command: string, options?: ShellCommandOptions): ShellCommand {
    return new ShellCommand(command, options);
  }

  getHistory(limit = 50): ShellHistoryEntry[] {
    const session = this.activeSession;
    if (!session) return [];
    return session.history.slice(-limit);
  }

  clearHistory(): void {
    const session = this.activeSession;
    if (session) {
      session.history = [];
    }
  }

  toInfo(): ShellInfo {
    return { ...this.info };
  }
}

function generateSessionId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `shell_${id}`;
}
