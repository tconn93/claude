import type { ParsedArgs } from './parseArgs.ts';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';

const DEFAULT_PORT = 4599;
const DEFAULT_HOST = '127.0.0.1';

export async function handleDaemonMode(args: ParsedArgs): Promise<void> {
  const port = parseInt(process.env.TCODER_DAEMON_PORT ?? String(DEFAULT_PORT), 10);
  const host = process.env.TCODER_DAEMON_HOST ?? DEFAULT_HOST;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      await handleRequest(req, res, args);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  });

  server.on('error', (err: Error) => {
    if ((err as unknown as { code: string }).code === 'EADDRINUSE') {
      console.error(`Port ${port} already in use. Is another tcoder daemon running?`);
      process.exit(1);
    }
    throw err;
  });

  server.listen(port, host, () => {
    console.error(`[daemon] tcoder daemon listening on http://${host}:${port}`);
    if (args.debug) {
      console.error(`[daemon] PID: ${process.pid}`);
    }
  });

  process.on('SIGTERM', () => {
    console.error('[daemon] Received SIGTERM, shutting down...');
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.error('[daemon] Received SIGINT, shutting down...');
    server.close(() => process.exit(0));
  });
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  args: ParsedArgs,
): Promise<void> {
  const url = req.url ?? '/';
  const method = req.method ?? 'GET';

  // CORS headers for local access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  if (method === 'GET' && url === '/tools') {
    const { getToolRegistry } = await import('../tools.ts');
    const tools = getToolRegistry().list().map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tools }));
    return;
  }

  if (method === 'POST' && url === '/query') {
    const body = await readRequestBody(req);
    const { prompt, model, systemPrompt } = JSON.parse(body) as {
      prompt?: string;
      model?: string;
      systemPrompt?: string;
    };

    if (!prompt) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing prompt' }));
      return;
    }

    const { queryClaude } = await import('../query.ts');
    const { getToolRegistry } = await import('../tools.ts');
    const { getAppStateStore } = await import('../state/store.ts');
    const { buildQuerySystemPrompt } = await import('../query.ts');
    const { detectShell } = await import('../utils/shell.ts');

    const store = getAppStateStore();
    const tools = getToolRegistry().list();
    const shell = detectShell();
    const state = store.getState();

    const resolvedSystemPrompt = systemPrompt ?? buildQuerySystemPrompt(
      tools,
      process.cwd(),
      process.platform,
      shell.type,
      state.gitBranch ?? '',
      'daemon',
      model ?? state.model,
    );

    const result = await queryClaude({
      messages: [
        {
          type: 'user',
          role: 'user',
          content: prompt,
          uuid: `msg_${Date.now()}`,
          timestamp: Date.now(),
        },
      ],
      systemPrompt: resolvedSystemPrompt,
      model: model ?? state.model,
      tools,
    });

    const text = result.message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { text: string }).text ?? '')
      .join('\n');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      text,
      usage: result.usage,
      finishReason: result.finishReason,
      duration: result.duration,
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}
