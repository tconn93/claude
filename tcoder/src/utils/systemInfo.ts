import { getPlatform, getArch, getOSVersion, getShellType, getNodeVersion, getRuntime } from './platform.ts';
import { getCurrentBranch, isGitRepository } from './git/branch.ts';

export interface SystemInfo {
  platform: string;
  arch: string;
  osVersion: string;
  shell: string;
  nodeVersion: string;
  runtime: string;
  cwd: string;
  home: string;
  temp: string;
  gitBranch: string | null;
  isGitRepo: boolean;
  memory: { total: number; free: number };
  cpuCount: number;
  uptime: number;
  hostname: string;
  user: string;
  pid: number;
}

let cachedInfo: SystemInfo | null = null;

export async function getSystemInfo(): Promise<SystemInfo> {
  if (cachedInfo) return cachedInfo;

  const info: SystemInfo = {
    platform: getPlatform(),
    arch: getArch(),
    osVersion: getOSVersion(),
    shell: getShellType(),
    nodeVersion: getNodeVersion(),
    runtime: getRuntime(),
    cwd: process.cwd(),
    home: process.env.HOME ?? process.env.USERPROFILE ?? '/tmp',
    temp: process.env.TMPDIR ?? process.env.TEMP ?? '/tmp',
    gitBranch: null,
    isGitRepo: false,
    memory: { total: 0, free: 0 },
    cpuCount: 1,
    uptime: 0,
    hostname: 'unknown',
    user: process.env.USER ?? process.env.USERNAME ?? 'unknown',
    pid: process.pid,
  };

  try {
    const { totalmem, freemem, cpus, uptime, hostname } = await import('node:os');

    info.memory = {
      total: totalmem(),
      free: freemem(),
    };

    const cpuList = cpus();
    info.cpuCount = cpuList.length;

    info.uptime = uptime();
    info.hostname = hostname();
  } catch {
    // Use defaults
  }

  try {
    const isRepo = await isGitRepository();
    info.isGitRepo = isRepo;

    if (isRepo) {
      const branch = await getCurrentBranch();
      info.gitBranch = branch;
    }
  } catch {
    // Git not available
  }

  cachedInfo = info;
  return info;
}

export function getSystemInfoSync(): Partial<SystemInfo> {
  return {
    platform: getPlatform(),
    arch: getArch(),
    runtime: getRuntime(),
    cwd: process.cwd(),
    hostname: (() => {
      try {
        const { hostname } = require('node:os');
        return hostname();
      } catch {
        return 'unknown';
      }
    })(),
    pid: process.pid,
  };
}

export function clearSystemInfoCache(): void {
  cachedInfo = null;
}

export function formatSystemInfo(info: SystemInfo): string {
  const lines: string[] = [
    `Platform:    ${info.platform} (${info.arch})`,
    `OS:          ${info.osVersion}`,
    `Shell:       ${info.shell}`,
    `Node:        ${info.nodeVersion}`,
    `Runtime:     ${info.runtime}`,
    `CWD:         ${info.cwd}`,
    `Home:        ${info.home}`,
    `Temp:        ${info.temp}`,
    `Hostname:    ${info.hostname}`,
    `User:        ${info.user}`,
    `PID:         ${info.pid}`,
    `Uptime:      ${Math.round(info.uptime)}s`,
    `Memory:      ${formatBytes(info.memory.total)} total / ${formatBytes(info.memory.free)} free`,
    `CPU Cores:   ${info.cpuCount}`,
    `Git Repo:    ${info.isGitRepo ? 'yes' : 'no'}`,
  ];

  if (info.gitBranch) {
    lines.push(`Git Branch:  ${info.gitBranch}`);
  }

  return lines.join('\n');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(1)} ${units[i]}`;
}
