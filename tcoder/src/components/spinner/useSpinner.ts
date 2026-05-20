import { useState, useEffect, useRef } from 'react';
import { getFrames } from './frames.ts';

export function useSpinner(
  isActive: boolean,
  frameSet?: string,
  interval?: number,
): string {
  const [frameIndex, setFrameIndex] = useState(0);
  const frames = getFrames(frameSet);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setFrameIndex((prev) => (prev + 1) % frames.length);
      }, interval ?? 80);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setFrameIndex(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, frames.length, interval]);

  return isActive ? frames[frameIndex] : '';
}
