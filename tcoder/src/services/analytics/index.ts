import type { AnalyticsConfig } from './config.ts';
import {
  type AnalyticsEvent,
  type EventCategory,
  type EventLevel,
  createEvent,
  createSessionEvent,
  createMessageEvent,
  createToolEvent,
  createApiEvent,
  createErrorEvent,
  createPerformanceEvent,
} from './events.ts';
import { type AnalyticsSink, createConsoleSink, createHttpSink, createFileSink } from './sink.ts';

export class AnalyticsService {
  private config: AnalyticsConfig;
  private queue: AnalyticsEvent[] = [];
  private sinks: AnalyticsSink[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  constructor(config?: Partial<AnalyticsConfig>) {
    this.config = {
      enabled: config?.enabled ?? false,
      endpoint: config?.endpoint,
      batchSize: config?.batchSize ?? 25,
      flushIntervalMs: config?.flushIntervalMs ?? 30000,
      maxQueueSize: config?.maxQueueSize ?? 10000,
      redactSecrets: config?.redactSecrets ?? true,
      includeSessionData: config?.includeSessionData ?? false,
      apiKey: config?.apiKey,
      tags: config?.tags,
    };

    if (this.config.enabled) {
      this.start();
    }
  }

  start(): void {
    if (this.flushTimer) {
      return;
    }

    if (this.sinks.length === 0) {
      this.sinks.push(createConsoleSink());
    }

    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {});
    }, this.config.flushIntervalMs);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    this.flush().catch(() => {});
  }

  addSink(sink: AnalyticsSink): void {
    this.sinks.push(sink);
  }

  removeSink(name: string): void {
    this.sinks = this.sinks.filter((s) => s.name !== name);
  }

  async track(
    category: EventCategory,
    name: string,
    options?: {
      level?: EventLevel;
      sessionId?: string;
      data?: Record<string, unknown>;
      tags?: Record<string, string>;
      immediate?: boolean;
    },
  ): Promise<void> {
    if (!this.config.enabled && !options?.immediate) {
      return;
    }

    const event = createEvent(category, name, options);

    if (this.config.redactSecrets && event.data) {
      event.data = redactSecrets(event.data);
    }

    if (options?.immediate) {
      for (const sink of this.sinks) {
        if (sink.enabled) {
          sink.single(event).catch(() => {});
        }
      }
    } else {
      this.queue.push(event);

      if (this.queue.length >= this.config.batchSize) {
        await this.flush();
      }

      while (this.queue.length > this.config.maxQueueSize) {
        this.queue.shift();
      }
    }
  }

  trackSession(name: string, sessionId: string, data?: Record<string, unknown>): void {
    this.track('session', name, { sessionId, data }).catch(() => {});
  }

  trackMessage(name: string, sessionId: string, data?: Record<string, unknown>): void {
    this.track('message', name, { sessionId, data }).catch(() => {});
  }

  trackTool(toolName: string, sessionId: string, data?: Record<string, unknown>): void {
    this.track('tool', toolName, { sessionId, data }).catch(() => {});
  }

  trackApi(name: string, sessionId: string, data?: Record<string, unknown>): void {
    this.track('api', name, { sessionId, data }).catch(() => {});
  }

  trackError(name: string, sessionId: string, data?: Record<string, unknown>): void {
    this.track('error', name, { level: 'error', sessionId, data }).catch(() => {});
  }

  trackPerformance(name: string, sessionId: string, data?: Record<string, unknown>): void {
    this.track('performance', name, { sessionId, data }).catch(() => {});
  }

  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) {
      return;
    }

    this.flushing = true;

    const batch = this.queue.splice(0, this.config.batchSize);

    await Promise.all(
      this.sinks
        .filter((s) => s.enabled)
        .map((sink) => sink.flush(batch).catch(() => {})),
    );

    this.flushing = false;
  }

  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

function redactSecrets(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['apiKey', 'api_key', 'apikey', 'password', 'secret', 'token', 'auth', 'credentials'];

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      redacted[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactSecrets(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export { createConsoleSink, createHttpSink, createFileSink };
export type { AnalyticsConfig };
export type { AnalyticsEvent, EventLevel, EventCategory };
export type { AnalyticsSink };

export const analytics = new AnalyticsService();
