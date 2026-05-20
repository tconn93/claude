import type { CommandDefinition } from '../../types/command.ts';

const THEMES: Array<{ id: string; name: string }> = [
  { id: 'default', name: 'Default' },
  { id: 'dark', name: 'Dark' },
  { id: 'light', name: 'Light' },
  { id: 'monokai', name: 'Monokai' },
  { id: 'solarized-dark', name: 'Solarized Dark' },
  { id: 'solarized-light', name: 'Solarized Light' },
  { id: 'nord', name: 'Nord' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'github-dark', name: 'GitHub Dark' },
];

const theme: CommandDefinition = {
  name: 'theme',
  aliases: ['color', 'colors'],
  description: 'Change the color theme',
  usage: '/theme [theme-name]',
  async execute(ctx) {
    const { args } = ctx;

    if (args.length === 0) {
      const lines: string[] = [
        `Current theme: ${ctx.state.theme}`,
        '',
        'Available themes:',
        '',
      ];
      for (const t of THEMES) {
        const marker = t.id === ctx.state.theme ? ' [active]' : '';
        lines.push(`  ${t.id}${marker}`);
      }
      return { success: true, message: lines.join('\n') };
    }

    const requested = args[0].toLowerCase();
    const match = THEMES.find((t) => t.id === requested);

    if (!match) {
      return { success: false, message: `Unknown theme: ${requested}. Use /theme to see available themes.` };
    }

    ctx.state.theme = match.id;
    return { success: true, message: `Theme changed to ${match.name} (${match.id}).` };
  },
};

export default theme;
