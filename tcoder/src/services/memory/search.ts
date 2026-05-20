import type { Memory, MemoryCategory, MemorySearchResult } from './types.ts';
import { MemoryStorage } from './storage.ts';

export class MemorySearch {
  private storage: MemoryStorage;

  constructor(storage: MemoryStorage) {
    this.storage = storage;
  }

  search(
    keyword: string,
    options?: {
      category?: MemoryCategory;
      limit?: number;
      minImportance?: number;
    },
  ): MemorySearchResult[] {
    const allMemories = this.storage.getAll();
    const lower = keyword.toLowerCase();
    const tokens = lower.split(/\s+/).filter((t) => t.length > 0);

    const results: MemorySearchResult[] = [];

    for (const memory of allMemories) {
      if (options?.category && memory.category !== options.category) {
        continue;
      }

      if (options?.minImportance && memory.importance < options.minImportance) {
        continue;
      }

      const score = this.calculateScore(memory, tokens, lower);

      if (score > 0) {
        results.push({ memory, score });
      }
    }

    results.sort((a, b) => b.score - a.score);

    const limit = options?.limit ?? 20;
    return results.slice(0, limit);
  }

  semanticSearch(
    query: string,
    options?: {
      category?: MemoryCategory;
      limit?: number;
      threshold?: number;
    },
  ): MemorySearchResult[] {
    // Simple TF-IDF-like keyword matching
    const allMemories = this.storage.getAll();
    const lower = query.toLowerCase();
    const queryTokens = lower.split(/\s+/).filter((t) => t.length > 0);

    const results: MemorySearchResult[] = [];

    for (const memory of allMemories) {
      if (options?.category && memory.category !== options.category) {
        continue;
      }

      const memoryTokens = memory.content.toLowerCase().split(/\s+/);
      const tokenSet = new Set(memoryTokens);

      let matches = 0;
      for (const qt of queryTokens) {
        if (tokenSet.has(qt)) matches++;
      }

      const jaccard = queryTokens.length > 0
        ? matches / (queryTokens.length + memoryTokens.length - matches)
        : 0;

      const score = jaccard * 10 + (memory.importance / 10);

      const threshold = options?.threshold ?? 0.1;
      if (score >= threshold) {
        results.push({ memory, score });
      }
    }

    results.sort((a, b) => b.score - a.score);

    return results.slice(0, options?.limit ?? 20);
  }

  private calculateScore(memory: Memory, tokens: string[], lowerQuery: string): number {
    let score = 0;
    const memoryText = `${memory.content} ${memory.tags.join(' ')} ${memory.category}`.toLowerCase();

    // Exact match bonus
    if (memoryText.includes(lowerQuery)) {
      score += 10;
    }

    // Token match scoring
    for (const token of tokens) {
      if (memoryText.includes(token)) {
        score += 5;
      }

      // Tag matches are strong signals
      if (memory.tags.some((tag) => tag.toLowerCase().includes(token))) {
        score += 8;
      }
    }

    // Recency bonus
    const ageHours = (Date.now() - memory.updatedAt) / (1000 * 60 * 60);
    if (ageHours < 1) score += 3;
    else if (ageHours < 24) score += 2;
    else if (ageHours < 168) score += 1;

    // Importance bonus
    score += memory.importance / 10;

    return score;
  }
}
