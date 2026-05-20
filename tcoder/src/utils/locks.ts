import { existsSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export interface LockInfo {
  id: string;
  resource: string;
  owner: string;
  acquiredAt: number;
  expiresAt: number | null;
  metadata?: Record<string, unknown>;
}

export class LockManager {
  private locks: Map<string, LockInfo> = new Map();
  private lockDir: string;
  private defaultTimeout: number;

  constructor(lockDir: string, defaultTimeout = 30_000) {
    this.lockDir = lockDir;
    this.defaultTimeout = defaultTimeout;
  }

  acquire(
    resource: string,
    options?: { timeout?: number; metadata?: Record<string, unknown> },
  ): LockInfo | null {
    const existing = this.locks.get(resource);
    if (existing && !this.isExpired(existing)) {
      return null;
    }

    const lock: LockInfo = {
      id: randomUUID(),
      resource,
      owner: `pid_${process.pid}`,
      acquiredAt: Date.now(),
      expiresAt: options?.timeout ? Date.now() + options.timeout : Date.now() + this.defaultTimeout,
      metadata: options?.metadata,
    };

    this.locks.set(resource, lock);
    this.writeLockFile(lock);
    return lock;
  }

  release(resource: string): boolean {
    const lock = this.locks.get(resource);
    if (lock) {
      this.deleteLockFile(resource);
      return this.locks.delete(resource);
    }
    return false;
  }

  isLocked(resource: string): boolean {
    const lock = this.locks.get(resource);
    if (!lock) return false;

    if (this.isExpired(lock)) {
      this.release(resource);
      return false;
    }

    return true;
  }

  getLock(resource: string): LockInfo | undefined {
    const lock = this.locks.get(resource);
    if (lock && this.isExpired(lock)) {
      this.release(resource);
      return undefined;
    }
    return lock;
  }

  getAllLocks(): LockInfo[] {
    const active: LockInfo[] = [];
    for (const [resource, lock] of this.locks) {
      if (this.isExpired(lock)) {
        this.release(resource);
      } else {
        active.push(lock);
      }
    }
    return active;
  }

  releaseAll(): void {
    for (const [resource] of this.locks) {
      this.deleteLockFile(resource);
    }
    this.locks.clear();
  }

  tryWithLock<T>(
    resource: string,
    fn: () => T | Promise<T>,
    options?: { timeout?: number; retries?: number; retryDelay?: number },
  ): Promise<T> {
    const retries = options?.retries ?? 0;
    const retryDelay = options?.retryDelay ?? 100;

    const attempt = async (remainingRetries: number): Promise<T> => {
      const lock = this.acquire(resource, options);
      if (lock) {
        try {
          return await fn();
        } finally {
          this.release(resource);
        }
      }

      if (remainingRetries <= 0) {
        throw new Error(`Failed to acquire lock for '${resource}'`);
      }

      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return attempt(remainingRetries - 1);
    };

    return attempt(retries);
  }

  private isExpired(lock: LockInfo): boolean {
    if (!lock.expiresAt) return false;
    return Date.now() > lock.expiresAt;
  }

  private writeLockFile(lock: LockInfo): void {
    try {
      const path = this.getLockPath(lock.resource);
      writeFileSync(path, JSON.stringify(lock), 'utf-8');
    } catch {
      // no-op
    }
  }

  private deleteLockFile(resource: string): void {
    try {
      const path = this.getLockPath(resource);
      if (existsSync(path)) {
        unlinkSync(path);
      }
    } catch {
      // no-op
    }
  }

  private getLockPath(resource: string): string {
    const safeName = resource.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${this.lockDir}/${safeName}.lock`;
  }
}

export function createLockManager(lockDir: string, defaultTimeout?: number): LockManager {
  return new LockManager(lockDir, defaultTimeout);
}
