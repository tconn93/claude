export interface SkillInput {
  skill: string;
  args?: string;
}

export interface SkillInfo {
  name: string;
  description: string;
  triggers?: string[];
  tags?: string[];
  source: 'project' | 'user';
}
