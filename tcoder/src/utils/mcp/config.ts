import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getMCPConfigPath } from '../settings/paths.ts';
import { safeJsonParse } from '../json.ts';

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
  disabled?: boolean;
  timeout?: number;
  autoApprove?: string[];
}

export interface MCPConfig {
  servers: Record<string, MCPServerConfig>;
  globalTimeout: number;
  maxServers: number;
  enabled: boolean;
}

const DEFAULT_MCP_CONFIG: MCPConfig = {
  servers: {},
  globalTimeout: 60_000,
  maxServers: 20,
  enabled: true,
};

export function loadMCPConfig(): MCPConfig {
  const path = getMCPConfigPath();

  if (!existsSync(path)) {
    return { ...DEFAULT_MCP_CONFIG };
  }

  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = safeJsonParse<Partial<MCPConfig>>(raw);

    if (!parsed) return { ...DEFAULT_MCP_CONFIG };

    return {
      ...DEFAULT_MCP_CONFIG,
      ...parsed,
      servers: { ...parsed.servers },
    };
  } catch {
    return { ...DEFAULT_MCP_CONFIG };
  }
}

export function saveMCPConfig(config: MCPConfig): boolean {
  try {
    const path = getMCPConfigPath();
    const dir = dirname(path);
    mkdirSync(dir, { recursive: true });
    const json = JSON.stringify(config, null, 2);
    writeFileSync(path, json, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function addMCPServer(
  name: string,
  serverConfig: MCPServerConfig,
  existing?: MCPConfig,
): boolean {
  const config = existing ?? loadMCPConfig();

  if (Object.keys(config.servers).length >= config.maxServers) {
    return false;
  }

  config.servers[name] = serverConfig;
  return saveMCPConfig(config);
}

export function removeMCPServer(name: string, existing?: MCPConfig): boolean {
  const config = existing ?? loadMCPConfig();
  delete config.servers[name];
  return saveMCPConfig(config);
}

export function updateMCPServer(
  name: string,
  updates: Partial<MCPServerConfig>,
  existing?: MCPConfig,
): boolean {
  const config = existing ?? loadMCPConfig();

  if (!config.servers[name]) return false;

  config.servers[name] = { ...config.servers[name], ...updates };
  return saveMCPConfig(config);
}

export function getMCPServer(
  name: string,
  config?: MCPConfig,
): MCPServerConfig | undefined {
  const c = config ?? loadMCPConfig();
  return c.servers[name];
}

export function listMCPServers(config?: MCPConfig): string[] {
  const c = config ?? loadMCPConfig();
  return Object.keys(c.servers);
}

export function getEnabledMCPServers(config?: MCPConfig): string[] {
  const c = config ?? loadMCPConfig();
  return Object.entries(c.servers)
    .filter(([, s]) => !s.disabled)
    .map(([name]) => name);
}

export function disableMCPServer(name: string, config?: MCPConfig): boolean {
  return updateMCPServer(name, { disabled: true }, config);
}

export function enableMCPServer(name: string, config?: MCPConfig): boolean {
  return updateMCPServer(name, { disabled: false }, config);
}
