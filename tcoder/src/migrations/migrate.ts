import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { CLAUDE_CONFIG_DIR } from '../constants/common.ts';

export interface Migration {
  version: number;
  name: string;
  description: string;
  up: (config: Record<string, unknown>) => Promise<Record<string, unknown>>;
  down?: (config: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial-settings',
    description: 'Initial settings structure',
    async up(config) {
      return {
        version: 1,
        model: config.model || 'grok-4.3',
        theme: config.theme || 'default',
        permissions: config.permissions || { defaultMode: 'default', rules: [], denyList: [] },
        ...config,
      };
    },
  },
  {
    version: 2,
    name: 'add-fast-mode',
    description: 'Add fast mode setting',
    async up(config) {
      return {
        ...config,
        version: 2,
        fastMode: config.fastMode ?? false,
      };
    },
  },
  {
    version: 3,
    name: 'add-mcp-config',
    description: 'Add MCP server configuration support',
    async up(config) {
      return {
        ...config,
        version: 3,
        mcpServers: config.mcpServers || [],
      };
    },
  },
];

export async function migrateConfig(
  configDir: string,
  currentConfig: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const currentVersion = (currentConfig.version as number) || 0;
  let config = { ...currentConfig };

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      try {
        config = await migration.up(config);
      } catch (err) {
        console.error(`Migration ${migration.name} (v${migration.version}) failed:`, err);
        throw err;
      }
    }
  }

  // Save migrated config
  const configPath = join(configDir, CLAUDE_CONFIG_DIR, 'config.json');
  await mkdir(join(configDir, CLAUDE_CONFIG_DIR), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2));

  return config;
}

export async function loadConfigWithMigration(
  configDir: string,
): Promise<Record<string, unknown>> {
  const configPath = join(configDir, CLAUDE_CONFIG_DIR, 'config.json');
  let config: Record<string, unknown> = {};

  try {
    const content = await readFile(configPath, 'utf-8');
    config = JSON.parse(content);
  } catch {
    // No config file yet, start fresh
  }

  return migrateConfig(configDir, config);
}

export function getLatestVersion(): number {
  return migrations.length > 0 ? migrations[migrations.length - 1]!.version : 0;
}
