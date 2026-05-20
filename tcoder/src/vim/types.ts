export type VimMode = 'normal' | 'insert' | 'visual' | 'visual-line' | 'command';

export interface VimState {
  mode: VimMode;
  register: string;
  count: string;
  lastCommand: string;
  searchDirection: 'forward' | 'backward';
  searchQuery: string;
  marks: Map<string, number>;
  macros: Map<string, string>;
  recordingTo: string | null;
}

export type Motion =
  | { type: 'word'; direction: 'forward' | 'backward' }
  | { type: 'word-end'; direction: 'forward' | 'backward' }
  | { type: 'line'; position: 'start' | 'end' | 'first-non-whitespace' }
  | { type: 'char'; target: string }
  | { type: 'find'; target: string; direction: 'forward' | 'backward' }
  | { type: 'till'; target: string; direction: 'forward' | 'backward' }
  | { type: 'paragraph'; direction: 'forward' | 'backward' }
  | { type: 'match'; bracket: string };

export type Operator =
  | { type: 'delete' }
  | { type: 'change' }
  | { type: 'yank' }
  | { type: 'indent'; direction: 'increase' | 'decrease' }
  | { type: 'case'; transform: 'upper' | 'lower' | 'toggle' };

export type TextObject =
  | { type: 'word'; scope: 'inner' | 'around' }
  | { type: 'word-big'; scope: 'inner' | 'around' }
  | { type: 'quote'; scope: 'inner' | 'around'; char: string }
  | { type: 'bracket'; scope: 'inner' | 'around'; char: string }
  | { type: 'paragraph'; scope: 'inner' | 'around' }
  | { type: 'tag'; scope: 'inner' | 'around' };

export interface VimCommand {
  count?: number;
  operator?: Operator;
  motion?: Motion;
  textObject?: TextObject;
  register?: string;
}

export const VIM_DEFAULTS: VimState = {
  mode: 'normal',
  register: '"',
  count: '',
  lastCommand: '',
  searchDirection: 'forward',
  searchQuery: '',
  marks: new Map(),
  macros: new Map(),
  recordingTo: null,
};
