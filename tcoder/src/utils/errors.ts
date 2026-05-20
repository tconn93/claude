export class AppError extends Error {
  public code: string;
  public context: Record<string, unknown>;
  public recoverable: boolean;

  constructor(
    message: string,
    options: { code?: string; context?: Record<string, unknown>; recoverable?: boolean; cause?: Error } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options.code ?? 'UNKNOWN';
    this.context = options.context ?? {};
    this.recoverable = options.recoverable ?? false;

    if (options.cause) {
      this.cause = options.cause;
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }
}

export class APIError extends AppError {
  public statusCode: number;
  public retryable: boolean;

  constructor(
    message: string,
    statusCode: number,
    options: { code?: string; context?: Record<string, unknown>; retryable?: boolean; cause?: Error } = {},
  ) {
    super(message, { code: options.code ?? 'API_ERROR', context: options.context, cause: options.cause });
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.retryable = options.retryable ?? (statusCode >= 500 || statusCode === 429);
  }
}

export class ToolError extends AppError {
  public toolName: string;

  constructor(
    toolName: string,
    message: string,
    options: { code?: string; context?: Record<string, unknown>; cause?: Error } = {},
  ) {
    super(message, { code: options.code ?? 'TOOL_ERROR', context: { ...options.context, toolName }, cause: options.cause });
    this.name = 'ToolError';
    this.toolName = toolName;
  }
}

export class ConfigError extends AppError {
  public configPath: string;

  constructor(
    configPath: string,
    message: string,
    options: { code?: string; context?: Record<string, unknown> } = {},
  ) {
    super(message, { code: options.code ?? 'CONFIG_ERROR', context: { ...options.context, configPath } });
    this.name = 'ConfigError';
    this.configPath = configPath;
  }
}

export class ConnectionError extends AppError {
  public serverName: string;

  constructor(
    serverName: string,
    message: string,
    options: { code?: string; context?: Record<string, unknown> } = {},
  ) {
    super(message, { code: options.code ?? 'CONNECTION_ERROR', context: { ...options.context, serverName } });
    this.name = 'ConnectionError';
    this.serverName = serverName;
  }
}

export class AuthError extends AppError {
  public provider: string;

  constructor(
    provider: string,
    message: string,
    options: { code?: string; context?: Record<string, unknown> } = {},
  ) {
    super(message, { code: options.code ?? 'AUTH_ERROR', context: { ...options.context, provider } });
    this.name = 'AuthError';
    this.provider = provider;
  }
}

export class ValidationError extends AppError {
  public field: string;

  constructor(
    field: string,
    message: string,
    options: { code?: string; context?: Record<string, unknown> } = {},
  ) {
    super(message, { code: options.code ?? 'VALIDATION_ERROR', context: { ...options.context, field } });
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class TimeoutError extends AppError {
  public timeoutMs: number;

  constructor(
    timeoutMs: number,
    message?: string,
    options: { code?: string; context?: Record<string, unknown> } = {},
  ) {
    super(message ?? `Operation timed out after ${timeoutMs}ms`, {
      code: options.code ?? 'TIMEOUT_ERROR',
      context: { ...options.context, timeoutMs },
    });
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  return undefined;
}

export function wrapError(error: unknown, message: string): AppError {
  if (error instanceof AppError) return error;
  return new AppError(message, { cause: error instanceof Error ? error : undefined });
}
