import type { ToolProgress } from '../../types/tool.ts';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'blocked';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  assignedTo?: string;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  assignedTo?: string;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface TaskListInput {
  status?: TaskStatus;
  assignedTo?: string;
  limit?: number;
}

export interface TaskGetInput {
  id: string;
}

export interface TaskUpdateInput {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  assignedTo?: string;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export type TaskProgress = ToolProgress & { type: 'task'; taskId: string };
