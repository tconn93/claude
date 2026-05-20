import { executeShellCommand } from '../shell.ts';

export interface GitBlameEntry {
  hash: string;
  originalLine: number;
  finalLine: number;
  lineCount: number;
  author: string;
  authorEmail: string;
  authorTime: number;
  committer: string;
  committerEmail: string;
  committerTime: number;
  summary: string;
  content: string;
}

export interface GitBlameOptions {
  cwd?: string;
  startLine?: number;
  endLine?: number;
  detectMoves?: boolean;
}

export async function getGitBlame(
  filePath: string,
  options: GitBlameOptions = {},
): Promise<GitBlameEntry[]> {
  const args = ['git', 'blame', '--porcelain'];

  if (options.detectMoves !== false) args.push('-M');

  if (options.startLine !== undefined && options.endLine !== undefined) {
    args.push(`-L${options.startLine},${options.endLine}`);
  }

  args.push('--');
  args.push(filePath);

  const result = await executeShellCommand(args.join(' '), { cwd: options.cwd, timeout: 15_000 });

  if (result.exitCode !== 0) return [];
  return parseGitBlame(result.stdout);
}

export function parseGitBlame(output: string): GitBlameEntry[] {
  const entries: GitBlameEntry[] = [];
  const lines = output.split('\n');
  let current: Partial<GitBlameEntry> | null = null;

  for (const line of lines) {
    if (!current) {
      const match = line.match(/^([0-9a-f]{40})\s+(\d+)\s+(\d+)\s*(\d*)/);
      if (match) {
        current = {
          hash: match[1],
          originalLine: parseInt(match[2], 10),
          finalLine: parseInt(match[3], 10),
          lineCount: parseInt(match[4] || '1', 10),
        };
      }
      continue;
    }

    if (line.startsWith('author ')) {
      current.author = line.slice(7);
    } else if (line.startsWith('author-mail ')) {
      current.authorEmail = line.slice(12).replace(/[<>]/g, '');
    } else if (line.startsWith('author-time ')) {
      current.authorTime = parseInt(line.slice(12), 10) * 1000;
    } else if (line.startsWith('committer ')) {
      current.committer = line.slice(10);
    } else if (line.startsWith('committer-mail ')) {
      current.committerEmail = line.slice(15).replace(/[<>]/g, '');
    } else if (line.startsWith('committer-time ')) {
      current.committerTime = parseInt(line.slice(15), 10) * 1000;
    } else if (line.startsWith('summary ')) {
      current.summary = line.slice(8);
    } else if (line.startsWith('\t')) {
      current.content = line.slice(1);
      entries.push(current as GitBlameEntry);
      current = null;
    }
  }

  return entries;
}

export async function getFileAuthors(
  filePath: string,
  cwd?: string,
): Promise<Map<string, number>> {
  const result = await executeShellCommand(
    `git shortlog -sne -- ${filePath}`,
    { cwd, timeout: 10_000 },
  );

  const authors = new Map<string, number>();
  if (result.exitCode !== 0) return authors;

  for (const line of result.stdout.trim().split('\n').filter(Boolean)) {
    const match = line.match(/^\s*(\d+)\s+(.+)$/);
    if (match) {
      authors.set(match[2].trim(), parseInt(match[1], 10));
    }
  }

  return authors;
}

export async function getFileLastModified(
  filePath: string,
  cwd?: string,
): Promise<{ author: string; date: number; hash: string } | null> {
  const result = await executeShellCommand(
    `git log -1 --format='%H%n%an%n%at' -- ${filePath}`,
    { cwd, timeout: 10_000 },
  );

  if (result.exitCode !== 0 || !result.stdout.trim()) return null;

  const [hash, author, timestamp] = result.stdout.trim().split('\n');
  return {
    hash: hash ?? '',
    author: author ?? '',
    date: parseInt(timestamp ?? '0', 10) * 1000,
  };
}
