import type { CommandDefinition } from '../../types/command.ts';

interface SkillEntry {
  name: string;
  description: string;
  enabled: boolean;
}

const skills: CommandDefinition = {
  name: 'skills',
  aliases: ['skill'],
  description: 'List and run skills',
  usage: '/skills [list | run <skill-name>]',
  async execute(ctx) {
    const { args } = ctx;
    const skillEntries = (ctx.state.config._skills as SkillEntry[]) ?? [];

    if (args.length === 0 || args[0] === 'list') {
      if (skillEntries.length === 0) {
        return { success: true, message: 'No skills configured.' };
      }
      const lines: string[] = ['Available skills:', ''];
      for (const skill of skillEntries) {
        const status = skill.enabled ? '' : ' [disabled]';
        lines.push(`  ${skill.name}${status}`);
        lines.push(`    ${skill.description}`);
      }
      return { success: true, message: lines.join('\n') };
    }

    const sub = args[0].toLowerCase();

    if (sub === 'run') {
      const skillName = args[1];
      if (!skillName) {
        return { success: false, message: 'Usage: /skills run <skill-name>' };
      }
      const skill = skillEntries.find((s) => s.name === skillName);
      if (!skill) {
        return { success: false, message: `Skill not found: ${skillName}` };
      }
      if (!skill.enabled) {
        return { success: false, message: `Skill is disabled: ${skillName}` };
      }
      return { success: true, message: `Skill "${skillName}" activated.` };
    }

    return { success: false, message: `Unknown subcommand: ${sub}. Use list or run.` };
  },
};

export default skills;
