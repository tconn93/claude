import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { getAppDataDir, detectShell, getShellConfigPath, type ShellInfo } from './utils/shell.ts';
import { APP_NAME, APP_VERSION, DEFAULT_MODEL, CLAUDE_CONFIG_DIR } from './constants/common.ts';

export interface SetupResult {
  success: boolean;
  message: string;
  steps: SetupStep[];
}

export interface SetupStep {
  name: string;
  status: 'ok' | 'skipped' | 'error';
  message: string;
}

export interface SetupContext {
  firstRun: boolean;
  configExists: boolean;
  dataDir: string;
  configDir: string;
  shell: ShellInfo;
  hasApiKey: boolean;
}

export function checkSetupStatus(): SetupContext {
  const dataDir = getAppDataDir();
  const configDir = resolve(dataDir, 'config.json');
  const shell = detectShell();

  return {
    firstRun: !existsSync(dataDir) || !existsSync(configDir),
    configExists: existsSync(configDir),
    dataDir,
    configDir,
    shell,
    hasApiKey: hasApiKey(),
  };
}

export function hasApiKey(): boolean {
  return !!(process.env.XAI_API_KEY || process.env.XAI_API_KEY);
}

export function runSetup(interactive = true): SetupResult {
  const steps: SetupStep[] = [];
  const context: SetupContext = {
    firstRun: !existsSync(getAppDataDir()),
    configExists: false,
    dataDir: getAppDataDir(),
    configDir: resolve(getAppDataDir(), 'config.json'),
    shell: detectShell(),
    hasApiKey: hasApiKey(),
  };

  // Step 1: Create data directory
  try {
    if (!existsSync(context.dataDir)) {
      mkdirSync(context.dataDir, { recursive: true });
      steps.push({ name: 'Data directory', status: 'ok', message: `Created: ${context.dataDir}` });
    } else {
      steps.push({ name: 'Data directory', status: 'ok', message: `Exists: ${context.dataDir}` });
    }
  } catch (err) {
    steps.push({ name: 'Data directory', status: 'error', message: String(err) });
    return { success: false, message: 'Failed to create data directory', steps };
  }

  // Step 2: Create config
  context.configExists = existsSync(context.configDir);
  if (!context.configExists) {
    try {
      const defaultConfig = createDefaultConfig();
      writeFileSync(context.configDir, JSON.stringify(defaultConfig, null, 2), 'utf-8');
      steps.push({ name: 'Config file', status: 'ok', message: `Created: ${context.configDir}` });
    } catch (err) {
      steps.push({ name: 'Config file', status: 'error', message: String(err) });
      return { success: false, message: 'Failed to create config', steps };
    }
  } else {
    steps.push({ name: 'Config file', status: 'ok', message: `Exists: ${context.configDir}` });
  }

  // Step 3: API key check
  if (context.hasApiKey) {
    steps.push({ name: 'API key', status: 'ok', message: 'Found in environment' });
  } else {
    steps.push({
      name: 'API key',
      status: 'error',
      message: 'Set XAI_API_KEY or XAI_API_KEY environment variable',
    });
    if (!interactive) {
      return { success: false, message: 'API key not found', steps };
    }
  }

  // Step 4: Create sessions directory
  const sessionsDir = resolve(context.dataDir, 'sessions');
  if (!existsSync(sessionsDir)) {
    try {
      mkdirSync(sessionsDir, { recursive: true });
      steps.push({ name: 'Sessions directory', status: 'ok', message: `Created: ${sessionsDir}` });
    } catch (err) {
      steps.push({ name: 'Sessions directory', status: 'error', message: String(err) });
    }
  } else {
    steps.push({ name: 'Sessions directory', status: 'ok', message: `Exists: ${sessionsDir}` });
  }

  return {
    success: context.hasApiKey || interactive,
    message: context.hasApiKey
      ? 'Setup complete'
      : 'Setup complete. Set XAI_API_KEY to start using tcoder.',
    steps,
  };
}

function createDefaultConfig(): Record<string, unknown> {
  return {
    app: APP_NAME,
    version: APP_VERSION,
    model: DEFAULT_MODEL,
    permissionMode: 'default',
    theme: 'system',
    editor: process.env.EDITOR ?? 'vim',
    createdAt: new Date().toISOString(),
    settings: {
      compactThreshold: 400,
      maxToolCallsPerTurn: 50,
      sandboxTimeout: 120000,
      hookTimeout: 60000,
    },
  };
}

export function getWelcomeMessage(): string {
  return `
  ╔═══════════════════════════════════════════╗
  ║           Welcome to tcoder v${APP_VERSION}          ║
  ║     Terminal-based AI coding assistant   ║
  ╚═══════════════════════════════════════════╝

  Type a message and press Enter to ask Claude.
  Use /help to see available commands.
  Use /exit or Ctrl+C to quit.

  Model: ${DEFAULT_MODEL}
  Help:  /help
  `.trim();
}

export function printWelcome(setupResult: SetupResult): void {
  console.log(getWelcomeMessage());
  console.log();

  if (!setupResult.success) {
    const apiKeyStep = setupResult.steps.find(s => s.name === 'API key');
    if (apiKeyStep && apiKeyStep.status === 'error') {
      console.log('\x1b[33m%s\x1b[0m', 'Warning: No API key found. Set XAI_API_KEY environment variable.');
      console.log();
    }
  }

  console.log(`Session data: ${getAppDataDir()}`);
  console.log();
}

function createDefaultMcpConfig(): Record<string, unknown> {
  return {
    mcpServers: {},
  };
}

export function ensureMcpConfig(): string {
  const dataDir = getAppDataDir();
  const mcpConfigPath = resolve(dataDir, 'mcp.json');

  if (!existsSync(mcpConfigPath)) {
    try {
      writeFileSync(mcpConfigPath, JSON.stringify(createDefaultMcpConfig(), null, 2), 'utf-8');
    } catch {
      // Best effort
    }
  }

  return mcpConfigPath;
}
