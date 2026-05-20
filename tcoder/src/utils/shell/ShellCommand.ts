import { executeShellCommand, type ShellCommandOptions, type ShellCommandResult } from '../shell.ts';

export class ShellCommand {
  private command: string;
  private options: ShellCommandOptions;
  private result: ShellCommandResult | null = null;

  constructor(command: string, options: ShellCommandOptions = {}) {
    this.command = command;
    this.options = options;
  }

  get fullCommand(): string {
    return this.command;
  }

  get cwd(): string | undefined {
    return this.options.cwd;
  }

  get exitCode(): number | null {
    return this.result?.exitCode ?? null;
  }

  get stdout(): string {
    return this.result?.stdout ?? '';
  }

  get stderr(): string {
    return this.result?.stderr ?? '';
  }

  get wasSuccessful(): boolean {
    return this.result?.exitCode === 0;
  }

  get wasTimedOut(): boolean {
    return this.result?.timedOut ?? false;
  }

  get wasKilled(): boolean {
    return this.result?.killed ?? false;
  }

  async run(): Promise<ShellCommandResult> {
    this.result = await executeShellCommand(this.command, this.options);
    return this.result;
  }

  async runOrThrow(): Promise<ShellCommandResult> {
    await this.run();
    if (!this.wasSuccessful) {
      throw new ShellCommandError(this.command, this.result!);
    }
    return this.result!;
  }

  pipe(next: ShellCommand): ShellPipeline {
    return new ShellPipeline([this, next]);
  }

  static create(command: string, options?: ShellCommandOptions): ShellCommand {
    return new ShellCommand(command, options);
  }

  static async quick(command: string, options?: ShellCommandOptions): Promise<ShellCommandResult> {
    const cmd = new ShellCommand(command, options);
    return cmd.run();
  }
}

export class ShellPipeline {
  private commands: ShellCommand[];

  constructor(commands: ShellCommand[]) {
    this.commands = commands;
  }

  pipe(next: ShellCommand): ShellPipeline {
    this.commands.push(next);
    return this;
  }

  async run(): Promise<ShellCommandResult> {
    let lastResult: ShellCommandResult = { stdout: '', stderr: '', exitCode: 0, timedOut: false, killed: false };

    for (const cmd of this.commands) {
      const options: ShellCommandOptions = { ...cmd['options'] };
      if (lastResult.stdout) {
        options.stdin = lastResult.stdout;
      }
      lastResult = await cmd.run();
      if (lastResult.exitCode !== 0) {
        break;
      }
    }

    return lastResult;
  }
}

export class ShellCommandError extends Error {
  public command: string;
  public result: ShellCommandResult;

  constructor(command: string, result: ShellCommandResult) {
    super(`Command failed with exit code ${result.exitCode}: ${command}`);
    this.name = 'ShellCommandError';
    this.command = command;
    this.result = result;
  }
}
