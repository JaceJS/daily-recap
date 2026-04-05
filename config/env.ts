function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  // Session
  SESSION_SECRET: requireEnv("SESSION_SECRET"),

  // GitLab
  GITLAB_URL: optionalEnv("GITLAB_URL", "https://gitlab.com"),

  // OpenRouter
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_MODEL: optionalEnv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free"),

  // Runtime
  NODE_ENV: optionalEnv("NODE_ENV", "development") as
    | "development"
    | "production"
    | "test",
} as const;
