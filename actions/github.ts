"use server";

import { getCurrentUser } from "@/actions/auth";
import { fetchActivity, listProjects } from "@/features/github/service";
import type { ActivityData, Project, ActionResult } from "@/lib/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function extractErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function listRepos(): Promise<ActionResult<Project[]>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized." };
  try {
    const data = await listProjects(user.token);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function fetchRepoActivity(
  repoSlug: string,
  since?: string,
  until?: string,
  includePRs?: boolean,
  includeIssues?: boolean
): Promise<ActionResult<ActivityData>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized." };
  try {
    const resolvedSince = since ?? new Date(Date.now() - MS_PER_DAY).toISOString();
    const resolvedUntil = until ?? new Date().toISOString();
    const data = await fetchActivity({
      token: user.token,
      repoSlug,
      since: resolvedSince,
      until: resolvedUntil,
      includePRs,
      includeIssues,
    });
    return { success: true, data };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}
