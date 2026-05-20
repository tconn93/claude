import type { ShellType } from '../shell.ts';

export interface BashEnvironment {
  shell: string;
  home: string;
  path: string;
  user: string;
  pwd: string;
  term: string;
  editor: string;
  lang: string;
  extra: Record<string, string>;
}

export function getBashEnvironment(shellType?: ShellType): BashEnvironment {
  const env = process.env;

  return {
    shell: env.SHELL ?? env.COMSPEC ?? (shellType ?? 'bash'),
    home: env.HOME ?? env.USERPROFILE ?? '/tmp',
    path: env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
    user: env.USER ?? env.USERNAME ?? 'unknown',
    pwd: process.cwd(),
    term: env.TERM ?? 'xterm-256color',
    editor: env.EDITOR ?? env.VISUAL ?? 'vi',
    lang: env.LANG ?? env.LC_ALL ?? 'en_US.UTF-8',
    extra: {},
  };
}

export function buildEnvVars(
  overrides: Partial<BashEnvironment> = {},
  extra: Record<string, string> = {},
): Record<string, string> {
  const base = getBashEnvironment();
  const merged: Record<string, string> = {
    SHELL: overrides.shell ?? base.shell,
    HOME: overrides.home ?? base.home,
    PATH: overrides.path ?? base.path,
    USER: overrides.user ?? base.user,
    PWD: overrides.pwd ?? base.pwd,
    TERM: overrides.term ?? base.term,
    EDITOR: overrides.editor ?? base.editor,
    LANG: overrides.lang ?? base.lang,
    ...extra,
  };
  return merged;
}

export function mergeEnv(base: Record<string, string>, overlay: Record<string, string>): Record<string, string> {
  return { ...base, ...overlay };
}

export function filterSensitiveEnv(env: Record<string, string>): Record<string, string> {
  const sensitiveKeys = [
    'TOKEN', 'SECRET', 'PASSWORD', 'PASSWD', 'KEY', 'CREDENTIAL',
    'AUTH', 'CERT', 'PRIVATE', 'API_KEY', 'ACCESS_TOKEN',
  ];

  const filtered: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    const upperKey = key.toUpperCase();
    const isSensitive = sensitiveKeys.some(s => upperKey.includes(s));

    if (isSensitive) {
      filtered[key] = '***REDACTED***';
    } else {
      filtered[key] = value;
    }
  }

  return filtered;
}

export function parseDotEnv(content: string): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    value = value.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

    if (key) {
      vars[key] = value;
    }
  }

  return vars;
}

export function toExportStatements(env: Record<string, string>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(env)) {
    const escaped = value.replace(/'/g, "'\\''");
    lines.push(`export ${key}='${escaped}'`);
  }

  return lines.join('\n');
}

export function toEnvFile(env: Record<string, string>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(env)) {
    if (value.includes('\n') || value.includes('"')) {
      const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      lines.push(`${key}="${escaped}"`);
    } else if (value.includes(' ') || value.includes('#')) {
      lines.push(`${key}="${value}"`);
    } else {
      lines.push(`${key}=${value}`);
    }
  }

  return lines.join('\n');
}
