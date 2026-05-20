export interface ParsedCommand {
  command: string;
  args: string[];
  redirects: Redirect[];
  pipes: ParsedCommand[];
  background: boolean;
  raw: string;
}

export interface Redirect {
  type: 'stdin' | 'stdout' | 'stderr' | 'stdout_stderr' | 'append_stdout' | 'append_stderr';
  target: string;
  fd?: number;
}

export function parseBashCommand(raw: string): ParsedCommand {
  const trimmed = raw.trim();
  const background = trimmed.endsWith('&');
  const cleanCommand = background ? trimmed.slice(0, -1).trim() : trimmed;

  const pipeSegments = splitPipeSegments(cleanCommand);
  const parsedSegments = pipeSegments.map(segment => parseSingleCommand(segment));

  if (parsedSegments.length === 1) {
    return { ...parsedSegments[0], background, raw };
  }

  return {
    ...parsedSegments[0],
    pipes: parsedSegments.slice(1),
    background,
    raw,
  };
}

function splitPipeSegments(command: string): string[] {
  const segments: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      current += ch;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      current += ch;
      continue;
    }

    if (ch === '|' && !inSingle && !inDouble) {
      if (command[i + 1] === '|') {
        current += '||';
        i++;
        continue;
      }
      segments.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

function parseSingleCommand(raw: string): ParsedCommand {
  const redirects: Redirect[] = [];
  let clean = raw;

  const redirectPatterns: Array<{ regex: RegExp; type: Redirect['type'] }> = [
    { regex: /2>&1/, type: 'stdout_stderr' },
    { regex: /1>>\s*(\S+)/, type: 'append_stdout' },
    { regex: />>\s*(\S+)/, type: 'append_stdout' },
    { regex: /2>>\s*(\S+)/, type: 'append_stderr' },
    { regex: /1>\s*(\S+)/, type: 'stdout' },
    { regex: /2>\s*(\S+)/, type: 'stderr' },
    { regex: />\s*(\S+)/, type: 'stdout' },
    { regex: /<\s*(\S+)/, type: 'stdin' },
  ];

  for (const { regex, type } of redirectPatterns) {
    const match = clean.match(regex);
    if (match) {
      redirects.push({ type, target: match[1] ?? '' });
      clean = clean.replace(regex, '').trim();
    }
  }

  const parts = tokenizeCommand(clean);
  if (parts.length === 0) {
    return { command: '', args: [], redirects, pipes: [], background: false, raw };
  }

  return {
    command: parts[0],
    args: parts.slice(1),
    redirects,
    pipes: [],
    background: false,
    raw,
  };
}

function tokenizeCommand(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (ch === '\\' && (inDouble || !inSingle)) {
      if (i + 1 < input.length) {
        current += input[i + 1];
        i++;
      }
      continue;
    }

    if ((ch === ' ' || ch === '\t') && !inSingle && !inDouble) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

export function isDangerousCommand(command: string): boolean {
  const dangerousPatterns = [
    /rm\s+-rf\s+\//,
    /mkfs\.\w+/,
    /dd\s+if=/,
    />\s*\/dev\/sd/,
    /chmod\s+-R\s+777/,
    /fork\s+bomb/,
    /:\(\)\s*\{\s*:\|:&\s*\};:/,
    /curl.*\|\s*(ba)?sh/,
    /wget.*\|\s*(ba)?sh/,
  ];

  return dangerousPatterns.some(pattern => pattern.test(command));
}

export function extractVariables(command: string): Map<string, string> {
  const vars = new Map<string, string>();
  const regex = /(\w+)=("[^"]*"|'[^']*'|\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(command)) !== null) {
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars.set(match[1], value);
  }

  return vars;
}
