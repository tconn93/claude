import { execa, type Options as ExecaOptions, type Result as ExecaResult } from 'execa';
import { APP_NAME } from '../constants/common.ts';

export type ShellType = 'bash' | 'zsh' | 'fish' | 'powershell' | 'cmd' | 'unknown';

export interface ShellInfo {
  type: ShellType;
  path: string;
  version: string;
  isInteractive: boolean;
  env: Record<string, string>;
}

export interface ShellCommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  stdin?: string;
  maxOutput?: number;
}

export interface ShellCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  killed: boolean;
}

export function detectShell(): ShellInfo {
  const shellEnv = process.env.SHELL ?? process.env.COMSPEC ?? '';
  const type = classifyShell(shellEnv);

  return {
    type,
    path: shellEnv,
    version: '',
    isInteractive: process.stdin.isTTY ?? false,
    env: process.env as Record<string, string>,
  };
}

function classifyShell(shellPath: string): ShellType {
  const normalized = shellPath.toLowerCase();
  if (normalized.includes('bash')) return 'bash';
  if (normalized.includes('zsh')) return 'zsh';
  if (normalized.includes('fish')) return 'fish';
  if (normalized.includes('powershell') || normalized.includes('pwsh')) return 'powershell';
  if (normalized.includes('cmd.exe') || normalized.includes('command.com')) return 'cmd';
  return 'unknown';
}

export function getShellCommand(shellType: ShellType): string {
  switch (shellType) {
    case 'bash': return 'bash';
    case 'zsh': return 'zsh';
    case 'fish': return 'fish';
    case 'powershell': return 'powershell';
    case 'cmd': return 'cmd.exe';
    default: return 'bash';
  }
}

export function getShellFlag(shellType: ShellType, flag: 'command' | 'login' | 'interactive'): string {
  const flags: Record<ShellType, Record<string, string>> = {
    bash: { command: '-c', login: '-l', interactive: '-i' },
    zsh: { command: '-c', login: '-l', interactive: '-i' },
    fish: { command: '-c', login: '--login', interactive: '--interactive' },
    powershell: { command: '-Command', login: '-Login', interactive: '' },
    cmd: { command: '/C', login: '', interactive: '' },
    unknown: { command: '-c', login: '', interactive: '' },
  };
  return flags[shellType][flag] ?? '-c';
}

export async function executeShellCommand(
  command: string,
  options: ShellCommandOptions = {},
): Promise<ShellCommandResult> {
  const execaOptions: ExecaOptions = {
    cwd: options.cwd,
    env: options.env,
    timeout: options.timeout,
    cancelSignal: options.signal,
    input: options.stdin,
    maxBuffer: options.maxOutput ?? 10 * 1024 * 1024,
    shell: true,
    reject: false,
    all: true,
  };

  let result: ExecaResult;

  try {
    result = await execa(command, { ...execaOptions, shell: true });
  } catch (err: unknown) {
    const execaErr = err as { stdout?: string; stderr?: string; exitCode?: number; isCanceled?: boolean; timedOut?: boolean; isTerminated?: boolean };
    return {
      stdout: execaErr.stdout ?? '',
      stderr: execaErr.stderr ?? '',
      exitCode: execaErr.exitCode ?? 1,
      timedOut: execaErr.timedOut ?? false,
      killed: execaErr.isCanceled ?? execaErr.isTerminated ?? false,
    };
  }

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    killed: result.isCanceled ?? result.isTerminated ?? false,
  };
}

export function shellQuote(arg: string, shellType: ShellType = 'bash'): string {
  if (shellType === 'powershell' || shellType === 'cmd') {
    if (arg.includes(' ')) {
      return `"${arg.replace(/"/g, '`"')}"`;
    }
    return arg;
  }
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

export function buildCommand(args: string[], shellType: ShellType = 'bash'): string {
  return args.map(a => shellQuote(a, shellType)).join(' ');
}

export function getAppDataDir(): string {
  const platform = process.platform;
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/tmp';

  if (platform === 'darwin') {
    return `${home}/Library/Application Support/${APP_NAME}`;
  }
  if (platform === 'win32') {
    return `${process.env.APPDATA ?? home}\\${APP_NAME}`;
  }
  const xdg = process.env.XDG_DATA_HOME ?? `${home}/.local/share`;
  return `${xdg}/${APP_NAME}`;
}

export function getShellConfigPath(shellType: ShellType): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/tmp';
  switch (shellType) {
    case 'bash': return `${home}/.bashrc`;
    case 'zsh': return `${home}/.zshrc`;
    case 'fish': return `${home}/.config/fish/config.fish`;
    case 'powershell': return `${home}/Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1`;
    default: return `${home}/.bashrc`;
  }
}
