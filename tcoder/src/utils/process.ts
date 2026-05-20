export function exitWithError(message: string, exitCode = 1): never {
  process.stderr.write(`${message}\n`);
  process.exit(exitCode);
}

export function exitWithSuccess(message?: string): never {
  if (message) {
    process.stdout.write(`${message}\n`);
  }
  process.exit(0);
}

export function ensureProcessNotExited(): void {
  // Prevent Node from exiting due to empty event loop
  process.stdin.resume();
}

export function getProcessUptime(): number {
  return process.uptime();
}

export function getMemoryUsage(): { rss: number; heapTotal: number; heapUsed: number; external: number } {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
  };
}

export function getCPUUsage(): { user: number; system: number } {
  const usage = process.cpuUsage();
  return {
    user: usage.user,
    system: usage.system,
  };
}

export function getProcessTitle(): string {
  return process.title;
}

export function setProcessTitle(title: string): void {
  process.title = title;
}

export function getPID(): number {
  return process.pid;
}

export function getParentPID(): number {
  return process.ppid;
}

export function getNodeVersion(): string {
  return process.version;
}

export function getExecArgv(): string[] {
  return process.execArgv;
}

export function isRunning(): boolean {
  try {
    process.cwd();
    return true;
  } catch {
    return false;
  }
}

export function getResourceUsage(): Record<string, number> {
  const usage = process.resourceUsage();
  return {
    userCPUTime: usage.userCPUTime,
    systemCPUTime: usage.systemCPUTime,
    maxRSS: usage.maxRSS,
    fsRead: usage.fsRead,
    fsWrite: usage.fsWrite,
    ipcSent: usage.ipcSent,
    ipcReceived: usage.ipcReceived,
    signalsCount: usage.signalsCount,
    voluntaryContextSwitches: usage.voluntaryContextSwitches,
    involuntaryContextSwitches: usage.involuntaryContextSwitches,
  };
}
