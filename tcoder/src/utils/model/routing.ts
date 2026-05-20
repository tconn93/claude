import { getModelInfo, type ModelInfo } from './models.ts';

export type TaskComplexity = 'trivial' | 'simple' | 'moderate' | 'complex' | 'extreme';

export interface RoutingRule {
  complexity: TaskComplexity;
  modelId: string;
  maxTokens: number;
  thinking?: boolean;
}

const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  { complexity: 'trivial', modelId: 'grok-4', maxTokens: 1024 },
  { complexity: 'simple', modelId: 'grok-4', maxTokens: 4096 },
  { complexity: 'moderate', modelId: 'grok-4.3', maxTokens: 8192 },
  { complexity: 'complex', modelId: 'grok-4.3', maxTokens: 16384, thinking: true },
  { complexity: 'extreme', modelId: 'grok-4.3', maxTokens: 32768, thinking: true },
];

export function getModelForComplexity(complexity: TaskComplexity): RoutingRule {
  return (
    DEFAULT_ROUTING_RULES.find(r => r.complexity === complexity) ??
    DEFAULT_ROUTING_RULES[2]
  );
}

export function estimateComplexity(task: string): TaskComplexity {
  const indicators = {
    trivial: 0,
    simple: 0,
    moderate: 0,
    complex: 0,
    extreme: 0,
  };

  const words = task.toLowerCase().split(/\s+/);

  if (words.length < 5) indicators.trivial += 3;
  else if (words.length < 20) indicators.simple += 2;
  else if (words.length < 50) indicators.moderate += 2;
  else indicators.complex += 2;

  if (task.includes('?')) indicators.simple += 1;

  const complexKeywords = [
    'architecture', 'design', 'refactor', 'migrate', 'optimize',
    'security', 'debug', 'investigate', 'analyze', 'implement',
    'rewrite', 'restructure',
  ];
  for (const kw of complexKeywords) {
    if (words.includes(kw)) indicators.complex += 1;
  }

  const extremeKeywords = [
    'multi-system', 'end-to-end', 'full stack', 'pipeline',
    'infrastructure', 'orchestration', 'framework',
  ];
  for (const kw of extremeKeywords) {
    if (words.includes(kw)) indicators.extreme += 1;
  }

  const multiFileIndicators = [
    'across', 'multiple', 'several', 'many', 'all',
    'every', 'entire', 'database', 'api',
  ];
  const multiCount = multiFileIndicators.filter(kw => words.includes(kw)).length;
  if (multiCount >= 3) indicators.complex += 2;

  let maxScore = 0;
  let bestComplexity: TaskComplexity = 'simple';

  for (const [complexity, score] of Object.entries(indicators)) {
    if (score > maxScore) {
      maxScore = score;
      bestComplexity = complexity as TaskComplexity;
    }
  }

  return bestComplexity;
}

export function routeModel(
  task?: string,
  preferredModel?: string,
): { modelId: string; maxTokens: number; thinking: boolean } {
  if (preferredModel) {
    const info = getModelInfo(preferredModel);
    if (info) {
      return {
        modelId: info.id,
        maxTokens: info.maxOutputTokens,
        thinking: false,
      };
    }
  }

  if (!task) {
    const rule = getModelForComplexity('moderate');
    return { modelId: rule.modelId, maxTokens: rule.maxTokens, thinking: rule.thinking ?? false };
  }

  const complexity = estimateComplexity(task);
  const rule = getModelForComplexity(complexity);
  return { modelId: rule.modelId, maxTokens: rule.maxTokens, thinking: rule.thinking ?? false };
}

export function getAvailableModelsForComplexity(): Map<TaskComplexity, ModelInfo> {
  const map = new Map<TaskComplexity, ModelInfo>();

  for (const rule of DEFAULT_ROUTING_RULES) {
    const model = getModelInfo(rule.modelId);
    if (model) {
      map.set(rule.complexity, model);
    }
  }

  return map;
}
