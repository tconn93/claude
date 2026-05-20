export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validatePath(path: string): boolean {
  return /^[^*?"<>|]+$/.test(path);
}

export function validateFileName(name: string): boolean {
  return name.length > 0 &&
    name.length <= 255 &&
    !/[<>:"/\\|?*\x00-\x1f]/.test(name) &&
    name !== '.' &&
    name !== '..';
}

export function validateNonEmpty(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

export function validateNumber(value: unknown, options?: { min?: number; max?: number; integer?: boolean }): boolean {
  if (typeof value !== 'number' || isNaN(value)) return false;
  if (options?.min !== undefined && value < options.min) return false;
  if (options?.max !== undefined && value > options.max) return false;
  if (options?.integer && !Number.isInteger(value)) return false;
  return true;
}

export function validateEnum<T extends string>(value: string, allowed: readonly T[]): value is T {
  return allowed.includes(value as T);
}

export function validateLength(value: string | unknown[], options?: { min?: number; max?: number }): boolean {
  if (options?.min !== undefined && value.length < options.min) return false;
  if (options?.max !== undefined && value.length > options.max) return false;
  return true;
}

export function validatePort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

export function validateHexColor(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color);
}

export function validateSemVer(version: string): boolean {
  return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/.test(version);
}

export function validateJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export function combineValidators(
  ...validators: Array<(value: unknown) => boolean | ValidationResult>
): (value: unknown) => ValidationResult {
  return (value: unknown): ValidationResult => {
    const errors: string[] = [];

    for (const validator of validators) {
      const result = validator(value);
      if (typeof result === 'boolean') {
        if (!result) errors.push('Validation failed');
      } else if (!result.valid) {
        errors.push(...result.errors);
      }
    }

    return { valid: errors.length === 0, errors };
  };
}

export function createValidator<T>(
  check: (value: T) => boolean,
  message: string,
): (value: T) => ValidationResult {
  return (value: T): ValidationResult => {
    const valid = check(value);
    return { valid, errors: valid ? [] : [message] };
  };
}
