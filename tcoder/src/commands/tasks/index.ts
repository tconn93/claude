import type { CommandDefinition } from '../../types/command.ts';

interface BackgroundTask {
  id: string;
  description: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: number;
}

const tasks: CommandDefinition = {
  name: 'tasks',
  aliases: ['task'],
  description: 'List and manage background tasks',
  usage: '/tasks [list | cancel <task-id>]',
  async execute(ctx) {
    const { args } = ctx;
    const bgTasks = (ctx.state.config._backgroundTasks as BackgroundTask[]) ?? [];

    if (args.length === 0 || args[0] === 'list') {
      if (bgTasks.length === 0) {
        return { success: true, message: 'No background tasks.' };
      }
      const lines: string[] = ['Background tasks:', ''];
      for (const task of bgTasks) {
        const statusIcon = task.status === 'running' ? '>' : task.status === 'completed' ? 'OK' : task.status === 'failed' ? 'X' : '-';
        const elapsed = Math.floor((Date.now() - task.startedAt) / 1000);
        lines.push(`  [${statusIcon}] ${task.id}: ${task.description} (${elapsed}s)`);
      }
      return { success: true, message: lines.join('\n') };
    }

    const sub = args[0].toLowerCase();

    if (sub === 'cancel') {
      const taskId = args[1];
      if (!taskId) {
        return { success: false, message: 'Usage: /tasks cancel <task-id>' };
      }
      const task = bgTasks.find((t) => t.id === taskId);
      if (!task) {
        return { success: false, message: `Task not found: ${taskId}` };
      }
      if (task.status !== 'running') {
        return { success: false, message: `Task ${taskId} is not running (status: ${task.status})` };
      }
      const ctrl = ctx.state.activeTools.get(taskId);
      if (ctrl) {
        ctrl.abort();
      }
      task.status = 'cancelled';
      ctx.state.config._backgroundTasks = bgTasks;
      return { success: true, message: `Task cancelled: ${taskId}` };
    }

    return { success: false, message: `Unknown subcommand: ${sub}. Use list or cancel.` };
  },
};

export default tasks;
