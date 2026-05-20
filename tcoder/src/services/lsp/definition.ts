import type { LSPLocation, LSPPosition } from './client.ts';

export interface DefinitionResult {
  location: LSPLocation | null;
  locations: LSPLocation[];
}

export function parseDefinitionResult(raw: unknown): DefinitionResult {
  if (!raw) {
    return { location: null, locations: [] };
  }

  if (Array.isArray(raw)) {
    return {
      location: raw[0] ?? null,
      locations: raw as LSPLocation[],
    };
  }

  const loc = raw as LSPLocation;
  return {
    location: loc,
    locations: [loc],
  };
}

export function formatDefinition(location: LSPLocation): string {
  const fileName = location.uri.split('/').pop() ?? location.uri;
  const line = location.range.start.line + 1;
  const col = location.range.start.character + 1;
  return `${fileName}:${line}:${col}`;
}

export function formatDefinitions(locations: LSPLocation[]): string {
  if (locations.length === 0) {
    return 'No definitions found';
  }

  if (locations.length === 1) {
    return `Definition: ${formatDefinition(locations[0])}`;
  }

  const lines = locations.map((loc, i) => `${i + 1}. ${formatDefinition(loc)}`);
  return `Definitions (${locations.length}):\n${lines.join('\n')}`;
}

export function isSameLocation(a: LSPLocation, b: LSPLocation): boolean {
  return (
    a.uri === b.uri &&
    a.range.start.line === b.range.start.line &&
    a.range.start.character === b.range.start.character
  );
}

export function deduplicateLocations(locations: LSPLocation[]): LSPLocation[] {
  const seen = new Set<string>();
  return locations.filter((loc) => {
    const key = `${loc.uri}:${loc.range.start.line}:${loc.range.start.character}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sortLocations(locations: LSPLocation[]): LSPLocation[] {
  return [...locations].sort((a, b) => {
    if (a.uri !== b.uri) return a.uri.localeCompare(b.uri);
    if (a.range.start.line !== b.range.start.line) {
      return a.range.start.line - b.range.start.line;
    }
    return a.range.start.character - b.range.start.character;
  });
}
