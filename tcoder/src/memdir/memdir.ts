import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { CLAUDE_CONFIG_DIR, MEMORY_DIR } from '../constants/common.ts';

export interface MemoryEntry {
  name: string;
  description: string;
  type: 'user' | 'feedback' | 'project' | 'reference';
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryIndex {
  entries: MemoryIndexEntry[];
  updatedAt: number;
}

export interface MemoryIndexEntry {
  name: string;
  file: string;
  description: string;
}

export function getMemoryDir(homeDir: string): string {
  return join(homeDir, CLAUDE_CONFIG_DIR, MEMORY_DIR);
}

export async function ensureMemoryDir(memDir: string): Promise<void> {
  await mkdir(memDir, { recursive: true });
}

export async function readMemoryIndex(memDir: string): Promise<MemoryIndex> {
  try {
    const content = await readFile(join(memDir, 'MEMORY.md'), 'utf-8');
    return parseIndexMarkdown(content);
  } catch {
    return { entries: [], updatedAt: Date.now() };
  }
}

export async function writeMemoryIndex(memDir: string, index: MemoryIndex): Promise<void> {
  const lines = ['# Memory Index\n'];
  for (const entry of index.entries) {
    lines.push(`- [${entry.name}](${entry.file}) — ${entry.description}`);
  }
  await writeFile(join(memDir, 'MEMORY.md'), lines.join('\n') + '\n');
}

export async function readMemoryEntry(memDir: string, filename: string): Promise<MemoryEntry | null> {
  try {
    const content = await readFile(join(memDir, filename), 'utf-8');
    return parseEntryMarkdown(content);
  } catch {
    return null;
  }
}

export async function writeMemoryEntry(
  memDir: string,
  entry: MemoryEntry,
): Promise<void> {
  const now = Date.now();
  const frontmatter = [
    '---',
    `name: ${entry.name}`,
    `description: ${entry.description}`,
    'metadata:',
    `  type: ${entry.type}`,
    `  createdAt: ${entry.createdAt || now}`,
    `  updatedAt: ${now}`,
    '---',
    '',
    entry.content,
  ].join('\n');

  await writeFile(join(memDir, `${entry.name}.md`), frontmatter);
}

export async function deleteMemoryEntry(memDir: string, filename: string): Promise<void> {
  await rm(join(memDir, filename), { force: true });
}

export async function findRelevantMemories(
  memDir: string,
  query: string,
  limit = 10,
): Promise<MemoryEntry[]> {
  const index = await readMemoryIndex(memDir);
  const results: MemoryEntry[] = [];

  const queryLower = query.toLowerCase();
  const scored = index.entries
    .map((entry) => {
      let score = 0;
      const desc = entry.description.toLowerCase();
      if (desc.includes(queryLower)) score += 10;
      for (const word of queryLower.split(/\s+/)) {
        if (desc.includes(word)) score += 2;
        if (entry.name.toLowerCase().includes(word)) score += 3;
      }
      return { entry, score };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  for (const { entry } of scored) {
    const memory = await readMemoryEntry(memDir, entry.file);
    if (memory) results.push(memory);
  }

  return results;
}

function parseIndexMarkdown(content: string): MemoryIndex {
  const entries: MemoryIndexEntry[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^-\s+\[([^\]]+)\]\(([^)]+)\)\s+[—–-]\s+(.+)$/);
    if (match) {
      entries.push({
        name: match[1]!,
        file: match[2]!,
        description: match[3]!,
      });
    }
  }
  return { entries, updatedAt: Date.now() };
}

function parseEntryMarkdown(content: string): MemoryEntry | null {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return null;

  const frontmatter = fmMatch[1]!;
  const body = fmMatch[2]!;

  const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim() || '';
  const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim() || '';
  const typeMatch = frontmatter.match(/^\s*type:\s*(.+)$/m);
  const type = (typeMatch?.[1]?.trim() || 'user') as MemoryEntry['type'];
  const createdAt = parseInt(
    frontmatter.match(/^\s*createdAt:\s*(\d+)$/m)?.[1] || String(Date.now()),
  );
  const updatedAt = parseInt(
    frontmatter.match(/^\s*updatedAt:\s*(\d+)$/m)?.[1] || String(Date.now()),
  );

  return {
    name,
    description,
    type,
    content: body.trim(),
    createdAt,
    updatedAt,
  };
}
