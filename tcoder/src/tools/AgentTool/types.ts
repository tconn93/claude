export type AgentType = 'explore' | 'executor' | 'architect' | 'planner' | 'reviewer' | 'general';

export interface AgentInput {
  type: AgentType;
  task: string;
  model?: string;
  maxTurns?: number;
  contextFiles?: string[];
  workingDirectory?: string;
}
