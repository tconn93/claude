import type { LSPLocation, LSPPosition } from './client.ts';

export interface ReferenceResult {
  locations: LSPLocation[];
  totalCount: number;
  truncated: boolean;
}

export function groupReferencesByFile(locations: LSPLocation[]): Map<string, LSPLocation[]> {
  const groups = new Map<string, LSPLocation[]>();
  for (const loc of locations) {
    const fileUri = loc.uri;
    const group = groups.get(fileUri) ?? [];
    group.push(loc);
    groups.set(fileUri, group);
  }
  return groups;
}

export function sortReferences(locations: LSPLocation[]): LSPLocation[] {
  return [...locations].sort((a, b) => {
    if (a.uri !== b.uri) return a.uri.localeCompare(b.uri);
    if (a.range.start.line !== b.range.start.line) {
      return a.range.start.line - b.range.start.line;
    }
    return a.range.start.character - b.range.start.character;
  });
}

export function formatReferences(locations: LSPLocation[], maxResults = 50): string {
  const sorted = sortReferences(locations);
  const display = sorted.slice(0, maxResults);
  const lines: string[] = [];

  let currentFile = '';
  for (const loc of display) {
    const fileName = loc.uri.split('/').pop() ?? loc.uri;
    if (fileName !== currentFile) {
      currentFile = fileName;
      lines.push(`\n${fileName}:`);
    }
    const line = loc.range.start.line + 1;
    const col = loc.range.start.character + 1;
    lines.push(`  ${line}:${col}`);
  }

  if (sorted.length > maxResults) {
    lines.push(`\n... and ${sorted.length - maxResults} more references`);
  }

  return lines.join('\n');
}

export function createReferenceSummary(locations: LSPLocation[]): {
  totalCount: number;
  fileCount: number;
  files: string[];
} {
  const files = new Set<string>();
  for (const loc of locations) {
    files.add(loc.uri);
  }

  return {
    totalCount: locations.length,
    fileCount: files.size,
    files: Array.from(files),
  };
}

export function filterReferencesByFile(locations: LSPLocation[], fileUri: string): LSPLocation[] {
  return locations.filter((loc) => loc.uri === fileUri);
}

export function findReferencesAtPosition(
  locations: LSPLocation[],
  fileUri: string,
  position: LSPPosition,
): LSPLocation[] {
  return locations.filter(
    (loc) =>
      loc.uri === fileUri &&
      loc.range.start.line === position.line &&
      loc.range.start.character === position.character,
  );
}
