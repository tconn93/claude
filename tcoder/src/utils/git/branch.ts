import { executeShellCommand } from '../shell.ts';

export interface GitBranch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  upstream: string | null;
  commit: string;
  commitMessage: string;
}

export async function getCurrentBranch(cwd?: string): Promise<string | null> {
  const result = await executeShellCommand(
    'git branch --show-current',
    { cwd, timeout: 5_000 },
  );

  if (result.exitCode !== 0) return null;
  return result.stdout.trim() || null;
}

export async function getDefaultBranch(cwd?: string): Promise<string | null> {
  const result = await executeShellCommand(
    'git remote show origin 2>/dev/null | grep "HEAD branch" | cut -d: -f2',
    { cwd, timeout: 10_000 },
  );

  const branch = result.stdout.trim();
  if (branch) return branch;

  const fallback = await executeShellCommand(
    'git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null',
    { cwd, timeout: 5_000 },
  );

  if (fallback.exitCode === 0) {
    const ref = fallback.stdout.trim();
    return ref.replace('refs/remotes/origin/', '');
  }

  return null;
}

export async function listBranches(
  options: { remote?: boolean; all?: boolean; cwd?: string } = {},
): Promise<GitBranch[]> {
  const args = ['git', 'branch', '--format=%(refname:short)%00%(objectname:short)%00%(subject)%00%(upstream:short)%00%(HEAD)'];

  if (options.remote) args.push('--remote');
  if (options.all) args.push('--all');

  const result = await executeShellCommand(args.join(' '), { cwd: options.cwd, timeout: 10_000 });

  if (result.exitCode !== 0) return [];

  return result.stdout.trim().split('\n').filter(Boolean).map(line => {
    const [name, commit, commitMessage, upstream, headMarker] = line.split('\0');
    return {
      name: name.trim(),
      isCurrent: headMarker === '*',
      isRemote: name.startsWith('remotes/') || name.startsWith('origin/'),
      upstream: upstream?.trim() || null,
      commit: commit?.trim() ?? '',
      commitMessage: commitMessage?.trim() ?? '',
    };
  });
}

export async function createBranch(name: string, options?: { cwd?: string; from?: string }): Promise<boolean> {
  const args = ['git', 'branch', name];
  if (options?.from) args.push(options.from);

  const result = await executeShellCommand(args.join(' '), { cwd: options?.cwd, timeout: 10_000 });
  return result.exitCode === 0;
}

export async function switchBranch(name: string, options?: { cwd?: string; create?: boolean }): Promise<boolean> {
  const flag = options?.create ? 'checkout -b' : 'checkout';
  const result = await executeShellCommand(
    `git ${flag} ${name}`,
    { cwd: options?.cwd, timeout: 30_000 },
  );
  return result.exitCode === 0;
}

export async function deleteBranch(name: string, options?: { cwd?: string; force?: boolean }): Promise<boolean> {
  const flag = options?.force ? '-D' : '-d';
  const result = await executeShellCommand(
    `git branch ${flag} ${name}`,
    { cwd: options?.cwd, timeout: 10_000 },
  );
  return result.exitCode === 0;
}

export async function mergeBranch(name: string, options?: { cwd?: string; squash?: boolean; noCommit?: boolean }): Promise<boolean> {
  const args = ['git', 'merge'];
  if (options?.squash) args.push('--squash');
  if (options?.noCommit) args.push('--no-commit');
  args.push(name);

  const result = await executeShellCommand(args.join(' '), { cwd: options?.cwd, timeout: 60_000 });
  return result.exitCode === 0;
}

export async function rebaseBranch(name: string, options?: { cwd?: string; interactive?: boolean }): Promise<boolean> {
  const args = ['git', 'rebase'];
  if (options?.interactive) args.push('--interactive');
  args.push(name);

  const result = await executeShellCommand(args.join(' '), { cwd: options?.cwd, timeout: 120_000 });
  return result.exitCode === 0;
}

export async function branchExists(name: string, cwd?: string): Promise<boolean> {
  const result = await executeShellCommand(
    `git rev-parse --verify ${name} 2>/dev/null`,
    { cwd, timeout: 5_000 },
  );
  return result.exitCode === 0;
}
