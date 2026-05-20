import { existsSync, readFileSync } from 'node:fs';
import { getSettingsPath } from './paths.ts';
import { DEFAULT_SETTINGS, type AppSettings } from './types.ts';
import { safeJsonParse } from '../json.ts';
import { saveSettings } from './save.ts';

export interface Migration {
  fromVersion: number;
  toVersion: number;
  migrate: (settings: Record<string, unknown>) => Record<string, unknown>;
}

const migrations: Migration[] = [];

export function registerMigration(migration: Migration): void {
  migrations.push(migration);
  migrations.sort((a, b) => a.fromVersion - b.fromVersion);
}

export function needsMigration(settings: Record<string, unknown>): boolean {
  const version = (settings.version as number) ?? 0;
  return version < DEFAULT_SETTINGS.version;
}

export function migrateSettings(
  settings: Record<string, unknown>,
  targetVersion?: number,
): Record<string, unknown> {
  const target = targetVersion ?? DEFAULT_SETTINGS.version;
  let currentVersion = (settings.version as number) ?? 0;
  let current = { ...settings };

  for (const migration of migrations) {
    if (migration.fromVersion >= currentVersion && migration.toVersion <= target) {
      current = migration.migrate(current);
      currentVersion = migration.toVersion;
      current.version = currentVersion;
    }
  }

  if (currentVersion < target) {
    current.version = target;
  }

  return current;
}

export async function migrateOnDisk(): Promise<boolean> {
  const settingsPath = getSettingsPath();

  if (!existsSync(settingsPath)) {
    return false;
  }

  try {
    const raw = readFileSync(settingsPath, 'utf-8');
    const parsed = safeJsonParse<Record<string, unknown>>(raw);

    if (!parsed) return false;

    if (!needsMigration(parsed)) return false;

    const migrated = migrateSettings(parsed);
    return saveSettings(migrated as AppSettings);
  } catch {
    return false;
  }
}

export function getMigrationChain(): Migration[] {
  return [...migrations];
}
