import { homedir, platform as osPlatform, hostname, cpus, totalmem } from 'node:os';
import { resolve, relative } from 'node:path';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { getGitInfo, type GitInfo } from './tools/shared/gitOperations.ts';
import { detectShell, type ShellInfo } from './utils/shell.ts';

export interface SystemContext {
  workingDirectory: string;
  homeDirectory: string;
  platform: string;
  arch: string;
  hostname: string;
  cpus: number;
  memoryGb: number;
  nodeVersion: string;
  bunVersion: string | null;
  shell: ShellInfo;
  isTTY: boolean;
  terminal: string | undefined;
  date: string;
  timezoneOffset: number;
}

export interface ProjectContext {
  git: GitInfo;
  packageManager: string | null;
  hasPackageJson: boolean;
  hasTsConfig: boolean;
  hasEnvFile: boolean;
  rootFiles: string[];
  workspaceFolders: string[];
}

export interface BuiltContext {
  system: SystemContext;
  project: ProjectContext;
  environmentVariables: Record<string, string>;
  fileTree: string;
  recentFiles: string[];
}

const MAX_FILE_TREE_DEPTH = 2;
const MAX_FILE_TREE_ENTRIES = 50;

export function gatherSystemContext(workingDir: string): SystemContext {
  return {
    workingDirectory: workingDir,
    homeDirectory: homedir(),
    platform: osPlatform(),
    arch: process.arch,
    hostname: hostname(),
    cpus: cpus().length,
    memoryGb: Math.round(totalmem() / (1024 * 1024 * 1024)),
    nodeVersion: process.version,
    bunVersion: (globalThis as unknown as { Bun?: { version: string } }).Bun?.version ?? null,
    shell: detectShell(),
    isTTY: process.stdin.isTTY ?? false,
    terminal: process.env.TERM,
    date: new Date().toISOString().split('T')[0],
    timezoneOffset: new Date().getTimezoneOffset(),
  };
}

export function gatherProjectContext(workingDir: string): ProjectContext {
  const git = getGitInfo(workingDir);

  const hasPackageJson = existsSync(resolve(workingDir, 'package.json'));
  const hasTsConfig = existsSync(resolve(workingDir, 'tsconfig.json'));
  const hasEnvFile = existsSync(resolve(workingDir, '.env'));

  let packageManager: string | null = null;
  if (hasPackageJson) {
    const lockFiles: Record<string, string> = {
      'bun.lockb': 'bun',
      'bun.lock': 'bun',
      'package-lock.json': 'npm',
      'yarn.lock': 'yarn',
      'pnpm-lock.yaml': 'pnpm',
      'deno.lock': 'deno',
    };
    for (const [file, pm] of Object.entries(lockFiles)) {
      if (existsSync(resolve(workingDir, file))) {
        packageManager = pm;
        break;
      }
    }
  }

  const rootFiles = listDirectory(workingDir, 0, 1);

  return {
    git,
    packageManager,
    hasPackageJson,
    hasTsConfig,
    hasEnvFile,
    rootFiles,
    workspaceFolders: [workingDir],
  };
}

export function gatherEnvironmentVariables(): Record<string, string> {
  const relevant = [
    'SHELL', 'HOME', 'USER', 'LANG', 'LC_ALL',
    'PATH', 'NODE_ENV', 'TERM', 'TERM_PROGRAM',
    'GIT_EDITOR', 'EDITOR', 'VISUAL',
  ];
  const env: Record<string, string> = {};
  for (const key of relevant) {
    if (process.env[key] !== undefined) {
      env[key] = process.env[key]!;
    }
  }
  return env;
}

export function gatherFileTree(workingDir: string): string {
  const lines: string[] = [];
  lines.push(relative(homedir(), workingDir) || workingDir);
  const entries = listDirectoryFlat(workingDir, 0, MAX_FILE_TREE_DEPTH);
  const displayEntries = entries.slice(0, MAX_FILE_TREE_ENTRIES);
  const lastLevels: boolean[] = [];

  for (let i = 0; i < displayEntries.length; i++) {
    const entry = displayEntries[i];
    const isLast = i === displayEntries.length - 1 || displayEntries[i + 1].depth < entry.depth;
    const prefix = buildTreePrefix(entry.depth, lastLevels, isLast);
    const name = entry.isDirectory ? `${entry.name}/` : entry.name;
    lines.push(`${prefix}${name}`);
    if (isLast && entry.depth > 0) {
      lastLevels[entry.depth - 1] = true;
    }
  }

  if (entries.length > MAX_FILE_TREE_ENTRIES) {
    lines.push(`  ... and ${entries.length - MAX_FILE_TREE_ENTRIES} more files`);
  }

  return lines.join('\n');
}

