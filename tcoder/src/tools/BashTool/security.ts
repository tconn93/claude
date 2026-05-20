const BLOCKED_COMMANDS = new Set([
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  'init',
  'systemctl shutdown',
  'systemctl reboot',
  'systemctl poweroff',
  'rm -rf /',
  'rm -rf --no-preserve-root',
  'dd if=',
  'mkfs.',
  ':(){ :|:& };:',
  'chmod 777 /',
  'chown -R',
  '> /dev/sda',
]);

const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\/(\s|$)/,
  /rm\s+-rf\s+--no-preserve-root/,
  /dd\s+if=/i,
  /mkfs\.\w+/,
  /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
  />\s*\/dev\/sd[a-z]/,
  />\s*\/dev\/nvme/,
  /chmod\s+777\s+\//,
  /chown\s+-R\s+\w+\s+\//,
  /curl.*\|\s*(ba)?sh/,
  /wget.*\|\s*(ba)?sh/,
];

const DANGEROUS_FLAGS = [
  '--no-preserve-root',
  '--no-verify',
  '-f',
];

export function isBlockedCommand(command: string): { blocked: boolean; reason?: string } {
  const trimmed = command.trim().toLowerCase();

  for (const blocked of BLOCKED_COMMANDS) {
    if (trimmed === blocked || trimmed.startsWith(blocked + ' ')) {
      return { blocked: true, reason: `Command "${blocked}" is blocked for safety` };
    }
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { blocked: true, reason: `Command matches blocked pattern: ${pattern.source}` };
    }
  }

  return { blocked: false };
}

export function sanitizeCommand(command: string): string {
  return command
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

export function getSafeShell(): string {
  return process.env.SHELL || '/bin/bash';
}

export function buildShellArgs(command: string): string[] {
  return ['-c', command];
}

export function parseEnvString(env: Record<string, string> | undefined): Record<string, string> {
  const base: Record<string, string> = {
    HOME: process.env.HOME || '/root',
    USER: process.env.USER || 'user',
    PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
    LANG: process.env.LANG || 'en_US.UTF-8',
  };

  if (env) {
    return { ...base, ...env };
  }

  return base;
}
