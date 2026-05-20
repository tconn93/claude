import type { CommandDefinition } from '../../types/command.ts';

const config: CommandDefinition = {
  name: 'config',
  aliases: ['cfg'],
  description: 'View or set configuration values',
  usage: '/config [key] [value]',
  async execute(ctx) {
    const { args } = ctx;

    if (args.length === 0) {
      const entries = Object.entries(ctx.state.config)
        .filter(([k]) => !k.startsWith('_'))
        .sort(([a], [b]) => a.localeCompare(b));
      if (entries.length === 0) {
        return { success: true, message: 'No configuration values set.' };
      }
      const lines = ['Configuration:', ''];
      for (const [key, value] of entries) {
        lines.push(`  ${key} = ${JSON.stringify(value)}`);
      }
      return { success: true, message: lines.join('\n') };
    }

    const key = args[0];

    if (args.length === 1) {
      const value = ctx.state.config[key];
      if (value === undefined) {
        return { success: false, message: `Configuration key not found: ${key}` };
      }
      return { success: true, message: `${key} = ${JSON.stringify(value)}` };
    }

    const rawValue = args.slice(1).join(' ');
    let parsedValue: unknown = rawValue;
    if (rawValue === 'true') parsedValue = true;
    else if (rawValue === 'false') parsedValue = false;
    else if (rawValue === 'null') parsedValue = null;
    else if (/^\d+$/.test(rawValue)) parsedValue = Number(rawValue);
    else if (/^\d+\.\d+$/.test(rawValue)) parsedValue = parseFloat(rawValue);
    else {
      try {
        parsedValue = JSON.parse(rawValue);
      } catch {
        parsedValue = rawValue;
      }
    }

    ctx.state.config[key] = parsedValue;
    return { success: true, message: `Set ${key} = ${JSON.stringify(parsedValue)}` };
  },
};

export default config;
