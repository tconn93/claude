import type { Keybinding } from '../hooks/useKeybinding.ts';

export const DEFAULT_KEYBINDINGS: Keybinding[] = [
  /* Navigation */
  { key: 'k', ctrl: false, alt: false, shift: false, handler: () => {}, description: 'Up (vim-style)' },
  { key: 'j', ctrl: false, alt: false, shift: false, handler: () => {}, description: 'Down (vim-style)' },

  /* Actions */
  { key: 'C', ctrl: true, alt: false, shift: false, handler: () => process.exit(0), description: 'Exit' },
  { key: 'L', ctrl: true, alt: false, shift: false, handler: () => {}, description: 'Clear screen' },
  { key: 'R', ctrl: true, alt: false, shift: false, handler: () => {}, description: 'Search history' },
  { key: 'D', ctrl: true, alt: false, shift: false, handler: () => process.exit(0), description: 'Exit (EOF)' },

  /* Mode toggles */
  { key: 'p', ctrl: true, alt: false, shift: false, handler: () => {}, description: 'Toggle permission mode' },
  { key: 'm', ctrl: true, alt: false, shift: false, handler: () => {}, description: 'Toggle model' },

  /* Help */
  { key: 'h', ctrl: true, alt: false, shift: false, handler: () => {}, description: 'Toggle help' },
  { key: '?', ctrl: false, alt: false, shift: false, handler: () => {}, description: 'Toggle help' },

  /* Multi-line */
  { key: 'escape', ctrl: false, alt: false, shift: false, handler: () => {}, description: 'Multi-line mode' },

  /* Tab completion */
  { key: '\t', ctrl: false, alt: false, shift: false, handler: () => {}, description: 'Tab complete' },
];
