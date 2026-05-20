import { APP_NAME, APP_VERSION } from '../../constants/common.ts';

export interface BootstrapConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface BootstrapData {
  app: {
    name: string;
    version: string;
  };
  capabilities: {
    streaming: boolean;
    tools: boolean;
    vision: boolean;
    thinking: boolean;
    promptCaching: boolean;
    extendedThinking: boolean;
  };
  model: {
    id: string;
    maxTokens: number;
    contextWindow: number;
  };
  defaults: {
    maxTokens: number;
    temperature: number;
  };
}

export async function fetchBootstrap(config: BootstrapConfig): Promise<BootstrapData> {
  const baseUrl = config.baseUrl ?? 'https://api.x.ai/v1';

  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model ?? 'grok-4.3',
      max_output_tokens: 1,
      input: 'hi',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API bootstrap failed: HTTP ${response.status} - ${errorText}`);
  }

  const modelId = config.model ?? 'grok-4.3';

  return {
    app: {
      name: APP_NAME,
      version: APP_VERSION,
    },
    capabilities: {
      streaming: true,
      tools: true,
      vision: true,
      thinking: true,
      promptCaching: false,
      extendedThinking: modelId.includes('grok'),
    },
    model: {
      id: modelId,
      maxTokens: config.maxTokens ?? 8192,
      contextWindow: 200000,
    },
    defaults: {
      maxTokens: config.maxTokens ?? 8192,
      temperature: config.temperature ?? 0.7,
    },
  };
}

export function createDefaultBootstrap(): BootstrapData {
  return {
    app: {
      name: APP_NAME,
      version: APP_VERSION,
    },
    capabilities: {
      streaming: true,
      tools: true,
      vision: true,
      thinking: true,
      promptCaching: false,
      extendedThinking: false,
    },
    model: {
      id: 'grok-4.3',
      maxTokens: 8192,
      contextWindow: 200000,
    },
    defaults: {
      maxTokens: 8192,
      temperature: 0.7,
    },
  };
}
