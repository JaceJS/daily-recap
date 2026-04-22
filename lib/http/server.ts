type QueryValue = string | number | boolean | null | undefined;

type ServerRequestOptions = RequestInit & {
  query?: Record<string, QueryValue>;
  errorPrefix?: string;
  timeoutMs?: number;
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

function createRequestSignal(
  timeoutMs?: number,
  signal?: AbortSignal | null,
): { signal?: AbortSignal; cleanup: () => void; didTimeout: () => boolean } {
  if (!timeoutMs && !signal) {
    return {
      signal: undefined,
      cleanup: () => {},
      didTimeout: () => false,
    };
  }

  const controller = new AbortController();
  let timeoutTriggered = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener(
        "abort",
        () => controller.abort(signal.reason),
        { once: true },
      );
    }
  }

  if (timeoutMs) {
    timeoutId = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort(new Error("Request timed out."));
    }, timeoutMs);
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId) clearTimeout(timeoutId);
    },
    didTimeout: () => timeoutTriggered,
  };
}

export async function requestServerResponse(
  input: string,
  {
    query,
    errorPrefix = "HTTP request failed",
    timeoutMs,
    signal,
    ...init
  }: ServerRequestOptions = {},
): Promise<Response> {
  const request = createRequestSignal(timeoutMs, signal);

  try {
    const response = await fetch(buildUrl(input, query), {
      ...init,
      signal: request.signal,
    });
    return await ensureOk(response, errorPrefix);
  } catch (error) {
    if (request.didTimeout()) {
      throw new Error(`${errorPrefix}: Request timed out.`);
    }
    throw error;
  } finally {
    request.cleanup();
  }
}

export async function requestServerJson<T>(
  input: string,
  options: ServerRequestOptions = {},
): Promise<T> {
  const response = await requestServerResponse(input, options);
  return response.json() as Promise<T>;
}
