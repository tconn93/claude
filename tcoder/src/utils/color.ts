export function rgb(r: number, g: number, b: number, text: string): string {
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

export function rgbBg(r: number, g: number, b: number, text: string): string {
  return `\x1b[48;2;${r};${g};${b}m${text}\x1b[0m`;
}

export function hexToAnsi(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '';
  return `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
}

export function hexToAnsiBg(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '';
  return `\x1b[48;2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
}

export function ansiCode(code: number): string {
  return `\x1b[${code}m`;
}

export function ansiReset(): string {
  return '\x1b[0m';
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return [
    parseInt(result[1]!, 16),
    parseInt(result[2]!, 16),
    parseInt(result[3]!, 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function ansi256(color: number, text: string): string {
  return `\x1b[38;5;${color}m${text}\x1b[0m`;
}

export function ansi256Bg(color: number, text: string): string {
  return `\x1b[48;5;${color}m${text}\x1b[0m`;
}

export const ANSI_CODES = {
  reset: 0,
  bold: 1,
  dim: 2,
  italic: 3,
  underline: 4,
  blink: 5,
  inverse: 7,
  hidden: 8,
  strikethrough: 9,
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  brightBlack: 90,
  brightRed: 91,
  brightGreen: 92,
  brightYellow: 93,
  brightBlue: 94,
  brightMagenta: 95,
  brightCyan: 96,
  brightWhite: 97,
  bgBlack: 40,
  bgRed: 41,
  bgGreen: 42,
  bgYellow: 43,
  bgBlue: 44,
  bgMagenta: 45,
  bgCyan: 46,
  bgWhite: 47,
  bgBrightBlack: 100,
  bgBrightRed: 101,
  bgBrightGreen: 102,
  bgBrightYellow: 103,
  bgBrightBlue: 104,
  bgBrightMagenta: 105,
  bgBrightCyan: 106,
  bgBrightWhite: 107,
} as const;

export function style(text: string, ...codes: number[]): string {
  const prefix = codes.map(c => `\x1b[${c}m`).join('');
  return `${prefix}${text}\x1b[0m`;
}

export function bold(text: string): string {
  return style(text, ANSI_CODES.bold);
}

export function dim(text: string): string {
  return style(text, ANSI_CODES.dim);
}

export function italic(text: string): string {
  return style(text, ANSI_CODES.italic);
}

export function underline(text: string): string {
  return style(text, ANSI_CODES.underline);
}

export function strikethrough(text: string): string {
  return style(text, ANSI_CODES.strikethrough);
}

export function colorize(text: string, color: keyof typeof ANSI_CODES): string {
  const code = ANSI_CODES[color];
  if (typeof code !== 'number') return text;
  return style(text, code);
}

export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

export function gradient(text: string, startHex: string, endHex: string): string {
  const startRgb = hexToRgb(startHex);
  const endRgb = hexToRgb(endHex);
  if (!startRgb || !endRgb) return text;

  const chars = [...text];
  const len = chars.length;

  return chars
    .map((char, i) => {
      if (char === ' ' || char === '\n') return char;
      const t = len > 1 ? i / (len - 1) : 0;
      const r = Math.round(startRgb[0] + (endRgb[0] - startRgb[0]) * t);
      const g = Math.round(startRgb[1] + (endRgb[1] - startRgb[1]) * t);
      const b = Math.round(startRgb[2] + (endRgb[2] - startRgb[2]) * t);
      return rgb(r, g, b, char);
    })
    .join('');
}
