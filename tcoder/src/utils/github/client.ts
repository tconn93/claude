import { executeShellCommand } from '../shell.ts';

export interface GitHubClientConfig {
  cwd?: string;
  token?: string;
  host?: string;
}

export interface GitHubRepo {
  owner: string;
  name: string;
  fullName: string;
}

export class GitHubClient {
  private config: GitHubClientConfig;

  constructor(config: GitHubClientConfig = {}) {
    this.config = config;
  }

  async getRepo(): Promise<GitHubRepo | null> {
    const result = await executeShellCommand(
      'gh repo view --json owner,name,nameWithOwner',
      { cwd: this.config.cwd, timeout: 10_000 },
    );

    if (result.exitCode !== 0) return null;

    try {
      const parsed = JSON.parse(result.stdout);
      return {
        owner: parsed.owner?.login ?? '',
        name: parsed.name ?? '',
        fullName: parsed.nameWithOwner ?? '',
      };
    } catch {
      return null;
    }
  }

  async graphql(query: string, variables: Record<string, unknown> = {}): Promise<unknown> {
    const input = JSON.stringify({ query, variables });
    const escaped = input.replace(/'/g, "'\\''");

    const result = await executeShellCommand(
      `gh api graphql -f query='${escaped}'`,
      { cwd: this.config.cwd, timeout: 30_000 },
    );

    if (result.exitCode !== 0) {
      throw new Error(`GitHub GraphQL error: ${result.stderr}`);
    }

    return JSON.parse(result.stdout);
  }

  async api(method: string, endpoint: string, options: { body?: unknown; rawField?: string } = {}): Promise<unknown> {
    const args = ['gh', 'api', `--method=${method}`];

    if (options.body) {
      const bodyStr = JSON.stringify(options.body);
      const escaped = bodyStr.replace(/'/g, "'\\''");
      args.push(`--input='${escaped}'`);
    }

    if (options.rawField) {
      args.push(`--raw-field=${options.rawField}`);
    }

    args.push(endpoint);

    const result = await executeShellCommand(
      args.join(' '),
      { cwd: this.config.cwd, timeout: 30_000 },
    );

    if (result.exitCode !== 0) {
      throw new Error(`GitHub API error: ${result.stderr}`);
    }

    try {
      return JSON.parse(result.stdout);
    } catch {
      return result.stdout;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const result = await executeShellCommand(
      'gh auth status 2>/dev/null',
      { cwd: this.config.cwd, timeout: 5_000 },
    );
    return result.exitCode === 0;
  }

  async getCurrentUser(): Promise<string | null> {
    const result = await executeShellCommand(
      'gh api user --jq .login',
      { cwd: this.config.cwd, timeout: 10_000 },
    );

    if (result.exitCode !== 0) return null;
    return result.stdout.trim();
  }
}

export function createGitHubClient(config?: GitHubClientConfig): GitHubClient {
  return new GitHubClient(config);
}
