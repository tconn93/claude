import { executeShellCommand } from '../shell.ts';

export interface GitWorktree {
  path: string;
  branch: string;
  hash: string;
  isBare: boolean;
  isDetached: boolean;
}

export async function listWorktrees(cwd?: string): Promise<GitWorktree[]> {
  const result = await executeShellCommand(
    'git worktree list --porcelain',
    { cwd, timeout: 10_000 },
  );

  if (result.exitCode !== 0) return [];
  return parseWorktreeList(result.stdout);
}

function parseWorktreeList(output: string): GitWorktree[] {
  const worktrees: GitWorktree[] = [];
  const blocks = output.trim().split('\n\n').filter(Boolean);

  for (const block of blocks) {
    const lines = block.split('\n');
    const wt: Partial<GitWorktree> = {};

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        wt.path = line.slice(9);
      } else if (line.startsWith('HEAD ')) {
        wt.hash = line.slice(5);
      } else if (line.startsWith('branch ')) {
        wt.branch = line.slice(7).replace('refs/heads/', '');
      } else if (line.startsWith('bare')) {
        wt.isBare = true;
      } else if (line.startsWith('detached')) {
        wt.isDetached = true;
      }
    }

    if (wt.path) {
      worktrees.push({
        path: wt.path,
        branch: wt.branch ?? 'detached',
        hash: wt.hash ?? '',
        isBare: wt.isBare ?? false,
        isDetached: wt.isDetached ?? false,
      });
    }
  }

  return worktrees;
}

export async function addWorktree(
  path: string,
  branch: string,
  options?: { cwd?: string; from?: string; detach?: boolean },
): Promise<boolean> {
  const args = ['git', 'worktree', 'add'];

  if (options?.detach) {
    args.push('--detach');
  }

  args.push(path);

  if (options?.from) {
    args.push(options.from);
  } else {
    args.push(branch);
  }

  const result = await executeShellCommand(args.join(' '), { cwd: options?.cwd, timeout: 60_000 });
  return result.exitCode === 0;
}

export async function removeWorktree(
  path: string,
  options?: { cwd?: string; force?: boolean },
): Promise<boolean> {
  const args = ['git', 'worktree', 'remove'];

  if (options?.force) args.push('--force');
  args.push(path);

  const result = await executeShellCommand(args.join(' '), { cwd: options?.cwd, timeout: 15_000 });
  return result.exitCode === 0;
}

export async function pruneWorktrees(cwd?: string): Promise<boolean> {
  const result = await executeShellCommand('git worktree prune', { cwd, timeout: 10_000 });
  return result.exitCode === 0;
}

export async function getWorktreeCount(cwd?: string): Promise<number> {
  const worktrees = await listWorktrees(cwd);
  return worktrees.length;
}

export async function isInWorktree(cwd?: string): Promise<boolean> {
  const result = await executeShellCommand(
    'git rev-parse --git-common-dir 2>/dev/null',
    { cwd, timeout: 5_000 },
  );

  if (result.exitCode !== 0) return false;
  return result.stdout.trim().includes('worktrees');
}
