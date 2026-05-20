import { useEffect, useRef } from 'react';

export function useAsyncEffect(
  fn: (signal: AbortSignal) => Promise<void>,
  deps: unknown[] = [],
): void {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const controller = new AbortController();
    fnRef.current(controller.signal).catch(() => {
      // intentionally swallow - cleanup will handle
    });
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
