import { requestServerJson } from "@/lib/http/server";
import { validateDateRange } from "@/utils/activity";
import type { Project, ActivityData, FetchActivityInput, Branch } from "@/types";
import type { GitHubRepo, GitHubCommit, GitHubPR, GitHubIssue } from "./types";

const GITHUB_API_BASE = "https://api.github.com";

async function githubFetch<T>(
  token: string,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  return requestServerJson<T>(`${GITHUB_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    query: params,
    errorPrefix: `GitHub API error at ${path}`,
    timeoutMs: 10_000,
  });
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

export async function listBranches(token: string, repoSlug: string): Promise<Branch[]> {
  const raw = await githubFetch<{ name: string }[]>(token, `/repos/${repoSlug}/branches`, {
    per_page: "100",
  });
  const DEFAULTS = new Set(["main", "master"]);
  return raw.map((b) => ({ name: b.name, isDefault: DEFAULTS.has(b.name) }));
}

export async function fetchActivity(input: FetchActivityInput): Promise<ActivityData> {
  const { token, repoSlug, since, until, includePRs = false, includeIssues = false, branch } = input;
  validateDateRange(since, until);

  const sinceTime = new Date(since).getTime();
  const untilTime = new Date(until).getTime();

  const commitParams: Record<string, string> = { since, until, per_page: "100" };
  if (branch) commitParams.sha = branch;

  const [commits, pullRequests, issues] = await Promise.all([
    githubFetch<GitHubCommit[]>(token, `/repos/${repoSlug}/commits`, commitParams),
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
