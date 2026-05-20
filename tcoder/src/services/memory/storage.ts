import type { Memory, MemoryCategory, MemoryQuery, MemoryStats } from './types.ts';

export class MemoryStorage {
  private memories = new Map<string, Memory>();

  add(memory: Memory): void {
    this.memories.set(memory.id, memory);
  }

  update(id: string, memory: Memory): void {
    if (this.memories.has(id)) {
      this.memories.set(id, memory);
    }
  }

  get(id: string): Memory | null {
    return this.memories.get(id) ?? null;
  }

  delete(id: string): boolean {
    return this.memories.delete(id);
  }

  getAll(): Memory[] {
    return Array.from(this.memories.values());
  }

  query(query: MemoryQuery): Memory[] {
    let results = this.getAll();

    if (query.category) {
      const categories = Array.isArray(query.category) ? query.category : [query.category];
      results = results.filter((m) => categories.includes(m.category));
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter((m) => query.tags!.some((tag) => m.tags.includes(tag)));
    }

    if (query.keyword) {
      const lower = query.keyword.toLowerCase();
      results = results.filter((m) =>
        m.content.toLowerCase().includes(lower) ||
        m.tags.some((tag) => tag.toLowerCase().includes(lower)),
      );
    }

    if (query.since) {
      results = results.filter((m) => m.updatedAt >= query.since!);
    }

    if (query.before) {
      results = results.filter((m) => m.updatedAt <= query.before!);
    }

    if (query.minImportance !== undefined) {
      results = results.filter((m) => m.importance >= query.minImportance!);
    }

    if (query.source) {
      results = results.filter((m) => m.source === query.source);
    }

    if (query.sessionId) {
      results = results.filter((m) => m.sessionId === query.sessionId);
    }

    results.sort((a, b) => b.updatedAt - a.updatedAt);

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  getByTag(tag: string): Memory[] {
    return this.getAll().filter((m) => m.tags.includes(tag));
  }

  getByCategory(category: MemoryCategory): Memory[] {
    return this.getAll().filter((m) => m.category === category);
  }

  getBySession(sessionId: string): Memory[] {
    return this.getAll().filter((m) => m.sessionId === sessionId);
  }

  getImportant(minImportance = 7): Memory[] {
    return this.getAll().filter((m) => m.importance >= minImportance);
  }

  getExpired(): Memory[] {
    const now = Date.now();
    return this.getAll().filter((m) => m.ttl && m.createdAt + m.ttl < now);
  }

  deleteByCategory(category: MemoryCategory): number {
    const toRemove = this.getAll().filter((m) => m.category === category);
    for (const mem of toRemove) {
      this.memories.delete(mem.id);
    }
    return toRemove.length;
  }

  pruneExpired(): number {
    const expired = this.getExpired();
    for (const mem of expired) {
      this.memories.delete(mem.id);
    }
    return expired.length;
  }

  clear(): void {
    this.memories.clear();
  }

  getStats(): MemoryStats {
    const all = this.getAll();

    const categoryCounts: Record<MemoryCategory, number> = {
      fact: 0,
      preference: 0,
      convention: 0,
      pattern: 0,
      decision: 0,
      context: 0,
      task: 0,
      relationship: 0,
    };

    let totalSizeBytes = 0;
    let totalImportance = 0;
    let oldestEntry = Infinity;
    let newestEntry = 0;

    for (const mem of all) {
      categoryCounts[mem.category] = (categoryCounts[mem.category] ?? 0) + 1;
      totalImportance += mem.importance;
      totalSizeBytes += Buffer.byteLength(mem.content);
      oldestEntry = Math.min(oldestEntry, mem.createdAt);
      newestEntry = Math.max(newestEntry, mem.createdAt);
    }

    return {
      totalCount: all.length,
      categoryCounts,
      oldestEntry: oldestEntry === Infinity ? 0 : oldestEntry,
      newestEntry,
      averageImportance: all.length > 0 ? totalImportance / all.length : 0,
      totalSizeBytes,
    };
  }
}
