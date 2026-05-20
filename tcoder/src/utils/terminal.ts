export interface TerminalInfo {
  columns: number;
  rows: number;
  isTTY: boolean;
  term: string;
  supportsColor: boolean;
  supportsUnicode: boolean;
  isInteractive: boolean;
}

export function getTerminalInfo(): TerminalInfo {
  return {
    columns: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
    isTTY: process.stdout.isTTY ?? false,
    term: process.env.TERM ?? 'unknown',
    supportsColor: terminalSupportsColor(),
    supportsUnicode: terminalSupportsUnicode(),
    isInteractive: process.stdin.isTTY ?? false,
  };
}

export function getTerminalSize(): { columns: number; rows: number } {
  return {
    columns: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  };
}

export function getTerminalColumns(): number {
  return process.stdout.columns ?? 80;
}

export function getTerminalRows(): number {
  return process.stdout.rows ?? 24;
}

export function terminalSupportsColor(): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;

  if (!process.stdout.isTTY) return false;

  const term = (process.env.TERM ?? '').toLowerCase();
  if (term === 'dumb') return false;

  return true;
}

export function terminalSupportsUnicode(): boolean {
  const lang = (process.env.LANG ?? process.env.LC_ALL ?? process.env.LC_CTYPE ?? '').toLowerCase();
  if (lang.includes('utf-8') || lang.includes('utf8')) return true;
  return false;
}

export function getColorLevel(): number {
  if (!terminalSupportsColor()) return 0;

  const tc = process.env.COLORTERM ?? '';
  if (tc === 'truecolor' || tc === '24bit') return 3;

  const term = (process.env.TERM ?? '').toLowerCase();
  if (term.includes('256color')) return 2;
  if (term.includes('color')) return 1;

  return 0;
}

export function isRedirected(): boolean {
  return !process.stdout.isTTY;
}

export function isPiped(): boolean {
  return !process.stdin.isTTY;
}

export function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

export function clearLine(): void {
  process.stdout.write('\x1b[2K\r');
}

export function moveCursor(x: number, y: number): void {
  process.stdout.write(`\x1b[${y};${x}H`);
}

export function cursorUp(n = 1): void {
  process.stdout.write(`\x1b[${n}A`);
}

export function cursorDown(n = 1): void {
  process.stdout.write(`\x1b[${n}B`);
}

export function cursorForward(n = 1): void {
  process.stdout.write(`\x1b[${n}C`);
}

export function cursorBackward(n = 1): void {
  process.stdout.write(`\x1b[${n}D`);
}

export function hideCursor(): void {
  process.stdout.write('\x1b[?25l');
}

export function showCursor(): void {
  process.stdout.write('\x1b[?25h');
}

export function saveCursor(): void {
  process.stdout.write('\x1b[s');
}

export function restoreCursor(): void {
  process.stdout.write('\x1b[u');
}

export function bellAlert(): void {
  process.stdout.write('\x07');
}

export function resizeHandler(callback: (columns: number, rows: number) => void): () => void {
  const handler = () => {
    callback(process.stdout.columns ?? 80, process.stdout.rows ?? 24);
  };

  process.stdout.on('resize', handler);
  return () => process.stdout.removeListener('resize', handler);
}

export function writeToStdout(text: string): void {
  process.stdout.write(text);
}

export function writeToStderr(text: string): void {
  process.stderr.write(text);
}
