import { readFileSync, existsSync } from 'node:fs';

export function countLines(filePath: string): number | null {
  try {
    if (!existsSync(filePath)) return null;
    const content = readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return null;
  }
}

export function countNonEmptyLines(filePath: string): number | null {
  try {
    if (!existsSync(filePath)) return null;
    const content = readFileSync(filePath, 'utf-8');
    return content.split('\n').filter(line => line.trim().length > 0).length;
  } catch {
    return null;
  }
}

export function countLinesInText(text: string): number {
  return text.split('\n').length;
}

export function countNonEmptyLinesInText(text: string): number {
  return text.split('\n').filter(line => line.trim().length > 0).length;
}

export function getLineAt(filePath: string, lineNumber: number): string | null {
  try {
    if (!existsSync(filePath)) return null;
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    if (lineNumber < 1 || lineNumber > lines.length) return null;
    return lines[lineNumber - 1];
  } catch {
    return null;
  }
}

export function getLines(filePath: string, startLine: number, endLine?: number): string[] {
  try {
    if (!existsSync(filePath)) return [];
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const start = Math.max(1, startLine) - 1;
    const end = endLine ? Math.min(lines.length, endLine) : lines.length;
    return lines.slice(start, end);
  } catch {
    return [];
  }
}

export function isWithinLineLimit(filePath: string, maxLines: number): boolean {
  const count = countLines(filePath);
  return count !== null && count <= maxLines;
}
