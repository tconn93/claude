export interface TodoItem {
  id: string;
  text: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  dependsOn?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TodoWriteInput {
  todos: Array<{
    id: string;
    text: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority?: 'low' | 'medium' | 'high';
    dependsOn?: string[];
  }>;
}
