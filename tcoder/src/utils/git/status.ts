import { executeShellCommand } from '../shell.ts';

export interface GitStatusFile {
  path: string;
  staged: boolean;
  status: GitFileStatus;
  oldPath?: string;
}

export type GitFileStatus =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'untracked'
  | 'unmerged'
  | 'ignored'
  | 'unknown';

export interface GitStatus {
  branch: string;
  upstream: string | null;
  ahead: number;
  behind: number;
  files: GitStatusFile[];
  isClean: boolean;
  hasConflicts: boolean;
}

export async function getGitStatus(cwd?: string): Promise<GitStatus | null> {
  const result = await executeShellCommand(
    'git status --porcelain=v2 --branch',
    { cwd, timeout: 15_000 },
  );

  if (result.exitCode !== 0) {
    return null;
  }

  return parseGitStatus(result.stdout);
}

export function parseGitStatus(output: string): GitStatus {
  const lines = output.split('\n').filter(l => l.length > 0);
  let branch = 'unknown';
  let upstream: string | null = null;
  let ahead = 0;
  let behind = 0;
  const files: GitStatusFile[] = [];

  for (const line of lines) {
    if (line.startsWith('# branch.head ')) {
      branch = line.slice('# branch.head '.length);
    } else if (line.startsWith('# branch.upstream ')) {
      upstream = line.slice('# branch.upstream '.length);
    } else if (line.startsWith('# branch.ab ')) {
      const parts = line.slice('# branch.ab '.length).split(' ');
      for (const part of parts) {
        if (part.startsWith('+')) ahead = parseInt(part.slice(1), 10) || 0;
        if (part.startsWith('-')) behind = parseInt(part.slice(1), 10) || 0;
      }
    } else if (line.startsWith('1 ') || line.startsWith('2 ') || line.startsWith('u ') || line.startsWith('? ')) {
      const file = parsePorcelainV2Line(line);
      if (file) files.push(file);
    }
  }

  return {
    branch,
    upstream,
    ahead,
    behind,
    files,
    isClean: files.length === 0,
    hasConflicts: files.some(f => f.status === 'unmerged'),
  };
}

function parsePorcelainV2Line(line: string): GitStatusFile | null {
  if (line.startsWith('1 ')) {
    return parseOrdinaryEntry(line);
  }
  if (line.startsWith('2 ')) {
    return parseRenameEntry(line);
  }
  if (line.startsWith('u ')) {
    return parseUnmergedEntry(line);
  }
  if (line.startsWith('? ')) {
    const path = line.slice(2);
    return { path, staged: false, status: 'untracked' };
  }
  return null;
}

function parseOrdinaryEntry(line: string): GitStatusFile {
  const parts = line.split(' ');
  const xy = parts[1];
  const sub = parts[2];
  const path = parts.slice(8).join(' ');

  const staged = xy[0] !== '.';
  const status = indexStatusToFileStatus(xy, sub);

  return { path, staged, status };
}

function parseRenameEntry(line: string): GitStatusFile {
  const parts = line.split(' ');
  const xy = parts[1];
  const sub = parts[2];
  const score = parts[8];
  const sep = parts.slice(9).indexOf(score) + 9;
  const oldPath = parts.slice(9, sep).join(' ');
  const path = parts.slice(sep + 1).join(' ');

  const staged = xy[0] !== '.';
  const status = xy[0] === 'R' ? 'renamed' : 'copied';

  return { path, staged, status, oldPath };
}

function parseUnmergedEntry(line: string): GitStatusFile {
  const parts = line.split(' ');
  const path = parts.slice(10).join(' ');
  return { path, staged: false, status: 'unmerged' };
}

function indexStatusToFileStatus(xy: string, _sub: string): GitFileStatus {
  const x = xy[0];
  const y = xy[1];

  if (x === 'M' && y === '.') return 'added';
  if (x === 'M' && y === 'M') return 'modified';
  if (x === '.' && y === 'M') return 'modified';
  if (x === 'A') return 'added';
  if (x === 'D' || y === 'D') return 'deleted';
  if (x === 'R') return 'renamed';
  if (x === 'C') return 'copied';
  if (x === '!') return 'ignored';
  if (x === '?') return 'untracked';

  return 'modified';
}

export async function isGitRepository(cwd?: string): Promise<boolean> {
  const result = await executeShellCommand(
    'git rev-parse --git-dir',
    { cwd, timeout: 5_000 },
  );
  return result.exitCode === 0;
}

export async function hasUncommittedChanges(cwd?: string): Promise<boolean> {
  const result = await executeShellCommand(
    'git status --porcelain',
    { cwd, timeout: 15_000 },
  );
  return result.stdout.trim().length > 0;
}
