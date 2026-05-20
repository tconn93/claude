import { useEffect, useCallback, useRef } from 'react';

export type KeyHandler = (key: string, ctrl: boolean, alt: boolean, shift: boolean) => void;

export interface Keybinding {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  handler: () => void;
  description: string;
}

export function useKeybinding(
  bindings: Keybinding[],
  enabled: boolean = true,
): void {
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  const handleData = useCallback(
    (data: Buffer) => {
      if (!enabled) return;
      const str = data.toString();
      let ctrl = false;
      let alt = false;
      let shift = false;
      let key = str;

      // Ctrl+key detection (1-26 are ctrl+A through ctrl+Z)
      if (str.length === 1) {
        const code = str.charCodeAt(0);
        if (code >= 1 && code <= 26) {
          ctrl = true;
          key = String.fromCharCode(code + 64);
        }
      }

      // Escape sequences
      if (str.startsWith('\x1b')) {
        if (str === '\x1b') {
          key = 'escape';
        }
      }

      for (const binding of bindingsRef.current) {
        if (binding.key === key && binding.ctrl === ctrl) {
          binding.handler();
          return;
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    process.stdin.on('data', handleData);
    return () => {
      process.stdin.off('data', handleData);
    };
  }, [handleData]);
}
