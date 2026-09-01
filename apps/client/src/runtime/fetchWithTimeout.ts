const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Bounds optional remote services so they can never hold the local runtime
 * hostage indefinitely. Callers remain responsible for deciding whether a
 * timeout is fatal or whether local state can safely continue.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Request timeout must be a finite positive number");
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => { controller.abort(); }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Remote request timed out", { cause: error });
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
