import type { ToolDefinition } from '../types/tool.ts';
import type { Message } from '../types/message.ts';

export interface AgentTask {
  id: string;
  description: string;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  dependencies: string[];
}

export interface SubAgent {
  id: string;
  name: string;
  type: string;
  model: string;
  status: 'idle' | 'working' | 'done' | 'error';
  currentTask?: string;
  completedTasks: string[];
}

export interface CoordinatorConfig {
  maxParallelAgents: number;
  defaultModel: string;
  tools: ToolDefinition[];
  systemPrompt: string;
}

export interface CoordinatorState {
  agents: Map<string, SubAgent>;
  tasks: Map<string, AgentTask>;
  messages: Message[];
  isComplete: boolean;
  result?: string;
}

export function createCoordinatorState(): CoordinatorState {
  return {
    agents: new Map(),
    tasks: new Map(),
    messages: [],
    isComplete: false,
  };
}

export function getNextPendingTask(state: CoordinatorState): AgentTask | undefined {
  for (const task of state.tasks.values()) {
    if (
      task.status === 'pending' &&
      task.dependencies.every((depId) => state.tasks.get(depId)?.status === 'completed')
    ) {
      return task;
    }
  }
  return undefined;
}

export function getIdleAgent(state: CoordinatorState): SubAgent | undefined {
  for (const agent of state.agents.values()) {
    if (agent.status === 'idle') return agent;
  }
  return undefined;
}

export function isAllWorkComplete(state: CoordinatorState): boolean {
  for (const task of state.tasks.values()) {
    if (task.status !== 'completed' && task.status !== 'failed') return false;
  }
  return true;
}
