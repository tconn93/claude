export interface Keybinding {
  keys: string;
  command: string;
  description: string;
  when?: string;
  args?: Record<string, unknown>;
}

export interface KeybindingContext {
  mode: 'normal' | 'insert' | 'command' | 'visual';
  inputFocused: boolean;
  menuOpen: boolean;
  isThinking: boolean;
}

export interface ParsedKeybinding {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

export const DEFAULT_KEYBINDINGS: Keybinding[] = [
  { keys: 'ctrl+c', command: 'interrupt', description: 'Interrupt current operation' },
  { keys: 'ctrl+d', command: 'exit', description: 'Exit tcoder' },
  { keys: 'ctrl+l', command: 'clear', description: 'Clear screen' },
  { keys: 'ctrl+r', command: 'searchHistory', description: 'Search input history' },
  { keys: 'ctrl+u', command: 'clearLine', description: 'Clear current line' },
  { keys: 'ctrl+w', command: 'deleteWord', description: 'Delete previous word' },
  { keys: 'ctrl+a', command: 'lineStart', description: 'Move to line start' },
  { keys: 'ctrl+e', command: 'lineEnd', description: 'Move to line end' },
  { keys: 'ctrl+k', command: 'deleteToEnd', description: 'Delete to end of line' },
  { keys: 'up', command: 'historyUp', description: 'Previous input' },
  { keys: 'down', command: 'historyDown', description: 'Next input' },
  { keys: 'tab', command: 'autocomplete', description: 'Autocomplete' },
  { keys: 'escape', command: 'cancel', description: 'Cancel/escape' },
  { keys: 'ctrl+n', command: 'nextSuggestion', description: 'Next suggestion' },
  { keys: 'ctrl+p', command: 'prevSuggestion', description: 'Previous suggestion' },
];

export function parseKeybinding(keyString: string): ParsedKeybinding {
  const parts = keyString.toLowerCase().split('+');
  const result: ParsedKeybinding = {
    key: parts[parts.length - 1]!,
    ctrl: parts.includes('ctrl'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('super'),
  };
  return result;
}

export function matchKeybinding(
  parsed: ParsedKeybinding,
  binding: string,
): boolean {
  const target = parseKeybinding(binding);
  return (
    parsed.key === target.key &&
    parsed.ctrl === target.ctrl &&
    parsed.alt === target.alt &&
    parsed.shift === target.shift &&
    parsed.meta === target.meta
  );
}
