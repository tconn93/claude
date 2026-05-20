import type { ParsedArgs } from './parseArgs.ts';
import type { Message } from '../types/message.ts';

export async function handleBackgroundSession(args: ParsedArgs): Promise<void> {
  if (!args.prompt) {
    console.error('Error: --background requires --prompt or a positional prompt argument.');
    process.exit(1);
  }

  try {
    const { getAppStateStore } = await import('../state/store.ts');
    const { getToolRegistry } = await import('../tools.ts');
    const { queryXAI, continueWithToolResults, executeToolCalls } = await import('../query.ts');
    const { buildQuerySystemPrompt } = await import('../query.ts');
    const { detectShell } = await import('../utils/shell.ts');

    const store = getAppStateStore();
    const state = store.getState();

    if (args.model) {
      store.setState({ model: args.model });
    }

    const toolRegistry = getToolRegistry();
    const tools = toolRegistry.list();
    const shell = detectShell();
    const model = args.model ?? store.getState().model;
    const sessionId = `bg_${Date.now().toString(36)}`;

    const systemPrompt = buildQuerySystemPrompt(
      tools,
      process.cwd(),
      process.platform,
      shell.type,
      state.gitBranch ?? '',
      sessionId,
      model,
    );

    if (args.debug) {
      console.error(`[background] Model: ${model}`);
      console.error(`[background] Tools: ${tools.length} registered`);
    }

    const messages: Message[] = [{
      type: 'user',
      role: 'user',
      content: args.prompt,
      uuid: `msg_${Date.now()}`,
      timestamp: Date.now(),
    }];

    // First query
    let result = await queryXAI({
      messages,
      systemPrompt,
      model,
      tools,
      signal: undefined,
    });

    messages.push(result.message);

    const MAX_TOOL_TURNS = 10;
    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const toolCalls = result.toolCalls;

      if (toolCalls.length === 0) {
        const text = result.message.content
          .filter(b => b.type === 'text')
          .map(b => (b as { text: string }).text ?? '')
          .join('\n');

        if (text) {
          process.stdout.write(text);
          if (!text.endsWith('\n')) process.stdout.write('\n');
        }
        break;
      }

      if (args.debug) {
        console.error(`[background] Turn ${turn + 1}: ${toolCalls.length} tool call(s): ${toolCalls.map(tc => tc.name).join(', ')}`);
      }

      const executed = await executeToolCalls(
        toolCalls,
        toolRegistry.tools,
        {
          sessionId,
          permissionMode: 'bypassPermissions',
          workingDirectory: process.cwd(),
          signal: new AbortController().signal,
          messages,
          onProgress: (toolName, status) => {
            if (args.debug && status === 'started') {
              console.error(`[background] Running: ${toolName}`);
            }
          },
        },
      );

      messages.push(...executed.messages);

      if (executed.functionCallOutputs.length === 0) break;

      // Continue with tool results using previous_response_id
      result = await continueWithToolResults(
        args.prompt,
        systemPrompt,
        model,
        8192,
        0.7,
        tools,
        undefined,
        result.responseId,
        executed.functionCallOutputs,
      );

      messages.push(result.message);
    }
  } catch (err) {
    console.error(`\x1b[31mError: ${err instanceof Error ? err.message : String(err)}\x1b[0m`);
    process.exit(1);
  }
}
