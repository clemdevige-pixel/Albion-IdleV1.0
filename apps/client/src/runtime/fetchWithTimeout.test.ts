import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "./fetchWithTimeout";

describe("fetchWithTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("aborts a request that exceeds the configured timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      signal?.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    })));

    const request = fetchWithTimeout("/cloud-save", {}, 50);
    await vi.advanceTimersByTimeAsync(50);

    await expect(request).rejects.toThrow("Remote request timed out");
  });

  it("returns successful responses before the timeout", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))));

    const response = await fetchWithTimeout("/cloud-save", {}, 50);

    expect(response.status).toBe(204);
  });
});
