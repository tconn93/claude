export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function uncapitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function camelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c: string) => c.toLowerCase());
}

export function pascalCase(str: string): string {
  return capitalize(camelCase(str));
}

export function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function titleCase(str: string): string {
  return str
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function indent(text: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return text
    .split('\n')
    .map(line => (line ? prefix + line : line))
    .join('\n');
}

export function dedent(text: string): string {
  const lines = text.split('\n');
  const minIndent = lines
    .filter(l => l.trim())
    .reduce((min, line) => {
      const match = line.match(/^(\s*)/);
      return match ? Math.min(min, match[1].length) : min;
    }, Infinity);

  if (minIndent === Infinity || minIndent === 0) return text;

  return lines
    .map(line => line.slice(minIndent))
    .join('\n');
}

export function stripIndent(template: TemplateStringsArray, ...values: unknown[]): string {
  const result = template.reduce((acc, str, i) => {
    return acc + str + (values[i] ?? '');
  }, '');

  return dedent(result);
}

export function wrap(text: string, maxWidth = 80): string {
  const lines: string[] = [];
  const words = text.split(/\s+/);

  let currentLine = '';
  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxWidth) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.join('\n');
}

export function pluralize(word: string, count: number, plural?: string): string {
  if (count === 1) return word;
  return plural ?? `${word}s`;
}

export function ellipsis(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function padStart(str: string, length: number, char = ' '): string {
  return str.padStart(length, char);
}

export function padEnd(str: string, length: number, char = ' '): string {
  return str.padEnd(length, char);
}

export function countOccurrences(str: string, search: string): number {
  let count = 0;
  let pos = 0;

  while (true) {
    const index = str.indexOf(search, pos);
    if (index === -1) break;
    count++;
    pos = index + search.length;
  }

  return count;
}

export function randomString(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
