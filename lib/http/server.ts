type QueryValue = string | number | boolean | null | undefined;

type ServerRequestOptions = RequestInit & {
  query?: Record<string, QueryValue>;
  errorPrefix?: string;
};

function buildUrl(input: string, query?: Record<string, QueryValue>): string {
  const url = new URL(input);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function ensureOk(response: Response, errorPrefix: string): Promise<Response> {
  if (response.ok) return response;

  const text = await response.text().catch(() => response.statusText);
  const detail = text || response.statusText;
  throw new Error(`${errorPrefix} ${response.status}: ${detail}`);
}

export async function requestServerResponse(
  input: string,
  {
    query,
    errorPrefix = "HTTP request failed",
    ...init
  }: ServerRequestOptions = {},
): Promise<Response> {
  const response = await fetch(buildUrl(input, query), init);
  return ensureOk(response, errorPrefix);
}

export async function requestServerJson<T>(
  input: string,
  options: ServerRequestOptions = {},
): Promise<T> {
  const response = await requestServerResponse(input, options);
  return response.json() as Promise<T>;
}
