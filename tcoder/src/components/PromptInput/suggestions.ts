export interface Suggestion {
  text: string;
  description: string;
  type: 'command' | 'tool' | 'path' | 'history';
}

export function getCommandSuggestions(prefix: string): Suggestion[] {
  const commands: Suggestion[] = [
    { text: '/help', description: 'Show help', type: 'command' },
    { text: '/clear', description: 'Clear conversation', type: 'command' },
    { text: '/compact', description: 'Compact conversation context', type: 'command' },
    { text: '/model', description: 'Change model', type: 'command' },
    { text: '/theme', description: 'Change theme', type: 'command' },
    { text: '/config', description: 'Show configuration', type: 'command' },
    { text: '/permissions', description: 'Manage permissions', type: 'command' },
    { text: '/status', description: 'Show system status', type: 'command' },
    { text: '/exit', description: 'Exit tcoder', type: 'command' },
    { text: '/memory', description: 'View project memory', type: 'command' },
    { text: '/todos', description: 'Show task list', type: 'command' },
    { text: '/sessions', description: 'List sessions', type: 'command' },
    { text: '/save', description: 'Save conversation', type: 'command' },
    { text: '/load', description: 'Load conversation', type: 'command' },
  ];

  if (!prefix.startsWith('/')) return [];
  const lower = prefix.toLowerCase();
  return commands.filter((c) => c.text.toLowerCase().startsWith(lower));
}

export function getToolSuggestions(prefix: string): Suggestion[] {
  const tools: Suggestion[] = [
    { text: 'Read(', description: 'Read a file', type: 'tool' },
    { text: 'Write(', description: 'Write a file', type: 'tool' },
    { text: 'Edit(', description: 'Edit a file', type: 'tool' },
    { text: 'Bash(', description: 'Run a shell command', type: 'tool' },
    { text: 'Glob(', description: 'Find files by pattern', type: 'tool' },
    { text: 'Grep(', description: 'Search file contents', type: 'tool' },
    { text: 'WebSearch(', description: 'Search the web', type: 'tool' },
    { text: 'WebFetch(', description: 'Fetch a URL', type: 'tool' },
    { text: 'Task(', description: 'Manage tasks', type: 'tool' },
  ];

  if (!prefix) return [];
  const lower = prefix.toLowerCase();
  return tools.filter((t) => t.text.toLowerCase().startsWith(lower));
}

export function getAllSuggestions(
  prefix: string,
  historyItems: string[] = [],
): Suggestion[] {
  const commands = getCommandSuggestions(prefix);
  const tools = getToolSuggestions(prefix);

  const historyMatches: Suggestion[] = historyItems
    .filter((h) => h.toLowerCase().startsWith(prefix.toLowerCase()))
    .slice(0, 5)
    .map((h) => ({ text: h, description: 'from history', type: 'history' as const }));

  return [...commands, ...tools, ...historyMatches];
}
