"use server";

import { getCurrentUser } from "@/actions/auth";
import { listProjects as listGitHubProjects } from "@/features/github/service";
import { listProjects as listGitLabProjects } from "@/features/gitlab/service";
import type { Project, ActionResult } from "@/types";

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
