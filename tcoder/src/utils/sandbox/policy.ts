export type PolicyLevel = 'permissive' | 'standard' | 'strict' | 'locked';

export interface SandboxPolicy {
  level: PolicyLevel;
  allowNetwork: boolean;
  allowFileSystem: boolean;
  allowWrite: boolean;
  allowDelete: boolean;
  allowProcess: boolean;
  allowedPaths: string[];
  blockedPaths: string[];
  allowedCommands: string[];
  blockedCommands: string[];
  envVars: Record<string, string>;
}

const POLICIES: Record<PolicyLevel, SandboxPolicy> = {
  permissive: {
    level: 'permissive',
    allowNetwork: true,
    allowFileSystem: true,
    allowWrite: true,
    allowDelete: true,
    allowProcess: true,
    allowedPaths: ['/'],
    blockedPaths: ['/etc/passwd', '/etc/shadow', '/etc/sudoers'],
    allowedCommands: ['*'],
    blockedCommands: ['sudo', 'su', 'reboot', 'shutdown'],
    envVars: {},
  },
  standard: {
    level: 'standard',
    allowNetwork: true,
    allowFileSystem: true,
    allowWrite: true,
    allowDelete: false,
    allowProcess: true,
    allowedPaths: [],
    blockedPaths: [
      '/etc/passwd', '/etc/shadow', '/etc/sudoers',
      '~/.ssh', '~/.gnupg', '~/.aws/credentials',
    ],
    allowedCommands: [],
    blockedCommands: [
      'sudo', 'su', 'reboot', 'shutdown', 'halt', 'poweroff',
      'mkfs', 'fdisk', 'dd', 'chown', 'passwd',
    ],
    envVars: {},
  },
  strict: {
    level: 'strict',
    allowNetwork: false,
    allowFileSystem: true,
    allowWrite: false,
    allowDelete: false,
    allowProcess: true,
    allowedPaths: [],
    blockedPaths: ['/etc', '/sys', '/proc', '/dev', '~/.ssh', '~/.gnupg'],
    allowedCommands: [
      'ls', 'cat', 'head', 'tail', 'grep', 'find', 'echo',
      'git', 'npm', 'yarn', 'pnpm', 'bun', 'node',
      'python', 'python3', 'pip', 'pip3',
      'curl', 'wget',
      'tar', 'gzip', 'gunzip', 'zip', 'unzip',
      'git', 'gh',
    ],
    blockedCommands: [
      'sudo', 'su', 'rm', 'mv', 'cp', 'chmod', 'chown',
      'kill', 'killall', 'pkill',
      'reboot', 'shutdown', 'halt',
    ],
    envVars: {},
  },
  locked: {
    level: 'locked',
    allowNetwork: false,
    allowFileSystem: true,
    allowWrite: false,
    allowDelete: false,
    allowProcess: false,
    allowedPaths: [],
    blockedPaths: ['*'],
    allowedCommands: ['ls', 'cat', 'head', 'tail', 'grep', 'find', 'echo', 'pwd'],
    blockedCommands: ['*'],
    envVars: {},
  },
};

export function getPolicy(level: PolicyLevel): SandboxPolicy {
  return { ...POLICIES[level] };
}

export function getAllPolicies(): Record<PolicyLevel, SandboxPolicy> {
  return structuredClone(POLICIES);
}

export function isPathAllowed(policy: SandboxPolicy, path: string): boolean {
  if (policy.blockedPaths.includes('*')) return false;

  for (const blocked of policy.blockedPaths) {
    if (matchPath(blocked, path)) return false;
  }

  if (policy.allowedPaths.length === 0 || policy.allowedPaths.includes('/')) return true;

  for (const allowed of policy.allowedPaths) {
    if (matchPath(allowed, path)) return true;
  }

  return false;
}

export function isCommandAllowed(policy: SandboxPolicy, command: string): boolean {
  if (policy.allowedCommands.includes('*')) {
    return !policy.blockedCommands.includes(command);
  }

  if (policy.blockedCommands.includes('*')) {
    return policy.allowedCommands.includes(command);
  }

  if (policy.blockedCommands.includes(command)) return false;

  if (policy.allowedCommands.length === 0) return true;

  return policy.allowedCommands.includes(command);
}

function matchPath(pattern: string, path: string): boolean {
  const expandedPattern = pattern.replace(/^~/, process.env.HOME ?? '/home/user');
  const expandedPath = path.replace(/^~/, process.env.HOME ?? '/home/user');

  if (expandedPattern === expandedPath) return true;

  if (expandedPattern.endsWith('/*')) {
    const parent = expandedPattern.slice(0, -2);
    return expandedPath.startsWith(parent + '/') || expandedPath === parent;
  }

  return expandedPath.startsWith(expandedPattern + '/') || expandedPath === expandedPattern;
}

export function createCustomPolicy(
  base: PolicyLevel,
  overrides: Partial<SandboxPolicy>,
): SandboxPolicy {
  return { ...POLICIES[base], ...overrides, level: base };
}

export function policyLevelFromString(str: string): PolicyLevel | null {
  const levels: PolicyLevel[] = ['permissive', 'standard', 'strict', 'locked'];
  return levels.includes(str as PolicyLevel) ? (str as PolicyLevel) : null;
}
