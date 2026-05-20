import { executeShellCommand } from '../shell.ts';

export interface GitDiffOptions {
  cwd?: string;
  staged?: boolean;
  contextLines?: number;
  ignoreWhitespace?: boolean;
  nameOnly?: boolean;
  diffFilter?: string;
}

export async function getGitDiff(options: GitDiffOptions = {}): Promise<string> {
  const args = ['git', 'diff'];

  if (options.staged) args.push('--staged');
  if (options.contextLines !== undefined) args.push(`--unified=${options.contextLines}`);
  if (options.ignoreWhitespace) args.push('--ignore-all-space');
  if (options.nameOnly) args.push('--name-only');
  if (options.diffFilter) args.push(`--diff-filter=${options.diffFilter}`);

  const result = await executeShellCommand(args.join(' '), { cwd: options.cwd, timeout: 30_000 });

  if (result.exitCode !== 0) return '';
  return result.stdout;
}

export async function getDiffBetweenCommits(
  from: string,
  to: string,
  options: GitDiffOptions = {},
): Promise<string> {
  const args = ['git', 'diff', from, to];

  if (options.contextLines !== undefined) args.push(`--unified=${options.contextLines}`);
  if (options.ignoreWhitespace) args.push('--ignore-all-space');
  if (options.nameOnly) args.push('--name-only');

  const result = await executeShellCommand(args.join(' '), { cwd: options.cwd, timeout: 30_000 });

  if (result.exitCode !== 0) return '';
  return result.stdout;
}

export async function getChangedFiles(options: GitDiffOptions = {}): Promise<string[]> {
  const args = ['git', 'diff', '--name-only'];
  if (options.staged) args.push('--staged');
  if (options.diffFilter) args.push(`--diff-filter=${options.diffFilter}`);

  const result = await executeShellCommand(args.join(' '), { cwd: options.cwd, timeout: 15_000 });

  if (result.exitCode !== 0) return [];
  return result.stdout.trim().split('\n').filter(Boolean);
}

export async function getStagedDiff(cwd?: string): Promise<string> {
  return getGitDiff({ cwd, staged: true });
}

export async function getUnstagedDiff(cwd?: string): Promise<string> {
  return getGitDiff({ cwd, staged: false });
}

export async function getFileDiff(filePath: string, options: GitDiffOptions = {}): Promise<string> {
  const args = ['git', 'diff'];

  if (options.staged) args.push('--staged');
  if (options.contextLines !== undefined) args.push(`--unified=${options.contextLines}`);

  args.push('--');
  args.push(filePath);

  const result = await executeShellCommand(args.join(' '), { cwd: options.cwd, timeout: 15_000 });

  if (result.exitCode !== 0) return '';
  return result.stdout;
}

export interface DiffStat {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export async function getDiffStat(options: GitDiffOptions = {}): Promise<DiffStat | null> {
  const args = ['git', 'diff', '--stat'];
  if (options.staged) args.push('--staged');

  const result = await executeShellCommand(args.join(' '), { cwd: options.cwd, timeout: 15_000 });

  if (result.exitCode !== 0 || !result.stdout.trim()) return null;
  return parseDiffStat(result.stdout.trim());
}

export function parseDiffStat(stat: string): DiffStat {
  const lines = stat.trim().split('\n');
  const summaryLine = lines[lines.length - 1];

  const filesChanged = (summaryLine.match(/(\d+)\s+files?\s+changed/) ?? [])[1];
  const insertions = (summaryLine.match(/(\d+)\s+insertions?/) ?? [])[1];
  const deletions = (summaryLine.match(/(\d+)\s+deletions?/) ?? [])[1];

  return {
    filesChanged: filesChanged ? parseInt(filesChanged, 10) : 0,
    insertions: insertions ? parseInt(insertions, 10) : 0,
    deletions: deletions ? parseInt(deletions, 10) : 0,
  };
}
