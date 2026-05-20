import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadSettings } from './settings/load.ts';
import type { AppSettings } from './settings/types.ts';

export interface AppConfig {
  settings: AppSettings;
  workingDirectory: string;
  configDir: string;
  dataDir: string;
  cacheDir: string;
  version: string;
  isProduction: boolean;
  isDebug: boolean;
  startupTime: number;
}

let cachedConfig: AppConfig | null = null;

export function loadConfig(overrides?: Partial<AppConfig>): AppConfig {
  if (cachedConfig && !overrides) {
    return cachedConfig;
  }

  const settings = loadSettings();
  const workingDirectory = overrides?.workingDirectory ?? settings.workingDirectory ?? process.cwd();

  const config: AppConfig = {
    settings,
    workingDirectory,
    configDir: `${workingDirectory}/.tcoder`,
    dataDir: `${workingDirectory}/.tcoder/data`,
    cacheDir: `${workingDirectory}/.tcoder/cache`,
    version: '0.1.0',
    isProduction: process.env.NODE_ENV === 'production',
    isDebug: settings.debug ?? process.env.DEBUG === '1',
    startupTime: Date.now(),
    ...overrides,
  };

  if (!overrides) {
    cachedConfig = config;
  }

  return config;
}

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

export function reloadConfig(): AppConfig {
  cachedConfig = null;
  return loadConfig();
}

export function updateConfigWorkingDirectory(workingDirectory: string): AppConfig {
  cachedConfig = null;
  return loadConfig({ workingDirectory });
}

export function findProjectRoot(startDir?: string): string | null {
  let current = resolve(startDir ?? process.cwd());

  for (let i = 0; i < 32; i++) {
    const markers = ['.tcoder', '.git', 'package.json', '.claude'];

    for (const marker of markers) {
      if (existsSync(`${current}/${marker}`)) {
        return current;
      }
    }

    const parent = resolve(current, '..');
    if (parent === current) break;
    current = parent;
  }

  return null;
}

export function findConfigFile(startDir?: string): string | null {
  let current = resolve(startDir ?? process.cwd());

  for (let i = 0; i < 32; i++) {
    const candidates = [
      `${current}/.tcoder.json`,
      `${current}/.tcoder/config.json`,
      `${current}/tcoder.json`,
      `${current}/.tcoderc`,
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    const parent = resolve(current, '..');
    if (parent === current) break;
    current = parent;
  }

  return null;
}

export function readConfigFile(path: string): Record<string, unknown> | null {
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getPackageVersion(): string {
  try {
    const pkgPath = resolve(process.cwd(), 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
      return pkg.version ?? '0.0.0';
    }
  } catch {
    // no-op
  }
  return '0.0.0';
}
