import type { Theme } from './theme.ts';
import { getTheme } from './theme.ts';
import { hexToAnsi, hexToAnsiBg, ansiCode, ansiReset } from './color.ts';
import { terminalSupportsColor } from './terminal.ts';

export function renderTheme(themeName?: string): string {
  const theme = getTheme(themeName);
  const colors = theme.colors;

  const lines: string[] = [];
  const supportsColor = terminalSupportsColor();

  if (!supportsColor) {
    return `Theme: ${theme.name} (color support limited)`;
  }

  lines.push(`${hexToAnsi(colors.bright)}Theme: ${theme.name}${ansiReset()}`);
  lines.push('');

  const swatches: Array<{ label: string; color: string }> = [
    { label: 'primary', color: colors.primary },
    { label: 'secondary', color: colors.secondary },
    { label: 'accent', color: colors.accent },
    { label: 'success', color: colors.success },
    { label: 'warning', color: colors.warning },
    { label: 'error', color: colors.error },
    { label: 'info', color: colors.info },
  ];

  for (const swatch of swatches) {
    const swatchLine = `${hexToAnsiBg(swatch.color)}  ${ansiReset()} ${hexToAnsi(swatch.color)}${swatch.label}${ansiReset()}`;
    lines.push(swatchLine);
  }

  return lines.join('\n');
}

export function renderThemePreview(theme: Theme): string {
  const c = theme.colors;

  return [
    `${hexToAnsiBg(c.background)}${hexToAnsi(c.foreground)} ${theme.name} ${ansiReset()}`,
    `${hexToAnsi(c.primary)}This is primary text${ansiReset()}`,
    `${hexToAnsi(c.success)}Success message${ansiReset()}`,
    `${hexToAnsi(c.warning)}Warning message${ansiReset()}`,
    `${hexToAnsi(c.error)}Error message${ansiReset()}`,
    `${hexToAnsi(c.info)}Info message${ansiReset()}`,
    `${hexToAnsi(c.muted)}Muted text${ansiReset()}`,
    `${hexToAnsi(c.border)}${'┌──'} Border test ${'──┐'}${ansiReset()}`,
  ].join('\n');
}

export function renderColorGrid(): string {
  const theme = getTheme('default');
  const colors = Object.entries(theme.colors) as Array<[string, string]>;

  const lines: string[] = [];
  let currentLine = '';

  for (const [name, hex] of colors) {
    const block = `${hexToAnsiBg(hex)}    ${ansiReset()} ${name.padEnd(12)}`;
    if (currentLine.length + block.length > 80) {
      lines.push(currentLine);
      currentLine = '';
    }
    currentLine += block;
  }

  if (currentLine) lines.push(currentLine);
  return lines.join('\n');
}

export function themeToCSSVariables(theme: Theme): string {
  const lines: string[] = [':root {'];

  for (const [key, value] of Object.entries(theme.colors)) {
    const cssKey = key.replace(/[A-Z]/g, (m: string) => `-${m.toLowerCase()}`);
    lines.push(`  --tc-${cssKey}: ${value};`);
  }

  lines.push('}');
  return lines.join('\n');
}

export function themeToJSON(theme: Theme): string {
  return JSON.stringify(theme, null, 2);
}
