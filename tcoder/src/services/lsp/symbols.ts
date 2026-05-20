import type { LSPPosition, LSPRange } from './client.ts';

export type SymbolKind =
  | 'file'
  | 'module'
  | 'namespace'
  | 'package'
  | 'class'
  | 'method'
  | 'property'
  | 'field'
  | 'constructor'
  | 'enum'
  | 'interface'
  | 'function'
  | 'variable'
  | 'constant'
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'key'
  | 'null'
  | 'enumMember'
  | 'struct'
  | 'event'
  | 'operator'
  | 'typeParameter';

export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: SymbolKind;
  range: LSPRange;
  selectionRange: LSPRange;
  children?: DocumentSymbol[];
  tags?: string[];
  deprecated?: boolean;
}

export function symbolKindFromNumber(kind: number): SymbolKind {
  const kindMap: Record<number, SymbolKind> = {
    1: 'file',
    2: 'module',
    3: 'namespace',
    4: 'package',
    5: 'class',
    6: 'method',
    7: 'property',
    8: 'field',
    9: 'constructor',
    10: 'enum',
    11: 'interface',
    12: 'function',
    13: 'variable',
    14: 'constant',
    15: 'string',
    16: 'number',
    17: 'boolean',
    18: 'array',
    19: 'object',
    20: 'key',
    21: 'null',
    22: 'enumMember',
    23: 'struct',
    24: 'event',
    25: 'operator',
    26: 'typeParameter',
  };
  return kindMap[kind] ?? 'variable';
}

export function symbolKindToIcon(kind: SymbolKind): string {
  const iconMap: Record<SymbolKind, string> = {
    file: 'F',
    module: 'M',
    namespace: 'N',
    package: 'P',
    class: 'C',
    method: 'm',
    property: 'p',
    field: 'f',
    constructor: 'c',
    enum: 'E',
    interface: 'I',
    function: 'f',
    variable: 'v',
    constant: 'k',
    string: 's',
    number: 'n',
    boolean: 'b',
    array: 'a',
    object: 'o',
    key: 'k',
    null: 'x',
    enumMember: 'e',
    struct: 'S',
    event: 'e',
    operator: 'o',
    typeParameter: 'T',
  };
  return iconMap[kind] ?? '?';
}

export function flattenSymbols(symbols: DocumentSymbol[]): DocumentSymbol[] {
  const result: DocumentSymbol[] = [];

  function flatten(sym: DocumentSymbol): void {
    result.push(sym);
    if (sym.children) {
      for (const child of sym.children) {
        flatten(child);
      }
    }
  }

  for (const sym of symbols) {
    flatten(sym);
  }

  return result;
}

export function findSymbolByName(symbols: DocumentSymbol[], name: string): DocumentSymbol | null {
  const flat = flattenSymbols(symbols);
  const lower = name.toLowerCase();
  return flat.find((s) => s.name.toLowerCase() === lower) ?? null;
}

export function findSymbolByKind(symbols: DocumentSymbol[], kind: SymbolKind): DocumentSymbol[] {
  return flattenSymbols(symbols).filter((s) => s.kind === kind);
}

export function formatSymbol(symbol: DocumentSymbol): string {
  const icon = symbolKindToIcon(symbol.kind);
  const line = symbol.range.start.line + 1;
  const detail = symbol.detail ? `: ${symbol.detail}` : '';
  return `[${icon}] ${symbol.name}${detail} (line ${line})`;
}

export function formatSymbolTree(symbols: DocumentSymbol[], indent = 0): string {
  const lines: string[] = [];

  for (const sym of symbols) {
    const prefix = '  '.repeat(indent);
    lines.push(prefix + formatSymbol(sym));
    if (sym.children && sym.children.length > 0) {
      lines.push(formatSymbolTree(sym.children, indent + 1));
    }
  }

  return lines.join('\n');
}

export function filterSymbolsByQuery(symbols: DocumentSymbol[], query: string): DocumentSymbol[] {
  const lower = query.toLowerCase();
  return flattenSymbols(symbols).filter(
    (s) =>
      s.name.toLowerCase().includes(lower) ||
      (s.detail?.toLowerCase().includes(lower) ?? false),
  );
}
