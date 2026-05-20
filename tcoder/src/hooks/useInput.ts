import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseInputOptions {
  onSubmit: (value: string) => void;
  initialValue?: string;
}

export function useInput({ onSubmit, initialValue = '' }: UseInputOptions): {
  value: string;
  setValue: (v: string) => void;
  cursor: number;
  setCursor: (p: number) => void;
  handleKey: (key: string) => void;
} {
  const [value, setValue] = useState(initialValue);
  const [cursor, setCursor] = useState(initialValue.length);
  const valueRef = useRef(value);
  const cursorRef = useRef(cursor);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  const handleKey = useCallback(
    (key: string) => {
      if (key === '\r' || key === '\n') {
        onSubmit(valueRef.current);
        setValue('');
        setCursor(0);
        return;
      }

      if (key === '\x7f' || key === '\b') {
        const cur = cursorRef.current;
        const val = valueRef.current;
        if (cur > 0) {
          const next = val.slice(0, cur - 1) + val.slice(cur);
          setValue(next);
          setCursor(cur - 1);
        }
        return;
      }

      if (key === '\x03') {
        process.exit(0);
      }

      if (key.length === 1 && key.charCodeAt(0) >= 32) {
        const cur = cursorRef.current;
        const val = valueRef.current;
        const next = val.slice(0, cur) + key + val.slice(cur);
        setValue(next);
        setCursor(cur + 1);
      }
    },
    [onSubmit],
  );

  return { value, setValue, cursor, setCursor, handleKey };
}
