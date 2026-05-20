import type { MCPPrompt, MCPPromptArgument, MCPPromptMessage, MCPPromptResult } from './types.ts';

export interface PromptTemplate {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
  render: (args: Record<string, string>) => MCPPromptResult;
}

export class PromptManager {
  private prompts = new Map<string, PromptTemplate>();

  register(prompt: PromptTemplate): void {
    this.prompts.set(prompt.name, prompt);
  }

  unregister(name: string): void {
    this.prompts.delete(name);
  }

  get(name: string, args: Record<string, string> = {}): MCPPromptResult | null {
    const prompt = this.prompts.get(name);
    if (!prompt) return null;
    return prompt.render(args);
  }

  list(): MCPPrompt[] {
    return Array.from(this.prompts.values()).map((p) => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments,
    }));
  }

  has(name: string): boolean {
    return this.prompts.has(name);
  }

  clear(): void {
    this.prompts.clear();
  }
}

export function createTextMessage(role: 'user' | 'assistant', text: string): MCPPromptMessage {
  return {
    role,
    content: {
      type: 'text',
      text,
    },
  };
}

export function createImageMessage(
  role: 'user',
  data: string,
  mimeType: string,
): MCPPromptMessage {
  return {
    role,
    content: {
      type: 'image',
      data,
      mimeType,
    },
  };
}

export function createSimplePrompt(
  name: string,
  text: string,
  options?: { description?: string; role?: 'user' | 'assistant' },
): PromptTemplate {
  return {
    name,
    description: options?.description,
    render: () => ({
      messages: [createTextMessage(options?.role ?? 'user', text)],
    }),
  };
}

export function createTemplatedPrompt(
  name: string,
  template: string,
  args: MCPPromptArgument[],
  options?: { description?: string },
): PromptTemplate {
  return {
    name,
    description: options?.description,
    arguments: args,
    render: (providedArgs: Record<string, string>) => {
      let rendered = template;
      for (const arg of args) {
        const value = providedArgs[arg.name] ?? '';
        rendered = rendered.replace(new RegExp(`\\{\\{${arg.name}\\}\\}`, 'g'), value);
      }
      return {
        messages: [createTextMessage('user', rendered)],
      };
    },
  };
}
