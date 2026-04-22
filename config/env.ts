function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function requireMinLength(key: string, minLength: number): string {
  const value = requireEnv(key);
  if (value.length < minLength) {
    throw new Error(`${key} must be at least ${minLength} characters long.`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalRawEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

export const env = {
  // Session
  SESSION_SECRET: requireMinLength("SESSION_SECRET", 32),

  // Upstash (optional, recommended for public/serverless rate limiting)
  UPSTASH_REDIS_REST_URL: optionalRawEnv("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: optionalRawEnv("UPSTASH_REDIS_REST_TOKEN"),

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
