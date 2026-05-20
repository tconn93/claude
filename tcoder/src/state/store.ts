import { EventEmitter } from 'node:events';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getAppDataDir } from '../utils/shell.ts';
import type { AppState, AppStateStore } from './types.ts';
import { AppStateManager } from './AppState.ts';

const STATE_FILE = 'state.json';

type StateListener = (state: AppState) => void;

class AppStateStoreImpl implements AppStateStore {
  private state: AppState;
  private emitter = new EventEmitter();
  private persistPath: string;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs = 500;

  constructor() {
    this.persistPath = this.resolveStatePath();
    this.state = this.loadFromDisk();
    this.emitter.setMaxListeners(50);
  }

  getState(): AppState {
    return this.state;
  }

  setState(partial: Partial<AppState>): void {
    const prev = this.state;
    this.state = { ...this.state, ...partial };
    this.schedulePersist();
    this.emitter.emit('change', this.state, prev);
  }

  subscribe(listener: StateListener): () => void {
    this.emitter.on('change', listener);
    return () => {
      this.emitter.off('change', listener);
    };
  }

  replaceState(state: AppState): void {
    const prev = this.state;
    this.state = state;
    this.schedulePersist();
    this.emitter.emit('change', this.state, prev);
  }

  private resolveStatePath(): string {
    const dataDir = getAppDataDir();
    return `${dataDir}/${STATE_FILE}`;
  }

  private schedulePersist(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.persistToDisk();
      this.persistTimer = null;
    }, this.debounceMs);
  }

  private persistToDisk(): void {
    try {
      const dir = dirname(this.persistPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const serializable = this.serialize(this.state);
      writeFileSync(this.persistPath, JSON.stringify(serializable, null, 2), 'utf-8');
    } catch {
      // Best-effort persistence; suppress errors
    }
  }

  private loadFromDisk(): AppState {
    try {
      if (existsSync(this.persistPath)) {
        const raw = readFileSync(this.persistPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return this.deserialize(parsed);
      }
    } catch {
      // Corrupted state file; fall back to defaults
    }
    return AppStateManager.createDefault();
  }

  private serialize(state: AppState): Record<string, unknown> {
    return {
      ...state,
      activeTools: Object.fromEntries(state.activeTools),
    };
  }

  private deserialize(data: Record<string, unknown>): AppState {
    const defaults = AppStateManager.createDefault();
    const activeTools = new Map<string, AbortController>();
    if (typeof data.activeTools === 'object' && data.activeTools !== null) {
      // Restored tools will have new AbortControllers
    }
    return {
      ...defaults,
      ...(data as Partial<AppState>),
      activeTools,
    };
  }

  flushSync(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.persistToDisk();
  }
}

let storeInstance: AppStateStoreImpl | null = null;

export function getAppStateStore(): AppStateStoreImpl {
  if (!storeInstance) {
    storeInstance = new AppStateStoreImpl();
  }
  return storeInstance;
}

export function resetAppStateStore(): void {
  storeInstance = null;
}
