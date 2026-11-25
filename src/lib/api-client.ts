/** Tiny typed fetch wrapper for the browser. Throws ApiError with the server's message. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

type Options = { method?: string; json?: unknown; body?: BodyInit };

export async function api<T = unknown>(url: string, opts: Options = {}): Promise<T> {
  const init: RequestInit = { method: opts.method ?? "GET", credentials: "same-origin" };
  if (opts.json !== undefined) {
    const body = JSON.stringify(opts.json);
    init.body = body;
    init.headers = { "Content-Type": "application/json" };
    // keepalive lets a save finish even if the tab is closing (browsers cap it at 64 KB).
    if (body.length < 60_000) init.keepalive = true;
  } else if (opts.body) {
    init.body = opts.body;
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError(0, "network_error", "Could not reach the server. Check your connection.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error;
    if (res.status === 401 && err?.code === "unauthorized" && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(
      res.status,
      err?.code ?? "error",
      err?.message ?? `Request failed (${res.status}).`,
      err?.details,
    );
  }
  return data as T;
}
