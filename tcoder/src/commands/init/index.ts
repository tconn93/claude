import type { CommandDefinition } from '../../types/command.ts';

const init: CommandDefinition = {
  name: 'init',
  aliases: ['setup'],
  description: 'Initialize a CLAUDE.md file for the current project',
  usage: '/init',
  async execute(ctx) {
    const cwd = ctx.state.workingDirectory;
    const claudeMdPath = `${cwd}/CLAUDE.md`;

    const template = [
      `# ${cwd.split('/').pop() || 'Project'}`,
      '',
      '## Build & Test Commands',
      '',
      '## Code Style',
      '',
      '## Architecture',
      '',
      '## Environment',
      '',
    ].join('\n');

    return {
      success: true,
      message: [
        'CLAUDE.md template generated:',
        '',
        '```',
        template,
        '```',
        '',
        `File will be written to: ${claudeMdPath}`,
        'Edit it to document your project conventions.',
      ].join('\n'),
      data: { path: claudeMdPath, template },
    };
  },
};

export default init;
