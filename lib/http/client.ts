type ClientJsonBody = Record<string, unknown> | undefined;

type ClientRequestOptions = RequestInit & {
  jsonBody?: ClientJsonBody;
};

async function getClientError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return (
    (body as { message?: string }).message ??
    response.statusText ??
    `Error ${response.status}`
  );
}

async function requestClient(
  input: string,
  { jsonBody, headers, ...init }: ClientRequestOptions = {},
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(jsonBody ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: jsonBody ? JSON.stringify(jsonBody) : init.body,
  });

  if (!response.ok) {
    throw new Error(await getClientError(response));
  }

  return response;
}

export async function requestClientJson<T>(
  input: string,
  options: ClientRequestOptions = {},
): Promise<T> {
  const response = await requestClient(input, options);
  return response.json() as Promise<T>;
}

export async function streamClientText(
  input: string,
  options: ClientRequestOptions & { onChunk?: (chunk: string, fullText: string) => void } = {},
): Promise<string> {
  const { onChunk, ...requestOptions } = options;
  const response = await requestClient(input, requestOptions);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body.");

  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    accumulated += chunk;
    onChunk?.(chunk, accumulated);
  }

  return accumulated;
}
