export function getEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

export function getEnvRequired(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Required environment variable '${key}' is not set`);
  }
  return value;
}

export function getEnvBool(key: string, defaultValue = false): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === '1' || value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
}

export function getEnvInt(key: string, defaultValue?: number): number | undefined {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function getEnvFloat(key: string, defaultValue?: number): number | undefined {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function getEnvArray(key: string, separator = ','): string[] {
  const value = process.env[key];
  if (!value) return [];
  return value.split(separator).map(s => s.trim()).filter(Boolean);
}

export function setEnv(key: string, value: string): void {
  process.env[key] = value;
}

export function unsetEnv(key: string): void {
  delete process.env[key];
}

export function hasEnv(key: string): boolean {
  return process.env[key] !== undefined;
}

export function listEnv(prefix?: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (!prefix || key.startsWith(prefix)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
  }

  return result;
}

export function getNodeEnv(): string {
  return process.env.NODE_ENV ?? 'development';
}

export function isDevelopment(): boolean {
  return getNodeEnv() === 'development';
}

export function isProduction(): boolean {
  return getNodeEnv() === 'production';
}

export function isTest(): boolean {
  return getNodeEnv() === 'test';
}

export function isCI(): boolean {
  return getEnvBool('CI', false);
}

export function isDebug(): boolean {
  return getEnvBool('DEBUG', false);
}
