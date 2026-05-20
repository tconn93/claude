export const typography = {
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  inverse: '\x1b[7m',
  hidden: '\x1b[8m',
  strikethrough: '\x1b[9m',
  reset: '\x1b[0m',
} as const;

export const ansiStyles = {
  bold: (text: string) => `\x1b[1m${text}\x1b[22m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[22m`,
  italic: (text: string) => `\x1b[3m${text}\x1b[23m`,
  underline: (text: string) => `\x1b[4m${text}\x1b[24m`,
  strikethrough: (text: string) => `\x1b[9m${text}\x1b[29m`,
} as const;

export function truncate(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) return text;
  return text.slice(0, Math.max(0, maxWidth - 3)) + '...';
}

export function padEnd(text: string, width: number): string {
  const stripped = text.replace(/\x1b\[[0-9;]*m/g, '');
  if (stripped.length >= width) return text;
  return text + ' '.repeat(width - stripped.length);
}

export function padStart(text: string, width: number): string {
  const stripped = text.replace(/\x1b\[[0-9;]*m/g, '');
  if (stripped.length >= width) return text;
  return ' '.repeat(width - stripped.length) + text;
}

export function centerText(text: string, width: number): string {
  const stripped = text.replace(/\x1b\[[0-9;]*m/g, '');
  const leftPad = Math.floor((width - stripped.length) / 2);
  return ' '.repeat(Math.max(0, leftPad)) + text;
}
