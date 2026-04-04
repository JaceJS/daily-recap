// Raw GitLab REST API response shapes — not used outside this feature module
export type GitLabProject = {
  id: number;
  path_with_namespace: string;
  name: string;
  name_with_namespace: string;
  web_url: string;
  last_activity_at: string;
};

export type GitLabCommit = {
  id: string;
  title: string;
  authored_date: string;
  web_url: string;
};

export type GitLabMR = {
  id: number;
  title: string;
  state: string;
  updated_at: string;
  web_url: string;
};

export type GitLabIssue = {
  id: number;
  title: string;
  state: string;
  updated_at: string;
  web_url: string;
};
