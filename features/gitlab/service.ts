import { env } from "@/config/env";
import { requestServerJson } from "@/lib/http/server";
import { validateDateRange } from "@/utils/activity";
import type { Project, ActivityData, FetchActivityInput, Branch } from "@/types";
import type { GitLabProject, GitLabCommit, GitLabMR, GitLabIssue } from "./types";

async function gitlabFetch<T>(
  token: string,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  return requestServerJson<T>(`${env.GITLAB_URL}/api/v4${path}`, {
    headers: { "PRIVATE-TOKEN": token },
    query: params,
    errorPrefix: `GitLab API error at ${path}`,
    timeoutMs: 10_000,
  });
}

export async function listProjects(token: string): Promise<Project[]> {
  const raw = await gitlabFetch<GitLabProject[]>(token, "/projects", {
    membership: "true",
    simple: "true",
    order_by: "last_activity_at",
    sort: "desc",
    per_page: "50",
  });
  return raw.map((p) => ({
    id: String(p.id),
    slug: p.path_with_namespace,
    name: p.name,
    displayName: p.name_with_namespace,
    webUrl: p.web_url,
    lastActivityAt: p.last_activity_at,
  }));
}

export async function listBranches(token: string, repoSlug: string): Promise<Branch[]> {
  const slug = encodeURIComponent(repoSlug);
  const raw = await gitlabFetch<{ name: string; default: boolean }[]>(
    token,
    `/projects/${slug}/repository/branches`,
    { per_page: "100" }
  );
  return raw.map((b) => ({ name: b.name, isDefault: b.default }));
}

export async function fetchActivity(input: FetchActivityInput): Promise<ActivityData> {
  const { token, repoSlug, since, until, includePRs = false, includeIssues = false, branch } = input;
  validateDateRange(since, until);
  const slug = encodeURIComponent(repoSlug);

  const commitParams: Record<string, string> = { since, until, per_page: "100" };
  if (branch) commitParams.ref_name = branch;

  const [commits, mergeRequests, issues] = await Promise.all([
    gitlabFetch<GitLabCommit[]>(token, `/projects/${slug}/repository/commits`, commitParams),
    includePRs
      ? gitlabFetch<GitLabMR[]>(token, `/projects/${slug}/merge_requests`, {
          updated_after: since,
          updated_before: until,
          per_page: "100",
        })
      : Promise.resolve<GitLabMR[]>([]),
    includeIssues
      ? gitlabFetch<GitLabIssue[]>(token, `/projects/${slug}/issues`, {
          updated_after: since,
          updated_before: until,
          per_page: "100",
        })
      : Promise.resolve<GitLabIssue[]>([]),
  ]);

  return {
    commits: commits.map((c) => ({
      id: c.id,
      title: c.title,
      authoredDate: c.authored_date,
      webUrl: c.web_url,
    })),
    pullRequests: mergeRequests.map((mr) => ({
      id: mr.id,
      title: mr.title,
      state: mr.state,
      updatedAt: mr.updated_at,
      webUrl: mr.web_url,
    })),
    issues: issues.map((i) => ({
      id: i.id,
      title: i.title,
      state: i.state,
      updatedAt: i.updated_at,
      webUrl: i.web_url,
    })),
  };
}
