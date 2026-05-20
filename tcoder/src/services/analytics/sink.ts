import type { AnalyticsEvent } from './events.ts';
import type { AnalyticsConfig } from './config.ts';

export interface AnalyticsSink {
  name: string;
  enabled: boolean;
  flush: (events: AnalyticsEvent[]) => Promise<void>;
  single: (event: AnalyticsEvent) => Promise<void>;
}

export function createConsoleSink(): AnalyticsSink {
  return {
    name: 'console',
    enabled: true,
    async flush(events: AnalyticsEvent[]): Promise<void> {
      for (const event of events) {
        const level = event.level === 'error' ? 'error' : event.level === 'warn' ? 'warn' : 'log';
        console[level](`[Analytics] ${event.category}/${event.name}`, event.data ?? {});
      }
    },
    async single(event: AnalyticsEvent): Promise<void> {
      const level = event.level === 'error' ? 'error' : event.level === 'warn' ? 'warn' : 'log';
      console[level](`[Analytics] ${event.category}/${event.name}`, event.data ?? {});
    },
  };
}

export function createHttpSink(endpoint: string, apiKey?: string): AnalyticsSink {
  return {
    name: 'http',
    enabled: true,
    async flush(events: AnalyticsEvent[]): Promise<void> {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ events }),
        });
      } catch {
        // Silently swallow analytics errors
      }
    },
    async single(event: AnalyticsEvent): Promise<void> {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(event),
        });
      } catch {
        // Silently swallow analytics errors
      }
    },
  };
}

export function createFileSink(filePath: string): AnalyticsSink {
  return {
    name: 'file',
    enabled: true,
    async flush(events: AnalyticsEvent[]): Promise<void> {
      try {
        const fs = await import('node:fs/promises');
        const lines = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
        await fs.appendFile(filePath, lines);
      } catch {
        // Silently swallow analytics errors
      }
    },
    async single(event: AnalyticsEvent): Promise<void> {
      try {
        const fs = await import('node:fs/promises');
        await fs.appendFile(filePath, JSON.stringify(event) + '\n');
      } catch {
        // Silently swallow analytics errors
      }
    },
  };
}
