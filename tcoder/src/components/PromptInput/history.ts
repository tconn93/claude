const MAX_HISTORY = 500;

export interface InputHistory {
  items: string[];
  index: number;
  add: (entry: string) => void;
  prev: () => string | null;
  next: () => string | null;
  reset: () => void;
  search: (prefix: string) => string[];
  clear: () => void;
}

export function createInputHistory(existing: string[] = []): InputHistory {
  const items: string[] = [...existing];
  let index = items.length;

  return {
    items,
    index,

    add(entry: string) {
      const trimmed = entry.trim();
      if (!trimmed) return;
      // Avoid duplicate consecutive entries
      if (items.length > 0 && items[items.length - 1] === trimmed) return;
      items.push(trimmed);
      if (items.length > MAX_HISTORY) {
        items.shift();
      }
      index = items.length;
    },

    prev() {
      if (items.length === 0) return null;
      index = Math.max(0, index - 1);
      return items[index] ?? null;
    },

    next() {
      if (items.length === 0) return null;
      index = Math.min(items.length, index + 1);
      if (index >= items.length) {
        return null; // past the end = empty input
      }
      return items[index] ?? null;
    },

    reset() {
      index = items.length;
    },

    search(prefix: string) {
      const lower = prefix.toLowerCase();
      return items
        .filter((item) => item.toLowerCase().startsWith(lower))
        .slice(-10)
        .reverse();
    },

    clear() {
      items.length = 0;
      index = 0;
    },
  };
}
