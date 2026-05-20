import { existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, relative, basename, dirname, extname, join } from 'node:path';
import { FILE_SIZE_LIMIT, MAX_FILE_LINES } from '../constants/common.ts';

export function getFileSize(filePath: string): number | null {
  try {
    return statSync(filePath).size;
  } catch {
    return null;
  }
}

export function getFileModifiedTime(filePath: string): number | null {
  try {
    return statSync(filePath).mtimeMs;
  } catch {
    return null;
  }
}

export function resolveFilePath(basePath: string, filePath: string): string {
  if (filePath.startsWith('~/')) {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '/tmp';
    filePath = join(home, filePath.slice(2));
  }

  if (filePath.startsWith('/')) {
    return filePath;
  }

  return resolve(basePath, filePath);
}

export function getRelativePath(basePath: string, filePath: string): string {
  return relative(basePath, filePath);
}

export function splitPath(filePath: string): { dir: string; base: string; name: string; ext: string } {
  return {
    dir: dirname(filePath),
    base: basename(filePath),
    name: basename(filePath, extname(filePath)),
    ext: extname(filePath),
  };
}

export function isTextFile(filePath: string): boolean {
  const textExtensions = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.jsonc',
    '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift', '.c', '.cpp', '.h', '.hpp',
    '.css', '.scss', '.less', '.html', '.htm', '.xml', '.svg', '.md', '.mdx',
    '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.env', '.env.example',
    '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
    '.gitignore', '.gitattributes', '.editorconfig', '.prettierrc', '.eslintrc',
    '.dockerfile', '.dockerignore', '.makefile', '.cmake', '.gradle',
    '.vue', '.svelte', '.astro', '.solid', '.sql', '.graphql', '.gql',
    '.txt', '.log', '.csv', '.tsv',
  ]);

  const ext = extname(filePath).toLowerCase();
  return textExtensions.has(ext);
}

export function isBinaryFile(filePath: string): boolean {
  const binaryExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.avif',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar',
    '.exe', '.dll', '.so', '.dylib', '.wasm', '.bin',
    '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv',
    '.ttf', '.otf', '.woff', '.woff2', '.eot',
    '.o', '.obj', '.class', '.pyc', '.pyo',
  ]);

  const ext = extname(filePath).toLowerCase();
  return binaryExtensions.has(ext);
}

export function isHiddenFile(filePath: string): boolean {
  const base = basename(filePath);
  return base.startsWith('.');
}

export function isWithinDirectory(filePath: string, directory: string): boolean {
  const resolvedFile = resolve(filePath);
  const resolvedDir = resolve(directory);
  return resolvedFile.startsWith(resolvedDir + '/') || resolvedFile === resolvedDir;
}

export function ensureAbsolutePath(filePath: string, cwd?: string): string {
  if (filePath.startsWith('/') || filePath.match(/^[A-Za-z]:\\/)) {
    return filePath;
  }
  return resolve(cwd ?? process.cwd(), filePath);
}

export function expandHomeDir(filePath: string): string {
  if (filePath.startsWith('~/')) {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '/tmp';
    return join(home, filePath.slice(2));
  }
  return filePath;
}

export async function glob(
  pattern: string,
  options: {
    cwd?: string;
    ignore?: string[];
    maxResults?: number;
    includeHidden?: boolean;
  } = {},
): Promise<string[]> {
  const cwd = options.cwd ?? process.cwd();
  const maxResults = options.maxResults ?? 100;

  try {
    const { glob } = await import('node:fs/promises');
    const results: string[] = [];

    const baseDir = resolve(cwd);
    const entries = await glob(pattern, { cwd: baseDir });

    for (const entry of entries) {
      if (results.length >= maxResults) break;

      if (!options.includeHidden && isHiddenFile(entry)) continue;

      if (options.ignore?.some(ignorePattern => {
        try {
          const { minimatch } = require('minimatch');
          return minimatch(entry, ignorePattern);
        } catch {
          return entry.includes(ignorePattern);
        }
      })) continue;

      results.push(entry);
    }

    return results;
  } catch {
    return [];
  }
}

export function isFileTooLarge(filePath: string, maxSize?: number): boolean {
  const limit = maxSize ?? FILE_SIZE_LIMIT;
  const size = getFileSize(filePath);
  return size !== null && size > limit;
}

export function getFileExtension(filePath: string): string {
  return extname(filePath).toLowerCase();
}

export function changeExtension(filePath: string, newExt: string): string {
  const withoutExt = filePath.slice(0, filePath.length - extname(filePath).length);
  return withoutExt + (newExt.startsWith('.') ? newExt : '.' + newExt);
}

export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function listDirectory(dirPath: string): string[] {
  try {
    return readdirSync(dirPath);
  } catch {
    return [];
  }
}
