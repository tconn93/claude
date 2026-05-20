export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ApiLogEntry {
  timestamp: number;
  level: LogLevel;
  method: string;
  path: string;
  statusCode?: number;
  durationMs?: number;
  requestId?: string;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
  error?: string;
  retryCount?: number;
}

export interface ApiLoggerConfig {
  minLevel: LogLevel;
  maxEntries: number;
  handlers: Array<(entry: ApiLogEntry) => void>;
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class ApiLogger {
  private entries: ApiLogEntry[] = [];
  private config: ApiLoggerConfig;
  private requestCount = 0;

  constructor(config?: Partial<ApiLoggerConfig>) {
    this.config = {
      minLevel: config?.minLevel ?? 'info',
      maxEntries: config?.maxEntries ?? 5000,
      handlers: config?.handlers ?? [],
    };
  }

  log(entry: Omit<ApiLogEntry, 'timestamp'>): void {
    const fullEntry: ApiLogEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    if (LOG_LEVEL_ORDER[fullEntry.level] < LOG_LEVEL_ORDER[this.config.minLevel]) {
      return;
    }

    this.entries.push(fullEntry);

    if (this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(-this.config.maxEntries);
    }

    for (const handler of this.config.handlers) {
      try {
        handler(fullEntry);
      } catch {
        // Ignore handler errors
      }
    }
  }

  logRequest(
    method: string,
    path: string,
    options?: {
      inputTokens?: number;
      model?: string;
      requestId?: string;
    },
  ): string {
    const requestId = options?.requestId ?? `req_${++this.requestCount}_${Date.now()}`;

    this.log({
      level: 'info',
      method,
      path,
      requestId,
      inputTokens: options?.inputTokens,
      model: options?.model,
    });

    return requestId;
  }

  logResponse(
    requestId: string,
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    options?: {
      outputTokens?: number;
      model?: string;
    },
  ): void {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';

    this.log({
      level,
      method,
      path,
      statusCode,
      durationMs,
      requestId,
      outputTokens: options?.outputTokens,
      model: options?.model,
    });
  }

  logError(
    method: string,
    path: string,
    error: string,
    options?: {
      statusCode?: number;
      durationMs?: number;
      requestId?: string;
      retryCount?: number;
    },
  ): void {
    this.log({
      level: 'error',
      method,
      path,
      statusCode: options?.statusCode,
      durationMs: options?.durationMs,
      requestId: options?.requestId,
      error,
      retryCount: options?.retryCount,
    });
  }

  logRetry(
    method: string,
    path: string,
    retryCount: number,
    requestId?: string,
  ): void {
    this.log({
      level: 'warn',
      method,
      path,
      retryCount,
      requestId,
    });
  }

  getEntries(level?: LogLevel, limit?: number): ApiLogEntry[] {
    let filtered = this.entries;
    if (level) {
      filtered = filtered.filter((e) => e.level === level);
    }
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    return filtered;
  }

  getRecentErrors(limit = 50): ApiLogEntry[] {
    return this.getEntries('error', limit);
  }

  clear(): void {
    this.entries = [];
  }

  addHandler(handler: (entry: ApiLogEntry) => void): void {
    this.config.handlers.push(handler);
  }

  removeHandler(handler: (entry: ApiLogEntry) => void): void {
    const idx = this.config.handlers.indexOf(handler);
    if (idx >= 0) {
      this.config.handlers.splice(idx, 1);
    }
  }
}

export const defaultLogger = new ApiLogger();
