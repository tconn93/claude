import type { SandboxOptions } from '../bash/sandbox.ts';
import { evaluateSandbox, getDefaultSandboxOptions } from '../bash/sandbox.ts';

export interface SandboxSession {
  id: string;
  createdAt: number;
  options: SandboxOptions;
  commandCount: number;
  allowedCount: number;
  deniedCount: number;
}

export class SandboxManager {
  private sessions: Map<string, SandboxSession> = new Map();
  private activeSessionId: string | null = null;
  private defaultOptions: SandboxOptions;

  constructor(defaultOptions?: SandboxOptions) {
    this.defaultOptions = defaultOptions ?? getDefaultSandboxOptions();
  }

  createSession(options?: SandboxOptions): SandboxSession {
    const id = `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const session: SandboxSession = {
      id,
      createdAt: Date.now(),
      options: options ?? { ...this.defaultOptions },
      commandCount: 0,
      allowedCount: 0,
      deniedCount: 0,
    };

    this.sessions.set(id, session);
    this.activeSessionId = id;
    return session;
  }

  getActiveSession(): SandboxSession | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) ?? null;
  }

  setActiveSession(id: string): boolean {
    if (this.sessions.has(id)) {
      this.activeSessionId = id;
      return true;
    }
    return false;
  }

  checkCommand(command: string): { allowed: boolean; reason?: string } {
    const session = this.getActiveSession();
    const options = session?.options ?? this.defaultOptions;

    const decision = evaluateSandbox(command, options);

    if (session) {
      session.commandCount++;
      if (decision.allowed) {
        session.allowedCount++;
      } else {
        session.deniedCount++;
      }
    }

    return { allowed: decision.allowed, reason: decision.reason };
  }

  updateOptions(options: Partial<SandboxOptions>): void {
    const session = this.getActiveSession();

    if (session) {
      session.options = { ...session.options, ...options };
    } else {
      this.defaultOptions = { ...this.defaultOptions, ...options };
    }
  }

  addAllowedCommand(command: string): void {
    const session = this.getActiveSession();
    const options = session?.options ?? this.defaultOptions;
    const allowed = options.allowedCommands ?? [];
    if (!allowed.includes(command)) {
      allowed.push(command);
    }

    if (session) {
      session.options.allowedCommands = allowed;
    } else {
      this.defaultOptions.allowedCommands = allowed;
    }
  }

  addBlockedCommand(command: string): void {
    const session = this.getActiveSession();
    const options = session?.options ?? this.defaultOptions;
    const blocked = options.blockedCommands ?? [];
    if (!blocked.includes(command)) {
      blocked.push(command);
    }

    if (session) {
      session.options.blockedCommands = blocked;
    } else {
      this.defaultOptions.blockedCommands = blocked;
    }
  }

  getCurrentOptions(): SandboxOptions {
    const session = this.getActiveSession();
    return session?.options ?? { ...this.defaultOptions };
  }

  getStats(): { totalSessions: number; activeSession: SandboxSession | null } {
    return {
      totalSessions: this.sessions.size,
      activeSession: this.getActiveSession(),
    };
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

  closeAllSessions(): void {
    this.sessions.clear();
    this.activeSessionId = null;
  }
}

export function createSandboxManager(options?: SandboxOptions): SandboxManager {
  return new SandboxManager(options);
}
