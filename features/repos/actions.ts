"use server";

import { getCurrentUser } from "@/features/auth/actions";
import { listProjects as listGitHubProjects, listBranches as listGitHubBranches } from "@/features/github/service";
import { listProjects as listGitLabProjects, listBranches as listGitLabBranches } from "@/features/gitlab/service";
import type { Project, Branch, ActionResult } from "@/types";

export async function listRepos(): Promise<ActionResult<Project[]>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized." };

  try {
    const listProjects =
      user.provider === "github" ? listGitHubProjects : listGitLabProjects;
    const projects = await listProjects(user.token);
    return { success: true, data: projects };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch repositories.";
    return { success: false, error: message };
  }
}

export async function listBranches(repoSlug: string): Promise<ActionResult<Branch[]>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized." };

  try {
    const fn = user.provider === "github" ? listGitHubBranches : listGitLabBranches;
    const branches = await fn(user.token, repoSlug);
    return { success: true, data: branches };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch branches.";
    return { success: false, error: message };
  }
}
