import type { Memory, MemoryCategory, MemoryQuery, MemorySearchResult, MemoryStats } from './types.ts';
import { MemoryStorage } from './storage.ts';
import { MemorySearch } from './search.ts';

let idCounter = 0;

export class MemoryManager {
  private storage: MemoryStorage;
  private search: MemorySearch;

  constructor(storage?: MemoryStorage, search?: MemorySearch) {
    this.storage = storage ?? new MemoryStorage();
    this.search = search ?? new MemorySearch(this.storage);
  }

  async add(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Memory> {
    const entry: Memory = {
      ...memory,
      id: `mem_${++idCounter}_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.storage.add(entry);
    return entry;
  }

  async update(id: string, updates: Partial<Omit<Memory, 'id' | 'createdAt'>>): Promise<Memory | null> {
    const existing = this.storage.get(id);
    if (!existing) return null;

    const updated: Memory = {
      ...existing,
      ...updates,
      id,
      updatedAt: Date.now(),
    };

    this.storage.update(id, updated);
    return updated;
  }

  async get(id: string): Promise<Memory | null> {
    return this.storage.get(id);
  }

  async query(query: MemoryQuery = {}): Promise<Memory[]> {
    return this.storage.query(query);
  }

  async search(keyword: string, options?: { category?: MemoryCategory; limit?: number; minImportance?: number }): Promise<MemorySearchResult[]> {
    return this.search.search(keyword, options);
  }

  async delete(id: string): Promise<boolean> {
    return this.storage.delete(id);
  }

  async deleteByCategory(category: MemoryCategory): Promise<number> {
    return this.storage.deleteByCategory(category);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async getStats(): Promise<MemoryStats> {
    return this.storage.getStats();
  }

  async getByTag(tag: string): Promise<Memory[]> {
    return this.storage.getByTag(tag);
  }

  async getByCategory(category: MemoryCategory): Promise<Memory[]> {
    return this.storage.getByCategory(category);
  }

  async getBySession(sessionId: string): Promise<Memory[]> {
    return this.storage.getBySession(sessionId);
  }

  async getImportant(minImportance?: number): Promise<Memory[]> {
    return this.storage.getImportant(minImportance);
  }

  async getExpired(): Promise<Memory[]> {
    return this.storage.getExpired();
  }

  async pruneExpired(): Promise<number> {
    return this.storage.pruneExpired();
  }

  async getAll(): Promise<Memory[]> {
    return this.storage.getAll();
  }

  async batchAdd(memories: Array<Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Memory[]> {
    const results: Memory[] = [];
    for (const mem of memories) {
      results.push(await this.add(mem));
    }
    return results;
  }

  async getStorage(): Promise<MemoryStorage> {
    return this.storage;
  }
}

export const memoryManager = new MemoryManager();
