import { validateDateRange } from "@/lib/activity";
import type { Project, ActivityData, FetchActivityInput } from "@/lib/types";
import type { GitHubRepo, GitHubCommit, GitHubPR, GitHubIssue } from "./types";

const GITHUB_API_BASE = "https://api.github.com";

async function githubFetch<T>(
  token: string,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${GITHUB_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status} at ${path}`);
  }

  return response.json() as Promise<T>;
}

export async function listProjects(token: string): Promise<Project[]> {
  const raw = await githubFetch<GitHubRepo[]>(token, "/user/repos", {
    sort: "pushed",
    direction: "desc",
    per_page: "50",
    affiliation: "owner,collaborator,organization_member",
  });
  return raw.map((r) => ({
    id: String(r.id),
    slug: r.full_name,
    name: r.name,
    displayName: r.full_name,
    webUrl: r.html_url,
    lastActivityAt: r.pushed_at ?? new Date().toISOString(),
  }));
}

export async function fetchActivity(input: FetchActivityInput): Promise<ActivityData> {
  const { token, repoSlug, since, until, includePRs = false, includeIssues = false } = input;
  validateDateRange(since, until);

  const sinceTime = new Date(since).getTime();
  const untilTime = new Date(until).getTime();

  const [commits, pullRequests, issues] = await Promise.all([
    githubFetch<GitHubCommit[]>(token, `/repos/${repoSlug}/commits`, {
      since,
      until,
      per_page: "100",
    }),
    includePRs
      ? githubFetch<GitHubPR[]>(token, `/repos/${repoSlug}/pulls`, {
          state: "all",
          sort: "updated",
          direction: "desc",
          per_page: "100",
        })
      : Promise.resolve<GitHubPR[]>([]),
    includeIssues
      ? githubFetch<GitHubIssue[]>(token, `/repos/${repoSlug}/issues`, {
          since,
          state: "all",
          per_page: "100",
        })
      : Promise.resolve<GitHubIssue[]>([]),
  ]);

  // GitHub issues endpoint also returns PRs — exclude them
  const onlyIssues = issues.filter((i) => !i.pull_request);

  // GitHub PRs API has no updated_after/before — filter manually
  const filteredPRs = pullRequests.filter((pr) => {
    const t = new Date(pr.updated_at).getTime();
    return t >= sinceTime && t <= untilTime;
  });

  return {
    commits: commits.map((c) => ({
      id: c.sha,
      title: c.commit.message.split("\n")[0], // first line only
      authoredDate: c.commit.author?.date ?? new Date().toISOString(),
      webUrl: c.html_url,
    })),
    pullRequests: filteredPRs.map((pr) => ({
      id: pr.id,
      title: pr.title,
      state: pr.state,
      updatedAt: pr.updated_at,
      webUrl: pr.html_url,
    })),
    issues: onlyIssues.map((i) => ({
      id: i.id,
      title: i.title,
      state: i.state,
      updatedAt: i.updated_at,
      webUrl: i.html_url,
    })),
  };
}
