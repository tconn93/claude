export interface BashInput {
  command: string;
  description?: string;
  timeout?: number;
  workingDirectory?: string;
  env?: Record<string, string>;
  dangerouslyDisableSandbox?: boolean;
}

export interface BashOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  killed: boolean;
  duration: number;
}
