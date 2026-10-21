import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("API request lifecycle", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000/api/v1");
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the configured base URL and sends credentialed requests", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { admin: { email: "admin@example.test" } } }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const { apiRequest } = await import("@/lib/api");

    await expect(apiRequest("/auth/me")).resolves.toEqual({ data: { admin: { email: "admin@example.test" } } });
    expect(fetch).toHaveBeenCalledWith("http://localhost:4000/api/v1/auth/me", expect.objectContaining({ credentials: "include" }));
  });

  it("turns a stalled request into a retryable timeout error", async () => {
    const fetch = vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }));
    vi.stubGlobal("fetch", fetch);
    const { apiRequest } = await import("@/lib/api");

    await expect(apiRequest("/auth/me", { timeoutMs: 5 })).rejects.toMatchObject({ status: 408, message: expect.stringContaining("did not respond") });
  });

  it("does not broadcast the auth/me 401 and trigger a duplicate redirect", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Please sign in to continue." } }), { status: 401 }));
    vi.stubGlobal("fetch", fetch);
    const dispatch = vi.spyOn(window, "dispatchEvent");
    const { apiRequest } = await import("@/lib/api");

    await expect(apiRequest("/auth/me")).rejects.toMatchObject({ status: 401 });
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: "doctor-tracker:session-expired" }));
  });
});
