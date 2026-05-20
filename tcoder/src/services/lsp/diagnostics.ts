import type { LSPDiagnostic, LSPRange, LSPPosition } from './client.ts';

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface DiagnosticEntry {
  uri: string;
  diagnostics: LSPDiagnostic[];
  timestamp: number;
}

export function mapSeverity(severity?: 1 | 2 | 3 | 4): DiagnosticSeverity {
  switch (severity) {
    case 1: return 'error';
    case 2: return 'warning';
    case 3: return 'info';
    case 4: return 'hint';
    default: return 'error';
  }
}

export function severityToNumber(severity: DiagnosticSeverity): 1 | 2 | 3 | 4 {
  switch (severity) {
    case 'error': return 1;
    case 'warning': return 2;
    case 'info': return 3;
    case 'hint': return 4;
  }
}

export function positionInRange(position: LSPPosition, range: LSPRange): boolean {
  if (position.line < range.start.line) return false;
  if (position.line > range.end.line) return false;
  if (position.line === range.start.line && position.character < range.start.character) return false;
  if (position.line === range.end.line && position.character > range.end.character) return false;
  return true;
}

export function rangeContains(range: LSPRange, inner: LSPRange): boolean {
  return positionInRange(inner.start, range) && positionInRange(inner.end, range);
}

export function rangesOverlap(a: LSPRange, b: LSPRange): boolean {
  if (a.end.line < b.start.line) return false;
  if (b.end.line < a.start.line) return false;
  if (a.end.line === b.start.line && a.end.character < b.start.character) return false;
  if (b.end.line === a.start.line && b.end.character < a.start.character) return false;
  return true;
}

export class DiagnosticStore {
  private diagnostics = new Map<string, LSPDiagnostic[]>();

  set(uri: string, diagnostics: LSPDiagnostic[]): void {
    this.diagnostics.set(uri, diagnostics);
  }

  get(uri: string): LSPDiagnostic[] {
    return this.diagnostics.get(uri) ?? [];
  }

  getAll(): Map<string, LSPDiagnostic[]> {
    return new Map(this.diagnostics);
  }

  getErrors(uri: string): LSPDiagnostic[] {
    return this.get(uri).filter((d) => (d.severity ?? 1) === 1);
  }

  getWarnings(uri: string): LSPDiagnostic[] {
    return this.get(uri).filter((d) => (d.severity ?? 1) === 2);
  }

  getByRange(uri: string, range: LSPRange): LSPDiagnostic[] {
    return this.get(uri).filter((d) => rangesOverlap(d.range, range));
  }

  getByPosition(uri: string, position: LSPPosition): LSPDiagnostic[] {
    return this.get(uri).filter((d) => positionInRange(position, d.range));
  }

  clear(uri: string): void {
    this.diagnostics.delete(uri);
  }

  clearAll(): void {
    this.diagnostics.clear();
  }

  totalErrors(): number {
    let count = 0;
    for (const diags of this.diagnostics.values()) {
      count += diags.filter((d) => (d.severity ?? 1) === 1).length;
    }
    return count;
  }

  totalWarnings(): number {
    let count = 0;
    for (const diags of this.diagnostics.values()) {
      count += diags.filter((d) => (d.severity ?? 1) === 2).length;
    }
    return count;
  }

  hasErrors(uri: string): boolean {
    return this.getErrors(uri).length > 0;
  }
}

export function formatDiagnostic(diagnostic: LSPDiagnostic): string {
  const severity = mapSeverity(diagnostic.severity);
  const line = diagnostic.range.start.line + 1;
  const col = diagnostic.range.start.character + 1;
  const code = diagnostic.code ? ` [${diagnostic.code}]` : '';
  const source = diagnostic.source ? ` (${diagnostic.source})` : '';
  return `[${severity.toUpperCase()}] Line ${line}:${col}${code}${source}: ${diagnostic.message}`;
}

export function formatDiagnostics(diagnostics: LSPDiagnostic[]): string {
  return diagnostics.map(formatDiagnostic).join('\n');
}

export function sortDiagnostics(diagnostics: LSPDiagnostic[]): LSPDiagnostic[] {
  return [...diagnostics].sort((a, b) => {
    if (a.range.start.line !== b.range.start.line) {
      return a.range.start.line - b.range.start.line;
    }
    return a.range.start.character - b.range.start.character;
  });
}

export function deduplicateDiagnostics(diagnostics: LSPDiagnostic[]): LSPDiagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((d) => {
    const key = `${d.range.start.line}:${d.range.start.character}:${d.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
