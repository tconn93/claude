import { GitHubClient } from './client.ts';

export interface PullRequest {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  baseBranch: string;
  headBranch: string;
  url: string;
  labels: string[];
  reviewers: string[];
  draft: boolean;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface CreatePROptions {
  title: string;
  body: string;
  base?: string;
  head?: string;
  draft?: boolean;
  labels?: string[];
  reviewers?: string[];
  assignees?: string[];
}

export async function createPR(
  client: GitHubClient,
  options: CreatePROptions,
): Promise<PullRequest | null> {
  const args: string[] = ['gh', 'pr', 'create'];

  args.push(`--title=${options.title}`);
  args.push(`--body=${options.body}`);

  if (options.base) args.push(`--base=${options.base}`);
  if (options.head) args.push(`--head=${options.head}`);
  if (options.draft) args.push('--draft');

  for (const label of options.labels ?? []) {
    args.push(`--label=${label}`);
  }

  for (const reviewer of options.reviewers ?? []) {
    args.push(`--reviewer=${reviewer}`);
  }

  for (const assignee of options.assignees ?? []) {
    args.push(`--assignee=${assignee}`);
  }

  const result = await client.api('POST', `/repos/{owner}/{repo}/pulls`, {
    body: {
      title: options.title,
      body: options.body,
      base: options.base,
      head: options.head,
      draft: options.draft,
    },
  });

  return result as PullRequest | null;
}

export async function getPR(
  client: GitHubClient,
  number: number,
): Promise<PullRequest | null> {
  try {
    const result = await client.api('GET', `/repos/{owner}/{repo}/pulls/${number}`);
    return mapPRResponse(result as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function listPRs(
  client: GitHubClient,
  options: { state?: 'open' | 'closed' | 'merged' | 'all'; limit?: number; author?: string; label?: string } = {},
): Promise<PullRequest[]> {
  const state = options.state ?? 'open';
  const limit = options.limit ?? 30;

  try {
    const args: string[] = [
      'gh', 'pr', 'list',
      `--state=${state}`,
      `--limit=${limit}`,
      '--json=number,title,body,state,author,createdAt,updatedAt,mergedAt,baseRefName,headRefName,url,labels,reviewers,isDraft,additions,deletions,changedFiles',
    ];

    if (options.author) args.push(`--author=${options.author}`);
    if (options.label) args.push(`--label=${options.label}`);

    const { executeShellCommand } = await import('../shell.ts');
    const result = await executeShellCommand(args.join(' '), { cwd: client['config'].cwd, timeout: 15_000 });

    if (result.exitCode !== 0) return [];

    const raw = JSON.parse(result.stdout) as Record<string, unknown>[];
    return raw.map(mapPRListResponse);
  } catch {
    return [];
  }
}

export async function getPRDiff(
  client: GitHubClient,
  number: number,
): Promise<string> {
  try {
    const result = await client.api('GET', `/repos/{owner}/{repo}/pulls/${number}`, {
      rawField: `diff`,
    });
    return result as string;
  } catch {
    return '';
  }
}

export async function mergePR(
  client: GitHubClient,
  number: number,
  options: { method?: 'merge' | 'squash' | 'rebase'; title?: string; body?: string } = {},
): Promise<boolean> {
  try {
    await client.api('PUT', `/repos/{owner}/{repo}/pulls/${number}/merge`, {
      body: {
        merge_method: options.method ?? 'merge',
        commit_title: options.title,
        commit_message: options.body,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function closePR(
  client: GitHubClient,
  number: number,
): Promise<boolean> {
  try {
    await client.api('PATCH', `/repos/{owner}/{repo}/pulls/${number}`, {
      body: { state: 'closed' },
    });
    return true;
  } catch {
    return false;
  }
}

export async function requestReviewers(
  client: GitHubClient,
  number: number,
  reviewers: string[],
): Promise<boolean> {
  try {
    await client.api('POST', `/repos/{owner}/{repo}/pulls/${number}/requested_reviewers`, {
      body: { reviewers },
    });
    return true;
  } catch {
    return false;
  }
}

function mapPRResponse(raw: Record<string, unknown>): PullRequest {
  return {
    number: raw.number as number,
    title: raw.title as string,
    body: (raw.body as string) ?? '',
    state: (raw.state as PullRequest['state']) ?? 'open',
    author: (raw.user as { login: string })?.login ?? '',
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
    mergedAt: (raw.merged_at as string) ?? null,
    baseBranch: (raw.base as { ref: string })?.ref ?? '',
    headBranch: (raw.head as { ref: string })?.ref ?? '',
    url: raw.html_url as string,
    labels: ((raw.labels as Array<{ name: string }>) ?? []).map(l => l.name),
    reviewers: ((raw.requested_reviewers as Array<{ login: string }>) ?? []).map(r => r.login),
    draft: (raw.draft as boolean) ?? false,
    additions: (raw.additions as number) ?? 0,
    deletions: (raw.deletions as number) ?? 0,
    changedFiles: (raw.changed_files as number) ?? 0,
  };
}

function mapPRListResponse(raw: Record<string, unknown>): PullRequest {
  return {
    number: raw.number as number,
    title: raw.title as string,
    body: (raw.body as string) ?? '',
    state: (raw.state as PullRequest['state']) ?? 'open',
    author: (raw.author as { login: string })?.login ?? (raw.author as string) ?? '',
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
    mergedAt: (raw.mergedAt as string) ?? null,
    baseBranch: raw.baseRefName as string,
    headBranch: raw.headRefName as string,
    url: raw.url as string,
    labels: ((raw.labels as Array<{ name: string }>) ?? []).map(l => l.name),
    reviewers: ((raw.reviewers as Array<{ login: string }>) ?? []).map(r => r.login),
    draft: (raw.isDraft as boolean) ?? false,
    additions: (raw.additions as number) ?? 0,
    deletions: (raw.deletions as number) ?? 0,
    changedFiles: (raw.changedFiles as number) ?? 0,
  };
}
