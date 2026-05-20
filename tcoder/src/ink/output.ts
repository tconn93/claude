import type { TNode, TerminalOutput, OutputLine } from './types.ts';
import { getTheme } from '../design-system/themes.ts';
import type { Theme } from '../design-system/themes.ts';

interface RenderContext {
  x: number;
  y: number;
  width: number;
  height: number;
  theme: Theme;
  lines: OutputLine[];
}

function writeAt(ctx: RenderContext, text: string): void {
  if (text.length === 0) return;
  ctx.lines.push({ text, x: ctx.x, y: ctx.y });
  ctx.x += text.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function writeLine(ctx: RenderContext, text: string): void {
  writeAt(ctx, text);
  ctx.y += 1;
  ctx.x = 0;
}

const BORDER_CHARS = {
  single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  round: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
  bold: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
};

function resolveColor(color: string | undefined, theme: Theme): string {
  if (!color) return theme.fg;
  const ansiColors: Record<string, string> = {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
    brightWhite: '\x1b[97m',
  };
  if (ansiColors[color]) return ansiColors[color];
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `\x1b[38;2;${r};${g};${b}m`;
  }
  return theme.fg;
}

function resolveBgColor(color: string | undefined, theme: Theme): string {
  if (!color) return '';
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `\x1b[48;2;${r};${g};${b}m`;
  }
  return '';
}

function applyInlineStyles(text: string, node: TNode, theme: Theme): string {
  const props = node.props;
  let result = text;

  if (props.color) result = resolveColor(String(props.color), theme) + result + '\x1b[39m';
  if (props.bgColor) result = resolveBgColor(String(props.bgColor), theme) + result + '\x1b[49m';
  if (props.bold) result = '\x1b[1m' + result + '\x1b[22m';
  if (props.dim) result = '\x1b[2m' + result + '\x1b[22m';
  if (props.italic) result = '\x1b[3m' + result + '\x1b[23m';
  if (props.underline) result = '\x1b[4m' + result + '\x1b[24m';
  if (props.inverse) result = '\x1b[7m' + result + '\x1b[27m';

  return result;
}

