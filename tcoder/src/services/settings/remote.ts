import type { SettingsData } from './sync.ts';

export interface RemoteSettingsConfig {
  url: string;
  apiKey?: string;
  pollIntervalMs?: number;
  onUpdate?: (settings: SettingsData) => void;
}

export class RemoteSettings {
  private url: string;
  private apiKey?: string;
  private pollIntervalMs: number;
  private onUpdate?: (settings: SettingsData) => void;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: RemoteSettingsConfig) {
    this.url = config.url;
    this.apiKey = config.apiKey;
    this.pollIntervalMs = config.pollIntervalMs ?? 60000;
    this.onUpdate = config.onUpdate;
  }

  async fetch(): Promise<SettingsData | null> {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.url, { headers });

      if (!response.ok) {
        throw new Error(`Remote settings fetch failed: HTTP ${response.status}`);
      }

      const data = (await response.json()) as SettingsData;
      this.onUpdate?.(data);
      return data;
    } catch (error) {
      console.warn('Failed to fetch remote settings:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  async push(settings: SettingsData): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error(`Remote settings push failed: HTTP ${response.status}`);
      }

      return true;
    } catch (error) {
      console.warn('Failed to push remote settings:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  startPolling(): void {
    if (this.pollTimer) return;

    this.pollTimer = setInterval(() => {
      this.fetch().catch(() => {});
    }, this.pollIntervalMs);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  updateEndpoint(url: string): void {
    this.url = url;
  }

  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}

export function createDefaultRemoteSettings(apiKey?: string): RemoteSettings {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '~';
  // Use a generic sync URL; users configure their own
  const url = process.env.TCODER_SETTINGS_URL ?? 'http://localhost:8080/api/settings';

  return new RemoteSettings({
    url,
    apiKey,
    pollIntervalMs: 300000, // 5 minutes
  });
}
