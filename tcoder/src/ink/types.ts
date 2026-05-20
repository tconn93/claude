export interface TNode {
  type: string;
  text?: string;
  children: TNode[];
  props: Record<string, unknown>;
  styles: string[];
  parent?: TNode;
}

export interface Container {
  root: unknown;
}

export interface HostContext {
  [key: string]: unknown;
}

export interface OutputLine {
  text: string;
  x: number;
  y: number;
}

export interface TerminalOutput {
  lines: OutputLine[];
  cursorX: number;
  cursorY: number;
}
