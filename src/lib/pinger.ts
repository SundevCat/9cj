// HTTP health check. Returns latency and HTTP status.
// We treat 2xx/3xx as healthy, and 401/403 as "reachable" (server is up, auth required).

export type PingResult = {
  ok: boolean;
  status: number | null;
  latencyMs: number;
  error: string | null;
};

export async function pingUrl(url: string, timeoutMs = 5000): Promise<PingResult> {
  const start = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal,
      redirect: "manual",
    });
    const latencyMs = Date.now() - start;
    // 2xx/3xx = healthy; 401/403 = reachable (API is up, just needs auth)
    const ok = (res.status >= 200 && res.status < 400) || res.status === 401 || res.status === 403;
    return { ok, status: res.status, latencyMs, error: ok ? null : `HTTP ${res.status}` };
  } catch (e) {
    return {
      ok: false,
      status: null,
      latencyMs: Date.now() - start,
      error: (e as Error).name === "AbortError" ? "timeout" : (e as Error).message,
    };
  } finally {
    clearTimeout(t);
  }
}
