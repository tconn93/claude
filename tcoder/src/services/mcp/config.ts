import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { MCPServerConfig, MCPTransportType } from './types.ts';

export interface MCPConfigFile {
  mcpServers?: Record<string, {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    transport?: string;
    autoStart?: boolean;
    headers?: Record<string, string>;
    timeout?: number;
    disabled?: boolean;
    description?: string;
  }>;
}

export function loadMCPConfig(filePath: string): MCPServerConfig[] {
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const config: MCPConfigFile = JSON.parse(raw);

    if (!config.mcpServers) {
      return [];
    }

    const servers: MCPServerConfig[] = [];

    for (const [name, entry] of Object.entries(config.mcpServers)) {
      if (!entry.command && !entry.url) {
        continue;
      }

      const transport: MCPTransportType = entry.url
        ? (entry.transport as MCPTransportType) ?? 'sse'
        : 'stdio';

      servers.push({
        name,
        command: entry.command,
        args: entry.args,
        env: entry.env,
        url: entry.url,
        transport,
        autoStart: entry.autoStart ?? true,
        headers: entry.headers,
        timeout: entry.timeout,
        disabled: entry.disabled ?? false,
        description: entry.description,
      });
    }

    return servers;
  } catch (error) {
    console.error(`Failed to load MCP config from ${filePath}:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}

export function saveMCPConfig(filePath: string, servers: MCPServerConfig[]): void {
  const fs = require('node:fs');

  const config: MCPConfigFile = {
    mcpServers: {},
  };

  for (const server of servers) {
    config.mcpServers![server.name] = {
      command: server.command,
      args: server.args,
      env: server.env,
      url: server.url,
      transport: server.transport,
      autoStart: server.autoStart,
      headers: server.headers,
      timeout: server.timeout,
      disabled: server.disabled,
      description: server.description,
    };
  }

  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    const fs = require('node:fs');
    fs.mkdirSync(dir, { recursive: true });
  }

  const fsWrite = require('node:fs');
  fsWrite.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

export function getDefaultMCPConfigPaths(): string[] {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '~';
  return [
    resolve(home, '.claude', 'mcp.json'),
    resolve(home, '.claude', 'mcp-config.json'),
    resolve(home, '.tcoder', 'mcp.json'),
    resolve(process.cwd(), '.claude', 'mcp.json'),
    resolve(process.cwd(), '.tcoder', 'mcp.json'),
  ];
}

export function discoverMCPConfigs(): MCPServerConfig[] {
  const seen = new Set<string>();
  const allServers: MCPServerConfig[] = [];

  for (const path of getDefaultMCPConfigPaths()) {
    const servers = loadMCPConfig(path);
    for (const server of servers) {
      if (!seen.has(server.name)) {
        seen.add(server.name);
        allServers.push(server);
      }
    }
  }

  return allServers;
}

export function validateMDPServerConfig(config: MCPServerConfig): string[] {
  const errors: string[] = [];

  if (!config.name || config.name.trim() === '') {
    errors.push('Server name is required');
  }

  if (!config.command && !config.url) {
    errors.push('Either command or url is required');
  }

  if (config.transport === 'stdio' && !config.command) {
    errors.push('Stdio transport requires a command');
  }

  if ((config.transport === 'sse' || config.transport === 'websocket') && !config.url) {
    errors.push('SSE/WebSocket transport requires a URL');
  }

  return errors;
}

export function mergeMCPConfigs(...configs: MCPServerConfig[][]): MCPServerConfig[] {
  const merged = new Map<string, MCPServerConfig>();

  for (const configList of configs) {
    for (const config of configList) {
      const existing = merged.get(config.name);
      if (!existing) {
        merged.set(config.name, { ...config });
      } else {
        // Merge: later configs override earlier ones
        merged.set(config.name, { ...existing, ...config });
      }
    }
  }

  return Array.from(merged.values());
}
