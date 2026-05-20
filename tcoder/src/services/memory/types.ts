export type MemoryCategory =
  | 'fact'
  | 'preference'
  | 'convention'
  | 'pattern'
  | 'decision'
  | 'context'
  | 'task'
  | 'relationship';

export interface Memory {
  id: string;
  category: MemoryCategory;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  importance: number;
  ttl?: number;
  source?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryQuery {
  category?: MemoryCategory | MemoryCategory[];
  tags?: string[];
  keyword?: string;
  since?: number;
  before?: number;
  minImportance?: number;
  source?: string;
  sessionId?: string;
  limit?: number;
}

export interface MemorySearchResult {
  memory: Memory;
  score: number;
}

export interface MemoryStats {
  totalCount: number;
  categoryCounts: Record<MemoryCategory, number>;
  oldestEntry: number;
  newestEntry: number;
  averageImportance: number;
  totalSizeBytes: number;
}