function renderNode(ctx: RenderContext, node: TNode): void {
  const { type, props } = node;

  switch (type) {
    case 'text': {
      const txt = node.text ?? '';
      writeAt(ctx, applyInlineStyles(txt, node, ctx.theme));
      break;
    }

    case 'Box':
    case 'box': {
      const border = props.border as string | undefined;
      const borderColor = (props.borderColor as string) ?? ctx.theme.border;
      const padding = (props.padding as number) ?? 0;
      const marginTop = (props.marginTop as number) ?? 0;
      const marginBottom = (props.marginBottom as number) ?? 0;
      const marginLeft = (props.marginLeft as number) ?? 0;
      const marginRight = (props.marginRight as number) ?? 0;
      const width = (props.width as number | undefined) ?? ctx.width - ctx.x - marginLeft - marginRight;
      const minHeight = (props.minHeight as number) ?? 1;

      for (let i = 0; i < marginTop; i++) {
        writeLine(ctx, '');
      }

      ctx.x += marginLeft;

      const startY = ctx.y;
      const innerWidth = width - (border ? 2 : 0) - padding * 2;

      if (border) {
        const chars = BORDER_CHARS[border as keyof typeof BORDER_CHARS] ?? BORDER_CHARS.single;
        const colorCode = resolveColor(borderColor, ctx.theme);
        writeAt(ctx, colorCode + chars.tl + chars.h.repeat(width - 2) + chars.tr + '\x1b[39m');
        writeLine(ctx, '');
        ctx.x = marginLeft;
      }

      for (let i = 0; i < padding; i++) {
        if (border) {
          const chars = BORDER_CHARS[border as keyof typeof BORDER_CHARS] ?? BORDER_CHARS.single;
          const colorCode = resolveColor(borderColor, ctx.theme);
          writeAt(ctx, colorCode + chars.v + '\x1b[39m');
        }
        writeLine(ctx, '');
        ctx.x = marginLeft;
      }

      const contentStartY = ctx.y;

      for (const child of node.children) {
        renderNode(ctx, child);
      }

      const contentEndY = ctx.y;

      if (contentEndY < contentStartY + minHeight) {
        for (let i = contentEndY; i < contentStartY + minHeight; i++) {
          writeLine(ctx, '');
        }
      }

      for (let i = 0; i < padding; i++) {
        if (border) {
          const chars = BORDER_CHARS[border as keyof typeof BORDER_CHARS] ?? BORDER_CHARS.single;
          const colorCode = resolveColor(borderColor, ctx.theme);
          writeAt(ctx, colorCode + chars.v + '\x1b[39m');
        }
        writeLine(ctx, '');
        ctx.x = marginLeft;
      }

      if (border) {
        const chars = BORDER_CHARS[border as keyof typeof BORDER_CHARS] ?? BORDER_CHARS.single;
        const colorCode = resolveColor(borderColor, ctx.theme);
        writeAt(ctx, colorCode + chars.bl + chars.h.repeat(width - 2) + chars.br + '\x1b[39m');
        writeLine(ctx, '');
        ctx.x = 0;
      }

      for (let i = 0; i < marginBottom; i++) {
        writeLine(ctx, '');
      }
      break;
    }

    case 'Flex':
    case 'flex': {
      const direction = (props.flexDirection as string) ?? 'column';
      const gap = (props.gap as number) ?? 0;

      if (direction === 'row') {
        const startX = ctx.x;
        const startY = ctx.y;
        for (const child of node.children) {
          renderNode(ctx, child);
          ctx.x += gap;
          ctx.y = startY;
        }
      } else {
        for (const child of node.children) {
          renderNode(ctx, child);
          if (gap > 0) {
            ctx.y += gap;
            ctx.x = 0;
          }
        }
      }
      break;
    }

    case 'Grid':
    case 'grid': {
      const cols = (props.cols as number) ?? 1;
      const gap = (props.gap as number) ?? 0;
      const startX = ctx.x;
      let colIdx = 0;
      const colWidth = Math.floor(ctx.width / cols);

      for (const child of node.children) {
        ctx.x = startX + colIdx * colWidth + gap;
        renderNode(ctx, child);
        colIdx++;
        if (colIdx >= cols) {
          colIdx = 0;
          writeLine(ctx, '');
        }
      }
      break;
    }

    case 'Divider':
    case 'divider': {
      const char = (props.char as string) ?? '─';
      const color = (props.color as string) ?? ctx.theme.border;
      const width = ctx.width - ctx.x;
      writeLine(ctx, resolveColor(color, ctx.theme) + char.repeat(width) + '\x1b[39m');
      break;
    }

    case 'ScrollBox':
    case 'scrollbox': {
      const height = (props.height as number) ?? 10;
      const scrollOffset = (props.scrollOffset as number) ?? 0;
      const childrenToRender = node.children.slice(scrollOffset, scrollOffset + height);
      for (const child of childrenToRender) {
        renderNode(ctx, child);
      }
      break;
    }

    case 'ProgressBar':
    case 'progressbar': {
      const percent = Math.min(100, Math.max(0, (props.percent as number) ?? 0));
      const pbWidth = (props.width as number) ?? 20;
      const filled = Math.round((percent / 100) * pbWidth);
      const color = (props.color as string) ?? ctx.theme.accent;
      const bar = resolveColor(color, ctx.theme) +
        '█'.repeat(filled) +
        '\x1b[39m' +
        '░'.repeat(pbWidth - filled);
      writeLine(ctx, bar);
      break;
    }

    default:
      // unknown types: render children linearly
      for (const child of node.children) {
        renderNode(ctx, child);
      }
      break;
  }
}

export function renderToOutput(node: TNode | undefined, width: number, height: number, themeName?: string): string {
  if (!node) return '';

  const theme = getTheme(themeName ?? 'dark');
  const ctx: RenderContext = {
    x: 0,
    y: 0,
    width,
    height,
    theme,
    lines: [],
  };

  renderNode(ctx, node);

  const lines: string[] = [];
  for (const line of ctx.lines) {
    const yIdx = line.y;
    while (lines.length <= yIdx) lines.push('');
    lines[yIdx] += line.text;
  }

  return lines.join('\n');
}

export function writeToStdout(output: string): void {
  process.stdout.write(output);
}

export function clearTerminal(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

export function hideCursor(): void {
  process.stdout.write('\x1b[?25l');
}

export function showCursor(): void {
  process.stdout.write('\x1b[?25h');
}

export function moveCursor(x: number, y: number): void {
  process.stdout.write(`\x1b[${y + 1};${x + 1}H`);
}

export function writeFrame(node: TNode | undefined, width: number, height: number): void {
  const output = renderToOutput(node, width, height);
  clearTerminal();
  writeToStdout(output);
}
