import { executeShellCommand } from '../shell.ts';

export interface CommitOptions {
  cwd?: string;
  allowEmpty?: boolean;
  signoff?: boolean;
  noVerify?: boolean;
  amend?: boolean;
}

export interface CommitResult {
  success: boolean;
  hash: string | null;
  error: string | null;
}

export async function commit(message: string, options: CommitOptions = {}): Promise<CommitResult> {
  const escapedMessage = message.replace(/'/g, "'\\''");

  const args = ['git', 'commit', '-m', `'${escapedMessage}'`];

  if (options.allowEmpty) args.push('--allow-empty');
  if (options.signoff) args.push('--signoff');
  if (options.noVerify) args.push('--no-verify');
  if (options.amend) args.push('--amend');

  const result = await executeShellCommand(args.join(' '), { cwd: options.cwd, timeout: 30_000 });

  if (result.exitCode !== 0) {
    return { success: false, hash: null, error: result.stderr || 'Commit failed' };
  }

  const hashResult = await executeShellCommand(
    'git rev-parse HEAD',
    { cwd: options.cwd, timeout: 5_000 },
  );

  return {
    success: true,
    hash: hashResult.stdout.trim() || null,
    error: null,
  };
}

export async function stageFiles(
  files: string[],
  options?: { cwd?: string; force?: boolean },
): Promise<boolean> {
  if (files.length === 0) return true;

  const args = ['git', 'add'];
  if (options?.force) args.push('--force');
  args.push('--');
  args.push(...files);

  const result = await executeShellCommand(args.join(' '), { cwd: options?.cwd, timeout: 15_000 });
  return result.exitCode === 0;
}

export async function stageAll(options?: { cwd?: string; untracked?: boolean }): Promise<boolean> {
  const args = ['git', 'add', options?.untracked ? '--all' : '--update'];
  const result = await executeShellCommand(args.join(' '), { cwd: options?.cwd, timeout: 15_000 });
  return result.exitCode === 0;
}

export async function unstageFiles(files: string[], cwd?: string): Promise<boolean> {
  if (files.length === 0) return true;

  const result = await executeShellCommand(
    `git reset HEAD -- ${files.join(' ')}`,
    { cwd, timeout: 10_000 },
  );
  return result.exitCode === 0;
}

export async function unstageAll(cwd?: string): Promise<boolean> {
  const result = await executeShellCommand('git reset HEAD', { cwd, timeout: 10_000 });
  return result.exitCode === 0;
}

export async function getUnstagedFiles(cwd?: string): Promise<string[]> {
  const result = await executeShellCommand(
    'git diff --name-only',
    { cwd, timeout: 15_000 },
  );

  if (result.exitCode !== 0) return [];
  return result.stdout.trim().split('\n').filter(Boolean);
}

export async function getStagedFiles(cwd?: string): Promise<string[]> {
  const result = await executeShellCommand(
    'git diff --name-only --staged',
    { cwd, timeout: 15_000 },
  );

  if (result.exitCode !== 0) return [];
  return result.stdout.trim().split('\n').filter(Boolean);
}

export async function getUntrackedFiles(cwd?: string): Promise<string[]> {
  const result = await executeShellCommand(
    'git ls-files --others --exclude-standard',
    { cwd, timeout: 10_000 },
  );

  if (result.exitCode !== 0) return [];
  return result.stdout.trim().split('\n').filter(Boolean);
}

export async function commitExists(hash: string, cwd?: string): Promise<boolean> {
  const result = await executeShellCommand(
    `git cat-file -e ${hash} 2>/dev/null`,
    { cwd, timeout: 5_000 },
  );
  return result.exitCode === 0;
}
