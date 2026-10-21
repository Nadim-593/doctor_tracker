const API_URL = process.env.NEXT_PUBLIC_API_URL;
const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(message, status) { super(message); this.name = "ApiError"; this.status = status; }
}

export async function apiRequest(path, options = {}) {
  if (!API_URL) throw new ApiError("API is not configured. Set NEXT_PUBLIC_API_URL.");
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: callerSignal, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort(callerSignal.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  let response;
  try {
    response = await fetch(`${API_URL.replace(/\/$/, "")}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      credentials: "include",
      headers: { ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}), ...fetchOptions.headers },
    });
  } catch (error) {
    if (callerSignal?.aborted) throw error;
    if (controller.signal.aborted) throw new ApiError("The API did not respond in time. Please try again.", 408);
    throw new ApiError("Could not reach the API. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const payload = await response.json();
      message = payload.error?.message || payload.message || message;
    } catch { /* Keep status message. */ }
    if (response.status === 401 && path !== "/auth/login" && path !== "/auth/me" && typeof window !== "undefined") {
      window.dispatchEvent(new Event("doctor-tracker:session-expired"));
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return null;
  return response.json();
}
