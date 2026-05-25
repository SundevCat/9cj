// Capital.com REST API client
// Supports demo and live environments
// Docs: https://open-api.capital.com/

const CAPITAL_ENV = process.env.CAPITAL_ENV ?? "demo";
const CAPITAL_API_KEY = process.env.CAPITAL_API_KEY ?? "";
const CAPITAL_EMAIL = process.env.CAPITAL_EMAIL ?? "";
const CAPITAL_API_PASSWORD = process.env.CAPITAL_API_PASSWORD ?? "";

const BASE_URL =
  CAPITAL_ENV === "live"
    ? "https://api-capital.backend-capital.com"
    : "https://demo-api-capital.backend-capital.com";

// Map our canonical instrument names → Capital.com epic codes
// Keeps callers using "XAU_USD" without knowing about Capital.com naming.
const EPIC_MAP: Record<string, string> = {
  XAU_USD: "GOLD",
  XAG_USD: "SILVER",
  EUR_USD: "EURUSD",
  GBP_USD: "GBPUSD",
  USD_JPY: "USDJPY",
};

function toEpic(instrument: string): string {
  return EPIC_MAP[instrument] ?? instrument;
}

// ── Shared types (kept compatible with oanda.ts) ─────────────────────────────

export type CapitalSide = "BUY" | "SELL";

export interface CapitalOrderRequest {
  instrument: string;           // e.g. "XAU_USD" (mapped to "GOLD" internally)
  units: number;                // positive = buy, negative = sell
  stopLossPrice?: number;
  takeProfitPrice?: number;
  clientComment?: string;
}

export interface CapitalOrderResult {
  orderId: string;        // Capital dealReference
  tradeId?: string;       // Capital dealId
  fillPrice?: number;
  units: number;
  instrument: string;
  status: string;
  time: string;
}

export interface CapitalAccount {
  accountId: string;
  name: string;          // human-readable name from Capital (e.g. "Demo Account 1")
  balance: number;
  currency: string;
  unrealizedPL: number;
  realizedPL: number;
  marginUsed: number;
  marginAvailable: number;
  openTradeCount: number;
  openPositionCount: number;
  pendingOrderCount: number;
  nav: number;
}

export interface CapitalTrade {
  id: string;
  instrument: string;
  price: number;
  openTime: string;
  state: string;
  currentUnits: number;
  realizedPL: number;
  unrealizedPL: number;
  closeTime?: string;
  closePrice?: number;
  stopLossOrder?: { price: number };
  takeProfitOrder?: { price: number };
}

// ── Session management ───────────────────────────────────────────────────────
// Capital.com sessions last ~10 min idle. Cache tokens + refresh on expiry.

type Session = { cst: string; xst: string; expiresAt: number };

// Use a global to survive Next.js dev hot-reload (module-scoped state resets
// otherwise, and Capital rate-limits POST /session aggressively — ~5/min).
const g = globalThis as unknown as {
  __capitalSession?: Session | null;
  __capitalLoginPromise?: Promise<Session> | null;
  __capitalLoginCooldownUntil?: number;
};
g.__capitalSession ??= null;
g.__capitalLoginPromise ??= null;
g.__capitalLoginCooldownUntil ??= 0;

