import { GitHubClient } from './client.ts';

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  author: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  url: string;
  labels: string[];
  assignees: string[];
  comments: number;
}

export interface CreateIssueOptions {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}

export interface IssueComment {
  id: number;
  author: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export async function createIssue(
  client: GitHubClient,
  options: CreateIssueOptions,
): Promise<GitHubIssue | null> {
  try {
    const result = await client.api('POST', `/repos/{owner}/{repo}/issues`, {
      body: {
        title: options.title,
        body: options.body,
        labels: options.labels,
        assignees: options.assignees,
      },
    });
    return mapIssueResponse(result as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function getIssue(
  client: GitHubClient,
  number: number,
): Promise<GitHubIssue | null> {
  try {
    const result = await client.api('GET', `/repos/{owner}/{repo}/issues/${number}`);
    return mapIssueResponse(result as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function listIssues(
  client: GitHubClient,
  options: { state?: 'open' | 'closed' | 'all'; limit?: number; label?: string; assignee?: string } = {},
): Promise<GitHubIssue[]> {
  const state = options.state ?? 'open';
  const limit = options.limit ?? 30;

  try {
    const args: string[] = [
      'gh', 'issue', 'list',
      `--state=${state}`,
      `--limit=${limit}`,
      '--json=number,title,body,state,author,createdAt,updatedAt,closedAt,url,labels,assignees,comments',
    ];

    if (options.label) args.push(`--label=${options.label}`);
    if (options.assignee) args.push(`--assignee=${options.assignee}`);

    const { executeShellCommand } = await import('../shell.ts');
    const result = await executeShellCommand(args.join(' '), { cwd: client['config'].cwd, timeout: 15_000 });

    if (result.exitCode !== 0) return [];

    const raw = JSON.parse(result.stdout) as Record<string, unknown>[];
    return raw.map(mapIssueListResponse);
  } catch {
    return [];
  }
}

export async function closeIssue(
  client: GitHubClient,
  number: number,
): Promise<boolean> {
  try {
    await client.api('PATCH', `/repos/{owner}/{repo}/issues/${number}`, {
      body: { state: 'closed' },
    });
    return true;
  } catch {
    return false;
  }
}

export async function reopenIssue(
  client: GitHubClient,
  number: number,
): Promise<boolean> {
  try {
    await client.api('PATCH', `/repos/{owner}/{repo}/issues/${number}`, {
      body: { state: 'open' },
    });
    return true;
  } catch {
    return false;
  }
}

export async function listComments(
  client: GitHubClient,
  issueNumber: number,
): Promise<IssueComment[]> {
  try {
    const result = await client.api('GET', `/repos/{owner}/{repo}/issues/${issueNumber}/comments`);
    const raw = result as Array<Record<string, unknown>>;
    return raw.map(mapCommentResponse);
  } catch {
    return [];
  }
}

export async function addComment(
  client: GitHubClient,
  issueNumber: number,
  body: string,
): Promise<IssueComment | null> {
  try {
    const result = await client.api(
      'POST',
      `/repos/{owner}/{repo}/issues/${issueNumber}/comments`,
      { body: { body } },
    );
    return mapCommentResponse(result as Record<string, unknown>);
  } catch {
    return null;
  }
}

function mapIssueResponse(raw: Record<string, unknown>): GitHubIssue {
  return {
    number: raw.number as number,
    title: raw.title as string,
    body: (raw.body as string) ?? '',
    state: (raw.state as GitHubIssue['state']) ?? 'open',
    author: (raw.user as { login: string })?.login ?? '',
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
    closedAt: (raw.closed_at as string) ?? null,
    url: raw.html_url as string,
    labels: ((raw.labels as Array<{ name: string }>) ?? []).map(l => l.name),
    assignees: ((raw.assignees as Array<{ login: string }>) ?? []).map(a => a.login),
    comments: (raw.comments as number) ?? 0,
  };
}

function mapIssueListResponse(raw: Record<string, unknown>): GitHubIssue {
  return {
    number: raw.number as number,
    title: raw.title as string,
    body: (raw.body as string) ?? '',
    state: (raw.state as GitHubIssue['state']) ?? 'open',
    author: (raw.author as { login: string })?.login ?? (raw.author as string) ?? '',
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
    closedAt: (raw.closedAt as string) ?? null,
    url: raw.url as string,
    labels: ((raw.labels as Array<{ name: string }>) ?? []).map(l => l.name),
    assignees: ((raw.assignees as Array<{ login: string }>) ?? []).map(a => a.login),
    comments: (raw.comments as number) ?? 0,
  };
}

function mapCommentResponse(raw: Record<string, unknown>): IssueComment {
  return {
    id: raw.id as number,
    author: (raw.user as { login: string })?.login ?? '',
    body: (raw.body as string) ?? '',
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
  };
}
