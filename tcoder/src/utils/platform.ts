export type Platform = 'linux' | 'darwin' | 'win32' | 'unknown';

export function getPlatform(): Platform {
  const plat = process.platform;
  if (plat === 'linux') return 'linux';
  if (plat === 'darwin') return 'darwin';
  if (plat === 'win32') return 'win32';
  return 'unknown';
}

export function isWindows(): boolean {
  return process.platform === 'win32';
}

export function isMacOS(): boolean {
  return process.platform === 'darwin';
}

export function isLinux(): boolean {
  return process.platform === 'linux';
}

export function isWSL(): boolean {
  if (!isLinux()) return false;
  try {
    const { readFileSync } = require('node:fs');
    const version = readFileSync('/proc/version', 'utf-8');
    return version.toLowerCase().includes('microsoft') || version.toLowerCase().includes('wsl');
  } catch {
    return false;
  }
}

export function getArch(): string {
  return process.arch;
}

export function getNodeVersion(): string {
  return process.version;
}

export function getBunVersion(): string {
  return process.versions.bun ?? '0.0.0';
}

export function getRuntime(): 'node' | 'bun' | 'deno' | 'unknown' {
  if (typeof (globalThis as Record<string, unknown>).Bun !== 'undefined') return 'bun';
  if (typeof (globalThis as Record<string, unknown>).Deno !== 'undefined') return 'deno';
  if (typeof process !== 'undefined' && process.versions?.node) return 'node';
  return 'unknown';
}

export function getShellType(): string {
  const shell = process.env.SHELL ?? process.env.COMSPEC ?? '';
  const name = shell.split('/').pop()?.split('\\').pop() ?? '';

  if (name.includes('bash')) return 'bash';
  if (name.includes('zsh')) return 'zsh';
  if (name.includes('fish')) return 'fish';
  if (name.toLowerCase().includes('powershell')) return 'powershell';
  if (name.includes('cmd')) return 'cmd';
  return 'unknown';
}

export function getHomeDir(): string {
  if (isWindows()) {
    return process.env.USERPROFILE ?? process.env.HOMEDRIVE + (process.env.HOMEPATH ?? '') ?? '/tmp';
  }
  return process.env.HOME ?? '/tmp';
}

export function getTempDir(): string {
  if (isWindows()) {
    return process.env.TEMP ?? process.env.TMP ?? `${getHomeDir()}/AppData/Local/Temp`;
  }
  return process.env.TMPDIR ?? '/tmp';
}

export function getOSVersion(): string {
  try {
    const { release } = require('node:os');
    return release();
  } catch {
    return 'unknown';
  }
}

export function getSystemMemory(): { total: number; free: number } {
  try {
    const { totalmem, freemem } = require('node:os');
    return {
      total: totalmem(),
      free: freemem(),
    };
  } catch {
    return { total: 0, free: 0 };
  }
}

export function getCPUCount(): number {
  try {
    const { cpus } = require('node:os');
    return cpus().length;
  } catch {
    return 1;
  }
}
