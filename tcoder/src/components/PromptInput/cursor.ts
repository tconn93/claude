export interface CursorState {
  position: number;
  column: number;
}

export function getCursorColumn(
  text: string,
  position: number,
  tabWidth: number = 2,
): number {
  let column = 0;
  for (let i = 0; i < position && i < text.length; i++) {
    if (text[i] === '\t') {
      column += tabWidth - (column % tabWidth);
    } else {
      column += 1;
    }
  }
  return column;
}

export function moveCursorLeft(
  text: string,
  position: number,
): number {
  return Math.max(0, position - 1);
}

export function moveCursorRight(
  text: string,
  position: number,
): number {
  return Math.min(text.length, position + 1);
}

export function moveCursorToStart(position: number): number {
  return 0;
}

export function moveCursorToEnd(text: string): number {
  return text.length;
}

export function moveCursorWordLeft(
  text: string,
  position: number,
): number {
  let pos = position;
  // Skip whitespace
  while (pos > 0 && text[pos - 1] === ' ') pos--;
  // Skip word characters
  while (pos > 0 && text[pos - 1] !== ' ') pos--;
  return pos;
}

export function moveCursorWordRight(
  text: string,
  position: number,
): number {
  let pos = position;
  // Skip word characters
  while (pos < text.length && text[pos] !== ' ') pos++;
  // Skip whitespace
  while (pos < text.length && text[pos] === ' ') pos++;
  return pos;
}
