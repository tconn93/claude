export interface FileEdit {
  id: string;
  filePath: string;
  timestamp: number;
  description: string;
  oldContent: string;
  newContent: string;
  diff: string;
  reverted: boolean;
}

export class FileHistory {
  private edits: FileEdit[] = [];
  private maxEntries: number;
  private editIdCounter = 0;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  record(
    filePath: string,
    description: string,
    oldContent: string,
    newContent: string,
    diff?: string,
  ): FileEdit {
    const edit: FileEdit = {
      id: `edit_${++this.editIdCounter}_${Date.now()}`,
      filePath,
      timestamp: Date.now(),
      description,
      oldContent,
      newContent,
      diff: diff ?? '',
      reverted: false,
    };

    this.edits.push(edit);
    this.pruneExcess();
    return edit;
  }

  getLastEdit(filePath?: string): FileEdit | undefined {
    if (filePath) {
      return this.edits.filter(e => e.filePath === filePath && !e.reverted).at(-1);
    }
    return this.edits.filter(e => !e.reverted).at(-1);
  }

  getEditsForFile(filePath: string): FileEdit[] {
    return this.edits.filter(e => e.filePath === filePath);
  }

  revertLastEdit(filePath?: string): FileEdit | null {
    const edit = this.getLastEdit(filePath);
    if (!edit) return null;

    edit.reverted = true;
    return edit;
  }

  getRecentEdits(limit = 50): FileEdit[] {
    return this.edits.slice(-limit);
  }

  getEditsSince(timestamp: number): FileEdit[] {
    return this.edits.filter(e => e.timestamp >= timestamp);
  }

  getEditedFiles(): string[] {
    const files = new Set<string>();
    for (const edit of this.edits) {
      files.add(edit.filePath);
    }
    return Array.from(files);
  }

  getEditCount(filePath?: string): number {
    if (filePath) {
      return this.edits.filter(e => e.filePath === filePath).length;
    }
    return this.edits.length;
  }

  clear(): void {
    this.edits = [];
    this.editIdCounter = 0;
  }

  toJSON(): FileEdit[] {
    return [...this.edits];
  }

  get size(): number {
    return this.edits.length;
  }

  private pruneExcess(): void {
    if (this.edits.length > this.maxEntries) {
      this.edits = this.edits.slice(-this.maxEntries);
    }
  }
}

export function createFileHistory(maxEntries?: number): FileHistory {
  return new FileHistory(maxEntries);
}
