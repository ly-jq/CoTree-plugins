// Fetch + timeout/retry helpers for the cn-data-tools plugin (weather / finance /
// news). Kept self-contained in the Code Plugin. The transport
// is injectable (CnDataFetch) so verification runs network-free with a mock fetcher.

/** Minimal fetch contract shared by the cn-data tools (mirrors browser-runtime WebSearchFetch). */
export type CnDataFetch = (
  url: string,
  init?: {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  }
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  headers?: {
    get(name: string): string | null;
  };
  text(): Promise<string>;
}>;

export type FetchWithTimeoutInit = {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
};

export type FetchWithRetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onAttempt?: (attempt: FetchRetryAttempt) => void;
  sleep?: (ms: number) => Promise<void>;
};

export type FetchRetryAttempt = {
  attempt: number;
  maxAttempts: number;
  ok: boolean;
  status?: number;
  error?: string;
  retryable: boolean;
  delayMs?: number;
};

export async function fetchWithTimeout(
  fetcher: CnDataFetch,
  url: string,
  parent: AbortSignal | undefined,
  timeoutMs: number,
  userAgent: string,
  init: FetchWithTimeoutInit = {}
): Promise<Awaited<ReturnType<CnDataFetch>>> {
  if (parent?.aborted) {
    throw new Error("Request aborted.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`Request timed out after ${timeoutMs}ms.`)), timeoutMs);
  const abortFromParent = () => controller.abort(parent?.reason);
  parent?.addEventListener("abort", abortFromParent, { once: true });

  try {
    return await fetcher(url, {
      method: init.method ?? "GET",
      headers: {
        "user-agent": userAgent,
        ...(init.headers ?? {})
      },
      ...(init.body !== undefined ? { body: init.body } : {}),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
    parent?.removeEventListener("abort", abortFromParent);
  }
}

export async function fetchWithTimeoutRetry(
  fetcher: CnDataFetch,
  url: string,
  parent: AbortSignal | undefined,
  timeoutMs: number,
  userAgent: string,
  init: FetchWithTimeoutInit = {},
  options: FetchWithRetryOptions = {}
): Promise<Awaited<ReturnType<CnDataFetch>>> {
  const maxAttempts = Math.max(1, Math.floor(options.attempts ?? 5));
  const baseDelayMs = Math.max(0, Math.floor(options.baseDelayMs ?? 250));
  const maxDelayMs = Math.max(baseDelayMs, Math.floor(options.maxDelayMs ?? 5_000));
  const sleep = options.sleep ?? delay;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (parent?.aborted) {
      throw new Error("Request aborted.");
    }

    try {
      const response = await fetchWithTimeout(fetcher, url, parent, timeoutMs, userAgent, init);
      const retryable = isRetryableStatus(response.status);
      if (!retryable || attempt >= maxAttempts) {
        options.onAttempt?.({
          attempt,
          maxAttempts,
          ok: !retryable,
          status: response.status,
          retryable
        });
        return response;
      }

      const delayMs = retryDelayMs(baseDelayMs, maxDelayMs, attempt);
      options.onAttempt?.({
        attempt,
        maxAttempts,
        ok: false,
        status: response.status,
        retryable: true,
        delayMs
      });
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    } catch (error) {
      lastError = error;
      if (parent?.aborted || !isRetryableFetchError(error) || attempt >= maxAttempts) {
        options.onAttempt?.({
          attempt,
          maxAttempts,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          retryable: !parent?.aborted && isRetryableFetchError(error)
        });
        throw error;
      }

      const delayMs = retryDelayMs(baseDelayMs, maxDelayMs, attempt);
      options.onAttempt?.({
        attempt,
        maxAttempts,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        retryable: true,
        delayMs
      });
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? "Request failed."));
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function isRetryableFetchError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timed out|timeout|network|fetch failed|socket|connection|terminated|aborted|reset|econnreset|etimedout|econnrefused|und_err|temporary/i.test(message);
}

function retryDelayMs(baseDelayMs: number, maxDelayMs: number, attempt: number): number {
  if (baseDelayMs <= 0) {
    return 0;
  }
  const exponential = baseDelayMs * 2 ** Math.max(0, attempt - 1);
  return Math.min(maxDelayMs, exponential);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
