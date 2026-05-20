export interface FileStateEntry {
  path: string;
  content: string;
  lastModified: number;
  size: number;
  exists: boolean;
  hash: string;
}

export class FileStateCache {
  private cache: Map<string, FileStateEntry> = new Map();
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  get(path: string): FileStateEntry | undefined {
    return this.cache.get(path);
  }

  set(path: string, entry: FileStateEntry): void {
    this.cache.set(path, entry);
    this.pruneExcess();
  }

  has(path: string): boolean {
    return this.cache.has(path);
  }

  remove(path: string): boolean {
    return this.cache.delete(path);
  }

  clear(): void {
    this.cache.clear();
  }

  getContent(path: string): string | undefined {
    return this.cache.get(path)?.content;
  }

  isStale(path: string, currentModified: number): boolean {
    const entry = this.cache.get(path);
    if (!entry) return true;
    return entry.lastModified !== currentModified;
  }

  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  get size(): number {
    return this.cache.size;
  }

  get entries(): FileStateEntry[] {
    return Array.from(this.cache.values());
  }

  snapshot(): Record<string, string> {
    const snap: Record<string, string> = {};
    for (const [key, entry] of this.cache) {
      snap[key] = entry.content;
    }
    return snap;
  }

  private pruneExcess(): void {
    if (this.cache.size <= this.maxEntries) return;

    const entriesToRemove = this.cache.size - this.maxEntries;
    const keys = Array.from(this.cache.keys());

    for (let i = 0; i < entriesToRemove && i < keys.length; i++) {
      this.cache.delete(keys[i]);
    }
  }
}

export function createFileStateCache(maxEntries?: number): FileStateCache {
  return new FileStateCache(maxEntries);
}

export function computeContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
