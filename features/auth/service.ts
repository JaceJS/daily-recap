import type { RegisterUserInput, UserSession } from "./types";

export function buildUserSession(input: RegisterUserInput): UserSession {
  return {
    name: input.name,
    token: input.token,
    provider: input.provider,
  };
}
