import { readFileSync, existsSync } from 'node:fs';
import { getSettingsPath } from './paths.ts';
import { DEFAULT_SETTINGS, type AppSettings, type SettingsPartial } from './types.ts';
import { safeJsonParse } from '../json.ts';

export function loadSettings(): AppSettings {
  const settingsPath = getSettingsPath();

  if (!existsSync(settingsPath)) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const raw = readFileSync(settingsPath, 'utf-8');
    const parsed = safeJsonParse<SettingsPartial>(raw);

    if (!parsed) {
      return { ...DEFAULT_SETTINGS };
    }

    return mergeSettings(DEFAULT_SETTINGS, parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function loadSettingsSync(): AppSettings {
  return loadSettings();
}

export function mergeSettings(base: AppSettings, override: SettingsPartial): AppSettings {
  return {
    ...base,
    ...override,
    tools: { ...base.tools, ...override.tools },
    ui: { ...base.ui, ...override.ui },
    git: { ...base.git, ...override.git },
    proxy: { ...base.proxy, ...override.proxy },
    customPrompts: { ...base.customPrompts, ...override.customPrompts },
    env: { ...base.env, ...override.env },
  };
}

export function loadSettingsFromPath(path: string): AppSettings | null {
  try {
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, 'utf-8');
    const parsed = safeJsonParse<SettingsPartial>(raw);
    if (!parsed) return null;
    return mergeSettings(DEFAULT_SETTINGS, parsed);
  } catch {
    return null;
  }
}

export function validateSettings(settings: AppSettings): string[] {
  const errors: string[] = [];

  if (settings.version < 1) {
    errors.push('Settings version must be >= 1');
  }

  if (!settings.model) {
    errors.push('Model is required');
  }

  if (settings.maxTokens < 100 || settings.maxTokens > 200_000) {
    errors.push('maxTokens must be between 100 and 200000');
  }

  if (settings.temperature < 0 || settings.temperature > 2) {
    errors.push('temperature must be between 0 and 2');
  }

  if (settings.compactThreshold < 0) {
    errors.push('compactThreshold must be >= 0');
  }

  return errors;
}
