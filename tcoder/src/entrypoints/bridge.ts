import type { ParsedArgs } from './parseArgs.ts';
import { createInterface } from 'node:readline';

export interface BridgeMessage {
  type: string;
  id?: string;
  payload?: Record<string, unknown>;
  error?: string;
}

export async function handleBridgeMode(args: ParsedArgs): Promise<void> {
  if (args.debug) {
    process.stderr.write('[bridge] Starting bridge mode\n');
  }

  // Bridge mode connects via stdin/stdout JSON protocol
  // Used by IDEs/editors to integrate tcoder as a subprocess

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  // Send ready signal
  sendMessage({ type: 'ready' });

  rl.on('line', async (line: string) => {
    try {
      const msg = JSON.parse(line) as BridgeMessage;
      const response = await handleBridgeMessage(msg, args);
      if (response) {
        sendMessage(response);
      }
    } catch (err) {
      sendMessage({
        type: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  rl.on('close', () => {
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    process.exit(0);
  });
}

async function handleBridgeMessage(
  msg: BridgeMessage,
  args: ParsedArgs,
): Promise<BridgeMessage | null> {
  switch (msg.type) {
    case 'ping':
      return { type: 'pong' };

    case 'query':
      return handleBridgeQuery(msg, args);

    case 'tools':
      return handleBridgeTools();

    case 'shutdown':
      process.exit(0);

    default:
      return { type: 'error', error: `Unknown message type: ${msg.type}` };
  }
}

async function handleBridgeQuery(
  msg: BridgeMessage,
  args: ParsedArgs,
): Promise<BridgeMessage> {
  try {
    const { queryClaude } = await import('../query.ts');
    const { getToolRegistry } = await import('../tools.ts');
    const { getAppStateStore } = await import('../state/store.ts');
    const { buildQuerySystemPrompt } = await import('../query.ts');
    const { detectShell } = await import('../utils/shell.ts');

    const store = getAppStateStore();
    const tools = getToolRegistry().list();
    const shell = detectShell();
    const state = store.getState();

    const prompt = (msg.payload?.prompt as string) ?? '';
    const model = (msg.payload?.model as string) ?? state.model;

    const systemPrompt = buildQuerySystemPrompt(
      tools,
      process.cwd(),
      process.platform,
      shell.type,
      state.gitBranch ?? '',
      'bridge',
      model,
    );

    const result = await queryClaude({
      messages: [
        { type: 'user', role: 'user', content: prompt, uuid: `msg_${Date.now()}`, timestamp: Date.now() },
      ],
      systemPrompt,
      model,
      tools,
    });

    return {
      type: 'response',
      id: msg.id,
      payload: {
        text: getTextFromMessage(result.message),
        usage: result.usage,
        finishReason: result.finishReason,
      },
    };
  } catch (err) {
    return {
      type: 'error',
      id: msg.id,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function handleBridgeTools(): Promise<BridgeMessage> {
  const { getToolRegistry } = await import('../tools.ts');
  const tools = getToolRegistry().list();
  return {
    type: 'tools',
    payload: {
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    },
  };
}

function getTextFromMessage(message: { content: { type: string; text?: string }[] }): string {
  return message.content
    .filter(b => b.type === 'text')
    .map(b => b.text ?? '')
    .join('\n');
}

function sendMessage(msg: BridgeMessage): void {
  process.stdout.write(JSON.stringify(msg) + '\n');
}
