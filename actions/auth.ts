"use server";

import { redirect } from "next/navigation";
import { buildUserSession } from "@/features/auth/service";
import { getSession } from "@/lib/session";
import type { Provider, UserSession } from "@/features/auth/types";

type ActionState = { error: string } | null;

const TOKEN_PREFIXES: Record<Provider, string[]> = {
  gitlab: ["glpat-"],
  github: ["github_pat_", "ghp_"],
};

export async function registerUserAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = (formData.get("name") as string)?.trim();
  const token = (formData.get("token") as string)?.trim();
  const rawProvider = (formData.get("provider") as string)?.trim();

  if (!name) return { error: "Name is required." };
  if (name.length > 50) return { error: "Name must be 50 characters or fewer." };
  if (!token) return { error: "Access token is required." };
  if (token.length > 255) return { error: "Token is too long." };

  const provider = rawProvider as Provider;
  if (provider !== "gitlab" && provider !== "github") {
    return { error: "Invalid provider." };
  }

  const validPrefixes = TOKEN_PREFIXES[provider];
  if (!validPrefixes.some((prefix) => token.startsWith(prefix))) {
    return {
      error:
        provider === "gitlab"
          ? "Token must start with glpat-. Check your GitLab access token."
          : "Token must start with github_pat_ or ghp_. Check your GitHub token.",
    };
  }

  try {
    const sessionData = buildUserSession({ name, token, provider });
    const session = await getSession();
    session.name = sessionData.name;
    session.token = sessionData.token;
    session.provider = sessionData.provider;
    await session.save();
  } catch (err) {
    console.error("registerUserAction failed:", err);
    return { error: "Failed to save session. Please try again." };
  }

  redirect("/generate");
}

export async function getCurrentUser(): Promise<UserSession | null> {
  const session = await getSession();
  if (!session.name || !session.token || !session.provider) return null;
  return { name: session.name, token: session.token, provider: session.provider };
}

export async function requireCurrentUser(): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/");
}
