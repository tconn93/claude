import { executeShellCommand } from '../shell.ts';

export interface GitLogEntry {
  hash: string;
  abbreviatedHash: string;
  author: string;
  authorEmail: string;
  date: number;
  subject: string;
  body: string;
  refs: string[];
}

export interface GitLogOptions {
  cwd?: string;
  maxCount?: number;
  skip?: number;
  author?: string;
  since?: string;
  until?: string;
  grep?: string;
  path?: string;
  all?: boolean;
  firstParent?: boolean;
  noMerges?: boolean;
}

const LOG_FORMAT = '%H%n%h%n%an%n%ae%n%at%n%s%n%b%n%d%n---END---';

export async function getGitLog(options: GitLogOptions = {}): Promise<GitLogEntry[]> {
  const args = ['git', 'log', `--format=${LOG_FORMAT}`];

  if (options.maxCount !== undefined) args.push(`-n${options.maxCount}`);
  if (options.skip !== undefined) args.push(`--skip=${options.skip}`);
  if (options.author) args.push(`--author=${options.author}`);
  if (options.since) args.push(`--since=${options.since}`);
  if (options.until) args.push(`--until=${options.until}`);
  if (options.grep) args.push(`--grep=${options.grep}`);
  if (options.all) args.push('--all');
  if (options.firstParent) args.push('--first-parent');
  if (options.noMerges) args.push('--no-merges');

  if (options.path) {
    args.push('--');
    args.push(options.path);
  }

  const result = await executeShellCommand(args.join(' '), { cwd: options.cwd, timeout: 15_000 });

  if (result.exitCode !== 0) return [];
  return parseGitLog(result.stdout);
}

export function parseGitLog(output: string): GitLogEntry[] {
  const entries: GitLogEntry[] = [];
  const blocks = output.split('---END---\n').filter(b => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 6) continue;

    const hash = lines[0] ?? '';
    const abbreviatedHash = lines[1] ?? '';
    const author = lines[2] ?? '';
    const authorEmail = lines[3] ?? '';
    const date = parseInt(lines[4] ?? '0', 10);
    const subject = lines[5] ?? '';
    const bodyEndIndex = lines.indexOf('%d') >= 0 ? lines.indexOf('%d') : 6;
    const body = lines.slice(6, bodyEndIndex >= 6 ? bodyEndIndex : lines.length).join('\n');
    const refsLine = lines[bodyEndIndex >= 6 ? bodyEndIndex : lines.length - 1] ?? '';
    const refs = parseRefs(refsLine);

    entries.push({
      hash,
      abbreviatedHash,
      author,
      authorEmail,
      date: date * 1000,
      subject,
      body: body.trim(),
      refs,
    });
  }

  return entries;
}

function parseRefs(refsLine: string): string[] {
  if (!refsLine || refsLine === '%d') return [];
  const match = refsLine.match(/\((.*)\)/);
  if (!match) return [];
  return match[1].split(',').map(r => r.trim()).filter(Boolean);
}

export async function getCommitMessage(hash: string, cwd?: string): Promise<string> {
  const result = await executeShellCommand(
    `git log --format=%B -n1 ${hash}`,
    { cwd, timeout: 5_000 },
  );

  if (result.exitCode !== 0) return '';
  return result.stdout.trim();
}

export async function getCommitCount(options: GitLogOptions = {}): Promise<number> {
  const args = ['git', 'rev-list', '--count', 'HEAD'];

  if (options.author) args.push(`--author=${options.author}`);
  if (options.since) args.push(`--since=${options.since}`);
  if (options.until) args.push(`--until=${options.until}`);
  if (options.noMerges) args.push('--no-merges');

  const result = await executeShellCommand(args.join(' '), { cwd: options.cwd, timeout: 10_000 });

  if (result.exitCode !== 0) return 0;
  return parseInt(result.stdout.trim(), 10) || 0;
}

export async function getHeadHash(cwd?: string): Promise<string | null> {
  const result = await executeShellCommand(
    'git rev-parse HEAD',
    { cwd, timeout: 5_000 },
  );

  if (result.exitCode !== 0) return null;
  return result.stdout.trim();
}
