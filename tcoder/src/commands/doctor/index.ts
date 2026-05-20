import type { CommandDefinition } from '../../types/command.ts';
import { APP_NAME, APP_VERSION } from '../../constants/common.ts';
import { platform, version as nodeVersion, arch, cpus, totalmem, freemem } from 'node:os';

const doctor: CommandDefinition = {
  name: 'doctor',
  aliases: ['health'],
  description: 'Run system diagnostics and check dependencies',
  usage: '/doctor',
  async execute(ctx) {
    const issues: string[] = [];
    const checks: string[] = [];

    // Node version
    const nodeMajor = Number.parseInt(nodeVersion.slice(1).split('.')[0], 10);
    checks.push(`Node.js:   ${nodeVersion} ${nodeMajor >= 18 ? '[OK]' : '[WARN - min v18 recommended]'}`);
    if (nodeMajor < 18) issues.push('Node.js version is below 18');

    // Platform
    checks.push(`Platform:  ${platform()} ${arch()}`);

    // Memory
    const totalMemMB = Math.round(totalmem() / (1024 * 1024));
    const freeMemMB = Math.round(freemem() / (1024 * 1024));
    checks.push(`Memory:    ${freeMemMB} MB free / ${totalMemMB} MB total`);
    if (freeMemMB < 512) issues.push('Low memory (< 512 MB free)');

    // CPU
    checks.push(`CPUs:      ${cpus().length}`);

    // Version
    checks.push(`${APP_NAME}: ${APP_VERSION}`);

    // Working directory
    checks.push(`CWD:       ${ctx.state.workingDirectory}`);

    // Session
    checks.push(`Session:   ${ctx.state.sessionId}`);

    const lines: string[] = [
      'System Diagnostics:',
      '',
      ...checks,
    ];

    if (issues.length > 0) {
      lines.push('');
      lines.push('Issues found:');
      for (const issue of issues) {
        lines.push(`  - ${issue}`);
      }
    } else {
      lines.push('');
      lines.push('All checks passed.');
    }

    return { success: true, message: lines.join('\n'), data: { issues } };
  },
};

export default doctor;
