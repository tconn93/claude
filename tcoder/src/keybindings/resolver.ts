import type { Keybinding } from '../hooks/useKeybinding.ts';
import type { ParsedKey } from './parser.ts';
import { parseKeybinding } from './parser.ts';

export interface KeybindingResolver {
  resolve: (key: string, ctrl: boolean, alt: boolean, shift: boolean) => Keybinding | null;
  addBinding: (binding: Keybinding) => void;
  removeBinding: (key: string, ctrl?: boolean, alt?: boolean, shift?: boolean) => void;
  list: () => Keybinding[];
}

export function createKeybindingResolver(
  initialBindings: Keybinding[] = [],
): KeybindingResolver {
  const bindings = new Map<string, Keybinding>();

  function bindingKey(key: string, ctrl: boolean, alt: boolean, shift: boolean): string {
    return `${ctrl ? 'c' : ''}${alt ? 'a' : ''}${shift ? 's' : ''}:${key}`;
  }

  for (const b of initialBindings) {
    bindings.set(bindingKey(b.key, b.ctrl ?? false, b.alt ?? false, b.shift ?? false), b);
  }

  return {
    resolve(key: string, ctrl: boolean, alt: boolean, shift: boolean): Keybinding | null {
      const k = bindingKey(key, ctrl, alt, shift);
      return bindings.get(k) ?? null;
    },

    addBinding(binding: Keybinding): void {
      bindings.set(
        bindingKey(binding.key, binding.ctrl ?? false, binding.alt ?? false, binding.shift ?? false),
        binding,
      );
    },

    removeBinding(key: string, ctrl: boolean = false, alt: boolean = false, shift: boolean = false): void {
      bindings.delete(bindingKey(key, ctrl, alt, shift));
    },

    list(): Keybinding[] {
      return Array.from(bindings.values());
    },
  };
}
