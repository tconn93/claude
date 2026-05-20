import { useRef, useCallback, useEffect } from 'react';
import type { MutableRefObject } from 'react';

export function useAutoScroll(
  items: unknown[],
  enabled: boolean = true,
): {
  scrollRef: MutableRefObject<number>;
  scrollToBottom: () => void;
  isAtBottom: () => boolean;
} {
  const scrollRef = useRef(0);
  const isAtBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    scrollRef.current = items.length;
    isAtBottomRef.current = true;
  }, [items.length]);

  const isAtBottom = useCallback(() => {
    return isAtBottomRef.current;
  }, []);

  useEffect(() => {
    if (enabled && isAtBottomRef.current) {
      scrollRef.current = items.length;
    }
  }, [items.length, enabled]);

  return { scrollRef, scrollToBottom, isAtBottom };
}
