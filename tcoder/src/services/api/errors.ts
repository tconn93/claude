export enum ApiErrorCode {
  Unknown = 'UNKNOWN',
  AuthenticationError = 'AUTHENTICATION_ERROR',
  PermissionError = 'PERMISSION_ERROR',
  RateLimitError = 'RATE_LIMIT_ERROR',
  InvalidRequestError = 'INVALID_REQUEST_ERROR',
  NotFoundError = 'NOT_FOUND_ERROR',
  ServerError = 'SERVER_ERROR',
  ServiceUnavailable = 'SERVICE_UNAVAILABLE',
  TimeoutError = 'TIMEOUT_ERROR',
  NetworkError = 'NETWORK_ERROR',
  OverloadedError = 'OVERLOADED_ERROR',
  StreamingError = 'STREAMING_ERROR',
}

export class ApiError extends Error {
  public code: ApiErrorCode;
  public status: number;
  public details: Record<string, unknown>;
  public retryable: boolean;

  constructor(
    code: ApiErrorCode,
    message: string,
    status = 0,
    details: Record<string, unknown> = {},
    retryable = false,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryable = retryable;
  }

  static fromHttpStatus(status: number, message: string, body: Record<string, unknown> = {}): ApiError {
    switch (status) {
      case 400:
        return new ApiError(ApiErrorCode.InvalidRequestError, message, status, body, false);
      case 401:
        return new ApiError(ApiErrorCode.AuthenticationError, message, status, body, false);
      case 403:
        return new ApiError(ApiErrorCode.PermissionError, message, status, body, false);
      case 404:
        return new ApiError(ApiErrorCode.NotFoundError, message, status, body, false);
      case 408:
        return new ApiError(ApiErrorCode.TimeoutError, message, status, body, true);
      case 429:
        return new ApiError(ApiErrorCode.RateLimitError, message, status, body, true);
      case 500:
        return new ApiError(ApiErrorCode.ServerError, message, status, body, true);
      case 502:
      case 503:
      case 504:
        return new ApiError(ApiErrorCode.ServiceUnavailable, message, status, body, true);
      case 529:
        return new ApiError(ApiErrorCode.OverloadedError, message, status, body, true);
      default:
        if (status >= 500) {
          return new ApiError(ApiErrorCode.ServerError, message, status, body, true);
        }
        return new ApiError(ApiErrorCode.Unknown, message, status, body, false);
    }
  }

  static fromNetworkError(error: unknown): ApiError {
    const message = error instanceof Error ? error.message : String(error);
    return new ApiError(ApiErrorCode.NetworkError, `Network error: ${message}`, 0, {}, true);
  }

  static fromStreamError(error: unknown): ApiError {
    const message = error instanceof Error ? error.message : String(error);
    return new ApiError(ApiErrorCode.StreamingError, `Streaming error: ${message}`, 0, {}, true);
  }

  static isRetryable(error: unknown): boolean {
    if (error instanceof ApiError) {
      return error.retryable;
    }
    return false;
  }
}

export function isAuthenticationError(error: unknown): boolean {
  return error instanceof ApiError && error.code === ApiErrorCode.AuthenticationError;
}

export function isRateLimitError(error: unknown): boolean {
  return error instanceof ApiError && error.code === ApiErrorCode.RateLimitError;
}

export function isOverloadedError(error: unknown): boolean {
  return error instanceof ApiError && error.code === ApiErrorCode.OverloadedError;
}

export function extractRateLimitReset(error: unknown): number | null {
  if (error instanceof ApiError && error.details.resetAt) {
    return error.details.resetAt as number;
  }
  return null;
}
