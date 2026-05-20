import { resolve, relative, dirname, basename, extname, join, normalize, sep } from 'node:path';

export function normalizePath(filePath: string): string {
  return normalize(filePath).replace(/\\/g, '/');
}

export function resolvePath(...segments: string[]): string {
  return resolve(...segments);
}

export function relativePath(from: string, to: string): string {
  return relative(from, to);
}

export function getDirname(filePath: string): string {
  return dirname(filePath);
}

export function getBasename(filePath: string): string {
  return basename(filePath);
}

export function getExtension(filePath: string): string {
  return extname(filePath);
}

export function getFilenameWithoutExt(filePath: string): string {
  return basename(filePath, extname(filePath));
}

export function joinPath(...segments: string[]): string {
  return join(...segments);
}

export function splitPath(filePath: string): string[] {
  return normalizePath(filePath).split('/').filter(Boolean);
}

export function isAbsolute(filePath: string): boolean {
  return filePath.startsWith('/') || filePath.match(/^[A-Za-z]:\\/) !== null;
}

export function ensureTrailingSlash(filePath: string): string {
  if (filePath.endsWith('/') || filePath.endsWith('\\')) return filePath;
  return filePath + sep;
}

export function removeTrailingSlash(filePath: string): string {
  return filePath.replace(/[\\/]+$/, '');
}

export function parentPath(filePath: string): string {
  return dirname(filePath);
}

export function replaceExtension(filePath: string, newExt: string): string {
  const ext = extname(filePath);
  const withoutExt = filePath.slice(0, -ext.length);
  return withoutExt + (newExt.startsWith('.') ? newExt : '.' + newExt);
}

export function commonAncestor(paths: string[]): string {
  if (paths.length === 0) return '';
  if (paths.length === 1) return dirname(paths[0]);

  const normalized = paths.map(p => splitPath(p));
  const minLen = Math.min(...normalized.map(p => p.length));

  const common: string[] = [];
  for (let i = 0; i < minLen; i++) {
    const segment = normalized[0][i];
    if (normalized.every(p => p[i] === segment)) {
      common.push(segment);
    } else {
      break;
    }
  }

  return common.length > 0 ? '/' + common.join('/') : '/';
}

export function isSubpath(parent: string, child: string): boolean {
  const resolvedParent = resolve(parent);
  const resolvedChild = resolve(child);
  return resolvedChild.startsWith(resolvedParent + sep) || resolvedChild === resolvedParent;
}

export function relativeToHome(filePath: string): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/tmp';
  if (filePath.startsWith(home)) {
    return '~' + filePath.slice(home.length);
  }
  return filePath;
}

export function expandHome(filePath: string): string {
  if (filePath.startsWith('~/')) {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '/tmp';
    return join(home, filePath.slice(2));
  }
  return filePath;
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/^\.+/, '_')
    .replace(/\s+/g, '_')
    .slice(0, 255);
}