interface TreeEntry {
  name: string;
  depth: number;
  isDirectory: boolean;
}

function listDirectoryFlat(
  dirPath: string,
  depth: number,
  maxDepth: number,
): TreeEntry[] {
  const results: TreeEntry[] = [];

  const skipPatterns = [
    'node_modules', '.git', 'dist', 'build', '.next', 'coverage',
    '__pycache__', '.cache', '.DS_Store', '.nyc_output',
  ];

  try {
    const entries = readdirSync(dirPath);
    entries.sort((a, b) => a.localeCompare(b));

    for (const entry of entries) {
      if (entry.startsWith('.') && entry !== '.env' && entry !== '.env.example' && entry !== '.gitignore') {
        continue;
      }
      if (skipPatterns.includes(entry)) continue;

      const fullPath = resolve(dirPath, entry);
      try {
        const stat = statSync(fullPath);
        results.push({ name: entry, depth, isDirectory: stat.isDirectory() });

        if (stat.isDirectory() && depth < maxDepth) {
          results.push(...listDirectoryFlat(fullPath, depth + 1, maxDepth));
        }
      } catch {
        // Skip files we can't stat
      }
    }
  } catch {
    // Directory not readable
  }

  return results;
}

function buildTreePrefix(depth: number, lastLevels: boolean[], isLast: boolean): string {
  if (depth === 0) return '';
  const parts: string[] = [];
  for (let i = 0; i < depth - 1; i++) {
    parts.push(lastLevels[i] ? '  ' : '| ');
  }
  parts.push(isLast ? '`-- ' : '|-- ');
  return parts.join('');
}

function listDirectory(dirPath: string, depth: number, maxDepth: number): string[] {
  return listDirectoryFlat(dirPath, depth, maxDepth).map(e => e.name);
}

export function gatherRecentFiles(workingDir: string): string[] {
  // Stub: in production, this would read from session history or IDE data
  return [];
}

export function buildContext(workingDir: string): BuiltContext {
  return {
    system: gatherSystemContext(workingDir),
    project: gatherProjectContext(workingDir),
    environmentVariables: gatherEnvironmentVariables(),
    fileTree: gatherFileTree(workingDir),
    recentFiles: gatherRecentFiles(workingDir),
  };
}

export function buildSystemPromptContext(ctx: BuiltContext): string {
  const { system, project } = ctx;

  const sections: string[] = [];

  sections.push(`# Environment
- Working directory: ${system.workingDirectory}
- Platform: ${system.platform} (${system.arch})
- Hostname: ${system.hostname}
- CPUs: ${system.cpus}
- Memory: ${system.memoryGb}GB
- Node: ${system.nodeVersion}
${system.bunVersion ? `- Bun: ${system.bunVersion}` : ''}
- Shell: ${system.shell.type} (${system.shell.path})
- Terminal: ${system.isTTY ? 'interactive' : 'non-interactive'}`);

  if (project.git.isRepo) {
    sections.push(`# Git
- Branch: ${project.git.branch ?? 'unknown'}
- Has changes: ${project.git.hasChanges}
${project.git.remote ? `- Remote: ${project.git.remote}` : ''}
${project.git.stagedFiles.length > 0 ? `- Staged: ${project.git.stagedFiles.length} files` : ''}
${project.git.modifiedFiles.length > 0 ? `- Modified: ${project.git.modifiedFiles.length} files` : ''}
${project.git.untrackedFiles.length > 0 ? `- Untracked: ${project.git.untrackedFiles.length} files` : ''}`);
  }

  sections.push(`# Project
- Package manager: ${project.packageManager ?? 'none detected'}
- hasPackageJson: ${project.hasPackageJson}
- hasTsConfig: ${project.hasTsConfig}
- hasEnvFile: ${project.hasEnvFile}`);

  if (ctx.fileTree) {
    sections.push(`# File Tree
\`\`\`
${ctx.fileTree}
\`\`\``);
  }

  return sections.join('\n\n');
}
