export function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function safeJsonParseWithDefault<T>(text: string, defaultValue: T): T {
  return safeJsonParse<T>(text) ?? defaultValue;
}

export function safeJsonStringify(
  value: unknown,
  options?: { pretty?: boolean; maxDepth?: number },
): string {
  try {
    if (options?.pretty) {
      return JSON.stringify(value, null, 2);
    }
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

export function tryParseJson(text: string): { success: true; data: unknown } | { success: false; error: string } {
  try {
    return { success: true, data: JSON.parse(text) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function jsonSize(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}

export function isValidJson(text: string): boolean {
  return safeJsonParse(text) !== null || text === 'null';
}

export function mergeJson(base: Record<string, unknown>, overlay: Record<string, unknown>): Record<string, unknown> {
  const result = { ...base };

  for (const [key, value] of Object.entries(overlay)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = mergeJson(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function deepClone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

export function jsonEquals(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

export function prettifyJson(text: string): string | null {
  const parsed = safeJsonParse(text);
  if (parsed === null) return null;
  return JSON.stringify(parsed, null, 2);
}
