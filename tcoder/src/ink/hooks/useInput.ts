import { useState, useEffect, useCallback, useRef } from 'react';

export interface InputState {
  value: string;
  cursor: number;
}

export function useInput(
  stdin: NodeJS.ReadStream,
  onChange?: (value: string) => void,
  onSubmit?: (value: string) => void,
): {
  value: string;
  cursor: number;
  setValue: (value: string) => void;
  setCursor: (pos: number) => void;
  handleData: (data: Buffer) => void;
} {
  const [value, setValue] = useState('');
  const [cursor, setCursor] = useState(0);
  const valueRef = useRef(value);
  const cursorRef = useRef(cursor);

  valueRef.current = value;
  cursorRef.current = cursor;

  const handleData = useCallback(
    (data: Buffer) => {
      const str = data.toString();
      for (const char of str) {
        const code = char.charCodeAt(0);

        // Enter
        if (code === 13) {
          const current = valueRef.current;
          onSubmit?.(current);
          setValue('');
          setCursor(0);
          return;
        }

        // Backspace
        if (code === 127) {
          const current = valueRef.current;
          const pos = cursorRef.current;
          if (pos > 0) {
            const newValue = current.slice(0, pos - 1) + current.slice(pos);
            setValue(newValue);
            setCursor(pos - 1);
            onChange?.(newValue);
          }
          continue;
        }

        // Ctrl+C
        if (code === 3) {
          process.exit(0);
        }

        // Ctrl+D (EOF)
        if (code === 4) {
          process.exit(0);
        }

        // Left arrow
        if (code === 27 && str.includes('[')) {
          const seq = str.split('[')[1];
          if (seq === 'D') {
            setCursor(Math.max(0, cursorRef.current - 1));
          } else if (seq === 'C') {
            setCursor(Math.min(valueRef.current.length, cursorRef.current + 1));
          }
          continue;
        }

        // Regular character
        if (code >= 32) {
          const current = valueRef.current;
          const pos = cursorRef.current;
          const newValue = current.slice(0, pos) + char + current.slice(pos);
          setValue(newValue);
          setCursor(pos + 1);
          onChange?.(newValue);
        }
      }
    },
    [onChange, onSubmit],
  );

  useEffect(() => {
    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.on('data', handleData);

    return () => {
      stdin.off('data', handleData);
    };
  }, [stdin, handleData]);

  return { value, cursor, setValue, setCursor, handleData };
}
