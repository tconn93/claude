export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsToolUse: boolean;
  supportsStreaming: boolean;
  supportsCaching: boolean;
  description: string;
  isExperimental: boolean;
  deprecated: boolean;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'grok-4.3',
    name: 'Grok 4.3',
    provider: 'xai',
    maxTokens: 200_000,
    maxInputTokens: 200_000,
    maxOutputTokens: 32_000,
    supportsVision: true,
    supportsToolUse: true,
    supportsStreaming: true,
    supportsCaching: false,
    description: 'Latest Grok model for complex reasoning and analysis',
    isExperimental: false,
    deprecated: false,
  },
  {
    id: 'grok-4',
    name: 'Grok 4',
    provider: 'xai',
    maxTokens: 128_000,
    maxInputTokens: 128_000,
    maxOutputTokens: 16_000,
    supportsVision: true,
    supportsToolUse: true,
    supportsStreaming: true,
    supportsCaching: false,
    description: 'Standard Grok model for general-purpose tasks',
    isExperimental: false,
    deprecated: false,
  },
];

export function getModelInfo(id: string): ModelInfo | undefined {
  return AVAILABLE_MODELS.find(m => m.id === id);
}

export function listModels(
  filter?: {
    provider?: string;
    supportsVision?: boolean;
    deprecated?: boolean;
  },
): ModelInfo[] {
  let models = [...AVAILABLE_MODELS];

  if (filter?.provider) {
    models = models.filter(m => m.provider === filter.provider);
  }

  if (filter?.supportsVision !== undefined) {
    models = models.filter(m => m.supportsVision === filter.supportsVision);
  }

  if (filter?.deprecated !== undefined) {
    models = models.filter(m => m.deprecated === filter.deprecated);
  }

  return models;
}

export function getDefaultModel(): ModelInfo {
  return getModelInfo('grok-4.3') ?? AVAILABLE_MODELS[0];
}

export function validateModelId(id: string): boolean {
  return AVAILABLE_MODELS.some(m => m.id === id);
}

export function getModelAliases(): Record<string, string> {
  return {
    grok: 'grok-4.3',
    'grok-4.3': 'grok-4.3',
    'grok-4': 'grok-4',
    fast: 'grok-4',
  };
}

export function resolveModelAlias(alias: string): string {
  const aliases = getModelAliases();
  return aliases[alias] ?? alias;
}

export function getProviderForModel(modelId: string): string | null {
  const model = getModelInfo(modelId);
  return model?.provider ?? null;
}
