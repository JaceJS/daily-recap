export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type Provider = "gitlab" | "github";

// Shared normalized types — both GitLab and GitHub services map to these
export type Project = {
  id: string;
  slug: string;        // path_with_namespace (GitLab) or full_name (GitHub)
  name: string;
  displayName: string;
  webUrl: string;
  lastActivityAt: string;
};

export type Commit = {
  id: string;
  title: string;
  authoredDate: string;
  webUrl: string;
};

export type PullRequest = {
  id: number;
  title: string;
  state: string;
  updatedAt: string;
  webUrl: string;
};

export type Issue = {
  id: number;
  title: string;
  state: string;
  updatedAt: string;
  webUrl: string;
};

export type ActivityData = {
  commits: Commit[];
  pullRequests: PullRequest[];
  issues: Issue[];
};

export type DailyActivity = {
  date: string;
  label: string;
  commits: Commit[];
  pullRequests: PullRequest[];
  issues: Issue[];
};

export type DailyActivityData = {
  days: DailyActivity[];
};

export type FetchActivityInput = {
  token: string;
  repoSlug: string;
  since: string;
  until: string;
  includePRs?: boolean;
  includeIssues?: boolean;
};