async function login(): Promise<Session> {
  if (!CAPITAL_API_KEY) throw new Error("CAPITAL_API_KEY not set");
  if (!CAPITAL_EMAIL) throw new Error("CAPITAL_EMAIL not set");
  if (!CAPITAL_API_PASSWORD) throw new Error("CAPITAL_API_PASSWORD not set (this is the custom API password, NOT your login password)");

  // Respect a recent 429 — don't keep banging the door
  if (Date.now() < (g.__capitalLoginCooldownUntil ?? 0)) {
    const wait = Math.ceil(((g.__capitalLoginCooldownUntil ?? 0) - Date.now()) / 1000);
    throw new Error(`Capital login cooldown · ${wait}s left (was rate-limited)`);
  }

  const res = await fetch(`${BASE_URL}/api/v1/session`, {
    method: "POST",
    headers: {
      "X-CAP-API-KEY": CAPITAL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identifier: CAPITAL_EMAIL,
      password: CAPITAL_API_PASSWORD,
      encryptedPassword: false,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    if (res.status === 429) {
      // Back off for 60s — Capital rate-limits POST /session aggressively
      g.__capitalLoginCooldownUntil = Date.now() + 60_000;
    }
    throw new Error(`Capital login ${res.status}: ${text}`);
  }

  const cst = res.headers.get("CST");
  const xst = res.headers.get("X-SECURITY-TOKEN");
  if (!cst || !xst) throw new Error("Capital login succeeded but tokens missing in response");

  return {
    cst,
    xst,
    // 9 minutes — Capital's hard expiry is 10 min, refresh a bit early
    expiresAt: Date.now() + 9 * 60_000,
  };
}

async function getSession(): Promise<Session> {
  if (g.__capitalSession && g.__capitalSession.expiresAt > Date.now()) return g.__capitalSession;
  // Coalesce concurrent login attempts so we don't burn 5 sessions on a burst
  if (!g.__capitalLoginPromise) {
    g.__capitalLoginPromise = login().finally(() => {
      g.__capitalLoginPromise = null;
    });
  }
  g.__capitalSession = await g.__capitalLoginPromise;
  return g.__capitalSession;
}

// Reset on auth failure so the next call re-logs in
function invalidateSession() {
  g.__capitalSession = null;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function capitalFetch<T>(
  path: string,
  options: RequestInit = {},
  retryOnAuthFail = true,
): Promise<T> {
  const session = await getSession();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "X-SECURITY-TOKEN": session.xst,
      "CST": session.cst,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  // 401 likely means session expired between cache check and request — retry once
  if (res.status === 401 && retryOnAuthFail) {
    invalidateSession();
    return capitalFetch<T>(path, options, false);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Capital ${res.status}: ${text}`);
  }

  // Some endpoints (DELETE) may return empty body
  const ctype = res.headers.get("content-type") ?? "";
  if (!ctype.includes("application/json")) return {} as T;
  return res.json() as Promise<T>;
}

// ── Account ───────────────────────────────────────────────────────────────────

export async function getAccount(): Promise<CapitalAccount> {
  const data = await capitalFetch<{
    accounts: Array<{
      accountId: string;
      accountName: string;
      preferred: boolean;
      currency: string;
      balance: {
        balance: number;
        deposit: number;
        profitLoss: number;
        available: number;
      };
    }>;
  }>("/api/v1/accounts");

  const acct = data.accounts.find((a) => a.preferred) ?? data.accounts[0];
  if (!acct) throw new Error("No Capital.com account found");

  // Open positions for unrealized P&L + count
  let unrealizedPL = 0;
  let openTradeCount = 0;
  try {
    const positions = await capitalFetch<{ positions: Array<{ position: { upl?: number } }> }>(
      "/api/v1/positions"
    );
    openTradeCount = positions.positions.length;
    unrealizedPL = positions.positions.reduce((s, p) => s + (p.position.upl ?? 0), 0);
  } catch {
    // Non-fatal — leave unrealized as 0
  }

  return {
    accountId: acct.accountId,
    name: acct.accountName,
    balance: acct.balance.balance,
    currency: acct.currency,
    unrealizedPL,
    realizedPL: acct.balance.profitLoss,
    marginUsed: Math.max(0, acct.balance.balance - acct.balance.available),
    marginAvailable: acct.balance.available,
    openTradeCount,
    openPositionCount: openTradeCount,
    pendingOrderCount: 0,
    nav: acct.balance.balance + unrealizedPL,
  };
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function placeOrder(req: CapitalOrderRequest): Promise<CapitalOrderResult> {
  const epic = toEpic(req.instrument);
  const direction: CapitalSide = req.units >= 0 ? "BUY" : "SELL";
  const size = Math.abs(req.units);

  const body: Record<string, unknown> = {
    epic,
    direction,
    size,
    guaranteedStop: false,
    forceOpen: true,
  };
  if (req.stopLossPrice != null) body.stopLevel = req.stopLossPrice;
  if (req.takeProfitPrice != null) body.profitLevel = req.takeProfitPrice;

  const placed = await capitalFetch<{ dealReference: string }>(
    "/api/v1/positions",
    { method: "POST", body: JSON.stringify(body) }
  );

  // Look up confirmation to get fill price + dealId
  let dealId: string | undefined;
  let fillPrice: number | undefined;
  let status = "PENDING";
  try {
    const confirm = await capitalFetch<{
      dealId?: string;
      affectedDeals?: Array<{ dealId: string; status: string }>;
      level?: number;
      status?: string;
      reason?: string;
    }>(`/api/v1/confirms/${placed.dealReference}`);
    // affectedDeals[].dealId is the persistent POSITION id we need for close/DELETE.
    // confirm.dealId is just the order's confirmation id — Capital 404s on DELETE for it.
    dealId = confirm.affectedDeals?.[0]?.dealId ?? confirm.dealId;
    fillPrice = confirm.level;
    status = confirm.status ?? "ACCEPTED";
    if (status !== "ACCEPTED" && status !== "OPEN") {
      throw new Error(`Capital order ${status}: ${confirm.reason ?? "no reason given"}`);
    }
  } catch (e) {
    // Confirmation may be slightly delayed — return what we have so far
    if ((e as Error).message.startsWith("Capital order")) throw e;
  }

  return {
    orderId: placed.dealReference,
    tradeId: dealId,
    fillPrice,
    units: req.units,
    instrument: req.instrument,
    status,
    time: new Date().toISOString(),
  };
}

// ── Close trade ───────────────────────────────────────────────────────────────

export class CapitalPositionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapitalPositionNotFoundError";
  }
}

function isDealIdNotFound(e: unknown): boolean {
  const msg = (e as Error)?.message ?? "";
  return msg.includes("error.not-found.dealId") || /Capital 404:.*dealId/i.test(msg);
}

async function deleteByDealId(dealId: string): Promise<{ dealReference: string }> {
  return capitalFetch<{ dealReference: string }>(
    `/api/v1/positions/${dealId}`,
    { method: "DELETE" }
  );
}

export async function closeTrade(
  dealId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _units?: number,
): Promise<{ closePrice: number; realizedPL: number }> {
  let closed: { dealReference: string };
  try {
    closed = await deleteByDealId(dealId);
  } catch (e) {
    if (!isDealIdNotFound(e)) throw e;

    // Recovery: our stored dealId is wrong (typically because we stored the
    // order-confirmation id from older code). Look up live open positions for
    // XAU_USD and retry with the right one.
    console.warn(`[capital] dealId ${dealId} 404; falling back to open-positions lookup`);
    const open = await getOpenTrades("XAU_USD");
    if (open.length === 0) {
      throw new CapitalPositionNotFoundError(
        "Position not found on Capital — already closed (SL/TP hit, manually closed in Capital app, or never opened)"
      );
    }
    if (open.length > 1) {
      const ids = open.map((p) => p.id).join(", ");
      throw new CapitalPositionNotFoundError(
        `dealId mismatch and ${open.length} open positions exist (${ids}) — refuse to guess. Close them manually in the Capital app.`
      );
    }
    const realDealId = open[0].id;
    console.warn(`[capital] retrying close with real dealId ${realDealId}`);
    closed = await deleteByDealId(realDealId);
  }

  let closePrice = 0;
  let realizedPL = 0;
  try {
    const confirm = await capitalFetch<{ level?: number; profit?: number }>(
      `/api/v1/confirms/${closed.dealReference}`
    );
    closePrice = confirm.level ?? 0;
    realizedPL = confirm.profit ?? 0;
  } catch {
    // Confirmation lookup failed — return zeros, caller can refresh later
  }

  return { closePrice, realizedPL };
}

// ── Open trades ───────────────────────────────────────────────────────────────

export async function getOpenTrades(instrument?: string): Promise<CapitalTrade[]> {
  const data = await capitalFetch<{
    positions: Array<{
      position: {
        dealId: string;
        dealReference: string;
        direction: CapitalSide;
        size: number;
        level: number;
        createdDate: string;
        stopLevel?: number;
        profitLevel?: number;
        upl?: number;
      };
      market: { epic: string; instrumentName: string };
    }>;
  }>("/api/v1/positions");

  const wantEpic = instrument ? toEpic(instrument) : null;
  return data.positions
    .filter((p) => (wantEpic ? p.market.epic === wantEpic : true))
    .map((p) => ({
      id: p.position.dealId,
      instrument: p.market.epic,
      price: p.position.level,
      openTime: p.position.createdDate,
      state: "OPEN",
      // Capital sizes are always positive; we encode side via sign for consistency with OANDA
      currentUnits: p.position.direction === "BUY" ? p.position.size : -p.position.size,
      realizedPL: 0,
      unrealizedPL: p.position.upl ?? 0,
      stopLossOrder: p.position.stopLevel != null ? { price: p.position.stopLevel } : undefined,
      takeProfitOrder: p.position.profitLevel != null ? { price: p.position.profitLevel } : undefined,
    }));
}

// ── Price ────────────────────────────────────────────────────────────────────

// ── Market info (margin factor, lot size, etc.) ─────────────────────────────
// Cached in globalThis for ~5 min to avoid spamming Capital's /markets endpoint.

export type CapitalMarketInfo = {
  epic: string;
  instrumentName: string;
  marginFactor: number;
  marginFactorUnit: "PERCENTAGE" | "MONETARY";
  lotSize: number;
  currency: string;
};

type MarketCacheEntry = { value: CapitalMarketInfo; expiresAt: number };
const mkg = globalThis as unknown as { __capitalMarketCache?: Map<string, MarketCacheEntry> };
mkg.__capitalMarketCache ??= new Map();

export async function getMarketInfo(instrument: string): Promise<CapitalMarketInfo> {
  const epic = toEpic(instrument);
  const cached = mkg.__capitalMarketCache!.get(epic);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const data = await capitalFetch<{
    instrument?: {
      epic?: string;
      name?: string;
      marginFactor?: number;
      marginFactorUnit?: "PERCENTAGE" | "MONETARY";
      lotSize?: number;
      currencies?: Array<{ code: string }>;
    };
    snapshot?: { bid?: number; offer?: number };
  }>(`/api/v1/markets/${epic}`);

  const i = data.instrument ?? {};
  const value: CapitalMarketInfo = {
    epic: i.epic ?? epic,
    instrumentName: i.name ?? epic,
    marginFactor: Number(i.marginFactor ?? 5),
    marginFactorUnit: (i.marginFactorUnit ?? "PERCENTAGE") as "PERCENTAGE" | "MONETARY",
    lotSize: Number(i.lotSize ?? 1),
    currency: i.currencies?.[0]?.code ?? "USD",
  };

  mkg.__capitalMarketCache!.set(epic, {
    value,
    expiresAt: Date.now() + 5 * 60_000,
  });
  return value;
}

export async function getCurrentPrice(
  instrument: string
): Promise<{ bid: number; ask: number; mid: number }> {
  const epic = toEpic(instrument);
  const data = await capitalFetch<{
    snapshot?: { bid: number; offer: number };
  }>(`/api/v1/markets/${epic}`);
  if (!data.snapshot) throw new Error(`No snapshot for ${epic}`);
  const { bid, offer } = data.snapshot;
  return { bid, ask: offer, mid: (bid + offer) / 2 };
}

// ── Historical candles ───────────────────────────────────────────────────────
// Returns real OHLCV bars from Capital.com. Resolution: MINUTE | MINUTE_5 |
// MINUTE_15 | MINUTE_30 | HOUR | HOUR_4 | DAY | WEEK. Max 1000 per call.

export type CapitalResolution =
  | "MINUTE"
  | "MINUTE_5"
  | "MINUTE_15"
  | "MINUTE_30"
  | "HOUR"
  | "HOUR_4"
  | "DAY"
  | "WEEK";

export type CapitalCandle = {
  timestamp: number;       // unix ms
  open: number;            // mid (bid+ask)/2
  high: number;
  low: number;
  close: number;
  volume: number;
};

export async function getCandles(
  instrument: string,
  resolution: CapitalResolution = "MINUTE",
  max: number = 200
): Promise<CapitalCandle[]> {
  const epic = toEpic(instrument);
  const data = await capitalFetch<{
    prices?: Array<{
      snapshotTime: string;
      snapshotTimeUTC?: string;
      openPrice: { bid: number; ask: number };
      closePrice: { bid: number; ask: number };
      highPrice: { bid: number; ask: number };
      lowPrice: { bid: number; ask: number };
      lastTradedVolume?: number;
    }>;
  }>(`/api/v1/prices/${epic}?resolution=${resolution}&max=${Math.min(1000, max)}`);

  const prices = data.prices ?? [];
  const parseUtc = (s: string): number => {
    // Capital sometimes returns "2026-05-22T10:35:00" without a trailing Z;
    // Date.parse treats that as local time. Force UTC by appending Z if absent.
    const fixed = /[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s + "Z";
    return Date.parse(fixed);
  };
  const mid = (b: number, a: number) => Number(((b + a) / 2).toFixed(2));

  const mapped = prices
    .map((p) => ({
      timestamp: parseUtc(p.snapshotTimeUTC ?? p.snapshotTime),
      open: mid(p.openPrice.bid, p.openPrice.ask),
      high: mid(p.highPrice.bid, p.highPrice.ask),
      low: mid(p.lowPrice.bid, p.lowPrice.ask),
      close: mid(p.closePrice.bid, p.closePrice.ask),
      volume: p.lastTradedVolume ?? 0,
    }))
    .filter((c) => Number.isFinite(c.timestamp) && Number.isFinite(c.close))
    .sort((a, b) => a.timestamp - b.timestamp);

  // Dedupe by timestamp — Capital occasionally returns duplicate rows.
  // Keep the last occurrence (most recent value wins).
  const byTs = new Map<number, CapitalCandle>();
  for (const c of mapped) byTs.set(c.timestamp, c);
  return Array.from(byTs.values());
}

export { BASE_URL };
