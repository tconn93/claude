import type { Message, AssistantMessage, UserMessage } from '../../types/message.ts';

export interface ConversationSummary {
  summary: string;
  keyTopics: string[];
  messageCount: number;
  timeRange: { start: number; end: number };
  fileList: string[];
}

export function summarizeConversation(messages: Message[]): string {
  if (messages.length === 0) return '';

  const parts: string[] = [];

  // Extract user queries
  const userMessages = messages.filter((m) => m.type === 'user');
  const userQueries: string[] = [];
  for (const msg of userMessages.slice(0, 10)) {
    const content = typeof msg.content === 'string'
      ? msg.content
      : Array.isArray(msg.content)
        ? msg.content.map((b) => b.text ?? '').join(' ')
        : '';
    if (content.length > 0) {
      userQueries.push(content.substring(0, 200));
    }
  }

  if (userQueries.length > 0) {
    parts.push('## User Queries');
    parts.push(...userQueries.map((q) => `- ${q}`));
  }

  // Extract tool usage summary
  const assistantMessages = messages.filter((m) => m.type === 'assistant') as AssistantMessage[];
  const toolUses = new Map<string, number>();
  for (const msg of assistantMessages) {
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'tool_use' && 'name' in block) {
          const name = (block as { name: string }).name;
          toolUses.set(name, (toolUses.get(name) ?? 0) + 1);
        }
      }
    }
  }

  if (toolUses.size > 0) {
    parts.push('\n## Tools Used');
    const sorted = Array.from(toolUses.entries()).sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sorted) {
      parts.push(`- ${name} (${count}x)`);
    }
  }

  // Extract files mentioned
  const filePattern = /[\/\w-]+\.(ts|tsx|js|jsx|py|go|rs|java|rb|css|html|json|yaml|yml|md|sh|sql)/gi;
  const files = new Set<string>();
  for (const msg of messages) {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    const matches = content.match(filePattern);
    if (matches) {
      for (const match of matches) {
        files.add(match);
      }
    }
  }

  if (files.size > 0) {
    parts.push('\n## Files Referenced');
    parts.push(Array.from(files).slice(0, 20).map((f) => `- ${f}`).join('\n'));
  }

  // Session metadata
  const startTime = messages[0]?.timestamp ?? Date.now();
  const endTime = messages[messages.length - 1]?.timestamp ?? Date.now();
  const durationMin = Math.round((endTime - startTime) / 60000);

  parts.push('\n## Session Info');
  parts.push(`- Messages condensed: ${messages.length}`);
  parts.push(`- Duration: ${durationMin} minutes`);

  return `<conversation-history-summary>\n${parts.join('\n')}\n</conversation-history-summary>`;
}

export function analyzeConversation(messages: Message[]): ConversationSummary {
  const userMessages = messages.filter((m) => m.type === 'user');
  const assistantMessages = messages.filter((m) => m.type === 'assistant');

  const keyTopics = extractKeyTopics(userMessages);

  const filePattern = /[\/\w-]+\.(ts|tsx|js|jsx|py|go|rs|java|rb|css|html|json|yaml|yml|md|sh|sql)/gi;
  const files = new Set<string>();
  for (const msg of messages) {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    const matches = content.match(filePattern);
    if (matches) {
      for (const match of matches) {
        files.add(match);
      }
    }
  }

  return {
    summary: summarizeConversation(messages),
    keyTopics,
    messageCount: messages.length,
    timeRange: {
      start: messages[0]?.timestamp ?? Date.now(),
      end: messages[messages.length - 1]?.timestamp ?? Date.now(),
    },
    fileList: Array.from(files),
  };
}

function extractKeyTopics(userMessages: Message[]): string[] {
  const topics = new Set<string>();

  const keywordPatterns: Array<{ regex: RegExp; topic: string }> = [
    { regex: /refactor/i, topic: 'refactoring' },
    { regex: /debug/i, topic: 'debugging' },
    { regex: /test/i, topic: 'testing' },
    { regex: /error/i, topic: 'error handling' },
    { regex: /api/i, topic: 'API development' },
    { regex: /database|sql|query/i, topic: 'database' },
    { regex: /type|interface/i, topic: 'type definitions' },
    { regex: /config/i, topic: 'configuration' },
    { regex: /build|compile/i, topic: 'build system' },
    { regex: /deploy/i, topic: 'deployment' },
    { regex: /import/i, topic: 'imports' },
    { regex: /performance|optimize/i, topic: 'performance' },
    { regex: /security|auth/i, topic: 'security/auth' },
    { regex: /style|css|design/i, topic: 'styling' },
  ];

  for (const msg of userMessages) {
    const content = typeof msg.content === 'string'
      ? msg.content
      : JSON.stringify(msg.content);

    for (const { regex, topic } of keywordPatterns) {
      if (regex.test(content)) {
        topics.add(topic);
      }
    }
  }

  return Array.from(topics);
}
