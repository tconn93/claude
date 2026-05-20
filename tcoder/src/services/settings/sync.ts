import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { APP_NAME, CLAUDE_CONFIG_DIR } from '../../constants/common.ts';

export interface SettingsData {
  [key: string]: unknown;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  theme?: string;
  permissionMode?: string;
  permissionRules?: Array<{ toolName: string; mode: string }>;
  workingDirectory?: string;
  editor?: string;
  mcpServers?: Record<string, unknown>;
  plugins?: string[];
  analytics?: { enabled: boolean; endpoint?: string };
  lsp?: Record<string, { command: string; args?: string[]; languageIds: string[] }>;
  voice?: { enabled: boolean; language?: string };
  keybindings?: Record<string, string>;
  hooks?: Record<string, unknown>;
}

export class SettingsSync {
  private localPath: string;
  private remotePath: string | null = null;
  private data: SettingsData = {};
  private dirty = false;
  private listeners: Array<(data: SettingsData) => void> = [];

  constructor(localPath?: string) {
    this.localPath = localPath ?? this.getDefaultLocalPath();
    this.load();
  }

  get<T = unknown>(key: string): T | undefined {
    return this.data[key] as T | undefined;
  }

  set<T = unknown>(key: string, value: T): void {
    this.data[key] = value;
    this.dirty = true;
    this.notify();
  }

  getAll(): SettingsData {
    return { ...this.data };
  }

  update(partial: Partial<SettingsData>): void {
    Object.assign(this.data, partial);
    this.dirty = true;
    this.notify();
  }

  delete(key: string): void {
    delete this.data[key];
    this.dirty = true;
    this.notify();
  }

  async save(): Promise<void> {
    if (!this.dirty) return;

    const dir = dirname(this.localPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(this.localPath, JSON.stringify(this.data, null, 2), 'utf-8');
    this.dirty = false;
  }

  load(): SettingsData {
    try {
      if (existsSync(this.localPath)) {
        const raw = readFileSync(this.localPath, 'utf-8');
        this.data = JSON.parse(raw) as SettingsData;
        return this.data;
      }
    } catch {
      // Return defaults if load fails
    }

    this.data = {};
    return this.data;
  }

  async reload(): Promise<SettingsData> {
    return this.load();
  }

  async sync(): Promise<void> {
    if (!this.remotePath) return;

    try {
      const remote = await this.fetchRemote();
      if (remote) {
        this.data = this.merge(this.data, remote);
        await this.save();
      }
    } catch {
      // Sync failure, keep local state
    }
  }

  setRemote(path: string): void {
    this.remotePath = path;
  }

  subscribe(listener: (data: SettingsData) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  migrateKey(oldKey: string, newKey: string): void {
    if (oldKey in this.data) {
      const value = this.data[oldKey];
      delete this.data[oldKey];
      this.data[newKey] = value;
      this.dirty = true;
      this.notify();
    }
  }

  validate(): string[] {
    const errors: string[] = [];

    if (this.data.maxTokens !== undefined) {
      const maxTokens = Number(this.data.maxTokens);
      if (isNaN(maxTokens) || maxTokens < 1) {
        errors.push('maxTokens must be a positive number');
      }
    }

    if (this.data.temperature !== undefined) {
      const temp = Number(this.data.temperature);
      if (isNaN(temp) || temp < 0 || temp > 1) {
        errors.push('temperature must be between 0 and 1');
      }
    }

    return errors;
  }

  private getDefaultLocalPath(): string {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '~';
    return resolve(home, CLAUDE_CONFIG_DIR, 'settings.json');
  }

  private async fetchRemote(): Promise<SettingsData | null> {
    if (!this.remotePath) return null;

    try {
      const response = await fetch(this.remotePath);
      if (!response.ok) return null;
      return (await response.json()) as SettingsData;
    } catch {
      return null;
    }
  }

  private merge(local: SettingsData, remote: SettingsData): SettingsData {
    const merged = { ...remote, ...local };
    return merged;
  }

  private notify(): void {
    const data = { ...this.data };
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch {
        // Ignore listener errors
      }
    }
  }
}

export const settingsSync = new SettingsSync();
