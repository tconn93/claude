import type { Keybinding } from '../hooks/useKeybinding.ts';

export interface ParsedKey {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

export function parseKeybinding(definition: string): ParsedKey {
  const parts = definition.toLowerCase().split('+');
  const result: ParsedKey = {
    key: '',
    ctrl: false,
    alt: false,
    shift: false,
  };

  for (const part of parts) {
    switch (part.trim()) {
      case 'ctrl':
      case 'control':
        result.ctrl = true;
        break;
      case 'alt':
      case 'option':
        result.alt = true;
        break;
      case 'shift':
        result.shift = true;
        break;
      default:
        result.key = part.trim();
    }
  }

  return result;
}

export function formatKeybinding(binding: Keybinding): string {
  const parts: string[] = [];
  if (binding.ctrl) parts.push('Ctrl');
  if (binding.alt) parts.push('Alt');
  if (binding.shift) parts.push('Shift');
  parts.push(binding.key.length === 1 ? binding.key.toUpperCase() : binding.key);
  return parts.join('+');
}

export function parseConfigBindings(raw: Record<string, string>): ParsedKey[] {
  return Object.entries(raw).map(([action, def]) => {
    const parsed = parseKeybinding(def);
    return parsed;
  });
}
