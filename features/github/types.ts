// Raw GitHub REST API response shapes — not used outside this feature module
export type GitHubRepo = {
  id: number;
  full_name: string;
  name: string;
  html_url: string;
  pushed_at: string | null;
};

export type GitHubCommit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    } | null;
  };
};

export type GitHubPR = {
  id: number;
  title: string;
  state: string;
  updated_at: string;
  html_url: string;
};

export type GitHubIssue = {
  id: number;
  title: string;
  state: string;
  updated_at: string;
  html_url: string;
  pull_request?: object; // present when the issue is actually a PR
};
