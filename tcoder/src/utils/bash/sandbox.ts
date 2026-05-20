import { APP_NAME, SANDBOX_TIMEOUT } from '../../constants/common.ts';
import { isDangerousCommand } from './parser.ts';

export interface SandboxOptions {
  timeout?: number;
  allowedCommands?: string[];
  blockedCommands?: string[];
  maxOutputBytes?: number;
  env?: Record<string, string>;
  cwd?: string;
}

export interface SandboxDecision {
  allowed: boolean;
  reason?: string;
  sanitizedCommand?: string;
}

const DEFAULT_BLOCKED_COMMANDS = [
  'sudo',
  'su',
  'reboot',
  'shutdown',
  'halt',
  'poweroff',
  'init',
  'systemctl',
  'service',
  'killall',
  'pkill',
  'kill',
  'passwd',
  'chown',
  'mount',
  'umount',
  'fdisk',
  'mkfs',
  'dd',
  'crontab',
  'at',
  'batch',
];

const DEFAULT_ALLOWED_COMMANDS = [
  'ls', 'cat', 'head', 'tail', 'grep', 'find', 'echo', 'printf',
  'cd', 'pwd', 'mkdir', 'touch', 'cp', 'mv', 'rm', 'chmod', 'chown',
  'sort', 'uniq', 'wc', 'tr', 'cut', 'sed', 'awk', 'xargs',
  'git', 'npm', 'yarn', 'pnpm', 'bun', 'node', 'tsc', 'esbuild',
  'python', 'python3', 'pip', 'pip3',
  'curl', 'wget', 'gh', 'docker', 'docker-compose',
  'cargo', 'rustc', 'go', 'java', 'javac', 'make', 'cmake',
  'tar', 'gzip', 'gunzip', 'zip', 'unzip',
  'ssh', 'scp', 'rsync',
  'ps', 'top', 'htop', 'df', 'du', 'free',
  'which', 'whereis', 'type', 'command',
];

export function evaluateSandbox(
  command: string,
  options: SandboxOptions = {},
): SandboxDecision {
  if (isDangerousCommand(command)) {
    return { allowed: false, reason: `Dangerous command pattern detected: ${command.slice(0, 80)}` };
  }

  const commandName = extractCommandName(command);

  if (options.blockedCommands) {
    if (options.blockedCommands.includes(commandName)) {
      return { allowed: false, reason: `Command '${commandName}' is blocked by configuration` };
    }
  }

  const blocked = options.blockedCommands ?? DEFAULT_BLOCKED_COMMANDS;
  if (blocked.includes(commandName)) {
    return { allowed: false, reason: `Command '${commandName}' is blocked by default sandbox policy` };
  }

  if (options.allowedCommands && !options.allowedCommands.includes(commandName)) {
    const allowed = options.allowedCommands ?? DEFAULT_ALLOWED_COMMANDS;
    if (!allowed.includes(commandName)) {
      return { allowed: false, reason: `Command '${commandName}' is not in the allowed list` };
    }
  }

  return { allowed: true, sanitizedCommand: command };
}

export function extractCommandName(command: string): string {
  const trimmed = command.trim();
  const firstSpace = trimmed.search(/\s/);
  const name = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
  const slashIndex = name.lastIndexOf('/');
  return slashIndex === -1 ? name : name.slice(slashIndex + 1);
}

export function sanitizeCommand(command: string): string {
  return command
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[^\x20-\x7E\n\t]/g, '')
    .trim();
}

export function getDefaultSandboxOptions(): SandboxOptions {
  return {
    timeout: SANDBOX_TIMEOUT,
    allowedCommands: [...DEFAULT_ALLOWED_COMMANDS],
    blockedCommands: [...DEFAULT_BLOCKED_COMMANDS],
    maxOutputBytes: 10 * 1024 * 1024,
  };
}

export function createSandboxEnvironment(baseEnv?: Record<string, string>): Record<string, string> {
  return {
    HOME: baseEnv?.HOME ?? process.env.HOME ?? '/tmp',
    PATH: baseEnv?.PATH ?? process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
    LANG: baseEnv?.LANG ?? 'en_US.UTF-8',
    PWD: baseEnv?.PWD ?? process.cwd(),
    USER: baseEnv?.USER ?? process.env.USER ?? 'tcoder',
    TERM: baseEnv?.TERM ?? process.env.TERM ?? 'xterm-256color',
    TMPDIR: baseEnv?.TMPDIR ?? process.env.TMPDIR ?? '/tmp',
    TMP: baseEnv?.TMP ?? process.env.TMP ?? '/tmp',
    TEMP: baseEnv?.TEMP ?? process.env.TEMP ?? '/tmp',
  };
}

export function canRunInSandbox(command: string): boolean {
  const decision = evaluateSandbox(command);
  return decision.allowed;
}
