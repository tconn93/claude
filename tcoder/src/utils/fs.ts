import {
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  mkdirSync,
  rmSync,
  renameSync,
  copyFileSync,
  readdirSync,
  unlinkSync,
  accessSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { constants } from 'node:fs';

export function readFile(path: string): string | null {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

export function readFileLines(path: string): string[] {
  const content = readFile(path);
  if (content === null) return [];
  return content.split('\n');
}

export function writeFile(path: string, content: string): boolean {
  try {
    ensureDir(dirname(path));
    writeFileSync(path, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function writeFileAtomic(path: string, content: string): boolean {
  const tmpPath = `${path}.tmp.${process.pid}`;
  try {
    ensureDir(dirname(path));
    writeFileSync(tmpPath, content, 'utf-8');
    renameSync(tmpPath, path);
    return true;
  } catch {
    // Clean up temp file
    try { unlinkSync(tmpPath); } catch { /* ignore */ }
    return false;
  }
}

export function appendFile(path: string, content: string): boolean {
  try {
    const { appendFileSync } = require('node:fs');
    ensureDir(dirname(path));
    appendFileSync(path, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function fileExists(path: string): boolean {
  return existsSync(path);
}

export function dirExists(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export function ensureDir(path: string): boolean {
  try {
    mkdirSync(path, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

export function removeFile(path: string): boolean {
  try {
    unlinkSync(path);
    return true;
  } catch {
    return false;
  }
}

export function removeDir(path: string, recursive = true): boolean {
  try {
    rmSync(path, { recursive, force: true });
    return true;
  } catch {
    return false;
  }
}

export function copyFile(src: string, dest: string): boolean {
  try {
    ensureDir(dirname(dest));
    copyFileSync(src, dest);
    return true;
  } catch {
    return false;
  }
}

export function renameFile(src: string, dest: string): boolean {
  try {
    ensureDir(dirname(dest));
    renameSync(src, dest);
    return true;
  } catch {
    return false;
  }
}

export function listFiles(dir: string, recursive = false): string[] {
  const results: string[] = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory() && recursive) {
        results.push(...listFiles(fullPath, true));
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  } catch {
    // no-op
  }

  return results;
}

export function getFileStat(path: string): { size: number; modified: number; created: number; isFile: boolean; isDir: boolean } | null {
  try {
    const stat = statSync(path);
    return {
      size: stat.size,
      modified: stat.mtimeMs,
      created: stat.birthtimeMs,
      isFile: stat.isFile(),
      isDir: stat.isDirectory(),
    };
  } catch {
    return null;
  }
}

export function isReadable(path: string): boolean {
  try {
    accessSync(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export function isWritable(path: string): boolean {
  try {
    accessSync(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
