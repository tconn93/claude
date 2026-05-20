import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getSettingsPath, ensureConfigDir } from './paths.ts';
import type { AppSettings, SettingsPartial } from './types.ts';
import { mergeSettings, loadSettings, validateSettings } from './load.ts';
import { DEFAULT_SETTINGS } from './types.ts';

export function saveSettings(settings: AppSettings): boolean {
  const errors = validateSettings(settings);
  if (errors.length > 0) {
    return false;
  }

  try {
    ensureConfigDir();
    const json = JSON.stringify(settings, null, 2);
    writeFileSync(getSettingsPath(), json, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function updateSettings(partial: SettingsPartial): boolean {
  const current = loadSettings();
  const merged = mergeSettings(current, partial);
  return saveSettings(merged);
}

export function saveSettingsToPath(path: string, settings: AppSettings): boolean {
  try {
    const dir = dirname(path);
    mkdirSync(dir, { recursive: true });
    const json = JSON.stringify(settings, null, 2);
    writeFileSync(path, json, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function resetSettings(): boolean {
  return saveSettings({ ...DEFAULT_SETTINGS });
}

export function patchSettings(key: string, value: unknown): boolean {
  const current = loadSettings();
  const merged = mergeSettings(current, { [key]: value } as SettingsPartial);
  return saveSettings(merged);
}
