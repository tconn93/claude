import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export function findGitRoot(startPath: string): string | null {
  let current = resolve(startPath);
  for (let i = 0; i < 100; i++) {
    const gitDir = resolve(current, '.git');
    if (existsSync(gitDir)) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

export function getGitBranch(cwd: string): string | null {
  try {
    const result = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    return result || null;
  } catch {
    return null;
  }
}

export function getGitStatus(cwd: string): string | null {
  try {
    const result = execSync('git status --porcelain', {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
    });
    return result || null;
  } catch {
    return null;
  }
}

export function getGitRoot(cwd: string): string | null {
  try {
    const result = execSync('git rev-parse --show-toplevel', {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    return result || null;
  } catch {
    return null;
  }
}

export function getGitRemote(cwd: string): string | null {
  try {
    const result = execSync('git remote get-url origin', {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    return result || null;
  } catch {
    return null;
  }
}

export function getGitDiff(cwd: string, staged = false): string | null {
  try {
    const args = staged ? ['diff', '--staged'] : ['diff'];
    const result = execSync(`git ${args.join(' ')}`, {
      cwd,
      encoding: 'utf-8',
      timeout: 10000,
    });
    return result || null;
  } catch {
    return null;
  }
}

export function getGitLog(cwd: string, count = 10): string | null {
  try {
    const result = execSync(`git log --oneline -${count}`, {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
    });
    return result || null;
  } catch {
    return null;
  }
}

export function getStagedFiles(cwd: string): string[] {
  try {
    const result = execSync('git diff --staged --name-only', {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    return result ? result.split('\n') : [];
  } catch {
    return [];
  }
}

export function getModifiedFiles(cwd: string): string[] {
  try {
    const result = execSync('git diff --name-only', {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    return result ? result.split('\n') : [];
  } catch {
    return [];
  }
}

export function getUntrackedFiles(cwd: string): string[] {
  try {
    const result = execSync('git ls-files --others --exclude-standard', {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    return result ? result.split('\n') : [];
  } catch {
    return [];
  }
}

export function isGitRepo(cwd: string): boolean {
  try {
    execSync('git rev-parse --git-dir', {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

export interface GitInfo {
  isRepo: boolean;
  root: string | null;
  branch: string | null;
  remote: string | null;
  hasChanges: boolean;
  stagedFiles: string[];
  modifiedFiles: string[];
  untrackedFiles: string[];
}

export function getGitInfo(cwd: string): GitInfo {
  const root = getGitRoot(cwd);
  const stagedFiles = getStagedFiles(cwd);
  const modifiedFiles = getModifiedFiles(cwd);
  const untrackedFiles = getUntrackedFiles(cwd);

  return {
    isRepo: root !== null,
    root,
    branch: getGitBranch(cwd),
    remote: getGitRemote(cwd),
    hasChanges: stagedFiles.length > 0 || modifiedFiles.length > 0 || untrackedFiles.length > 0,
    stagedFiles,
    modifiedFiles,
    untrackedFiles,
  };
}
