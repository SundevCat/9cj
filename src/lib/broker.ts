// Broker facade — Capital.com is currently the only supported broker. The
// facade shape is kept so call sites stay stable if another broker is added
// later. To swap brokers, write a new client matching this interface and add
// a branch in each function below.

import * as capital from "./capital";

export type BrokerName = "capital" | "none";

export type BrokerAccount = {
  accountId: string;
  name: string;
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
};

export type BrokerOrderRequest = {
  instrument: string;     // canonical name, e.g. "XAU_USD" (Capital maps to "GOLD")
  units: number;          // positive = LONG/BUY, negative = SHORT/SELL
  stopLossPrice?: number;
  takeProfitPrice?: number;
  clientComment?: string;
};

export type BrokerOrderResult = {
  orderId: string;
  tradeId?: string;
  fillPrice?: number;
  units: number;
  instrument: string;
  status: string;
  time: string;
};

export type BrokerTrade = {
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
};

export type BrokerCapabilities = {
  name: BrokerName;
  configured: boolean;
  envHint?: string;
};

// ── Detection ────────────────────────────────────────────────────────────────

function isReal(v: string | undefined, ...placeholders: string[]): v is string {
  if (!v) return false;
  return !placeholders.includes(v);
}

function describeCapital(): BrokerCapabilities {
  const hasKey = isReal(process.env.CAPITAL_API_KEY, "your_capital_api_key_here");
  const hasEmail = isReal(process.env.CAPITAL_EMAIL, "your_capital_email_here");
  const hasPw = isReal(process.env.CAPITAL_API_PASSWORD, "your_capital_api_password_here");
  return {
    name: "capital",
    configured: hasKey && hasEmail && hasPw,
    envHint: !hasKey
      ? "CAPITAL_API_KEY not set"
      : !hasEmail
        ? "CAPITAL_EMAIL not set"
        : !hasPw
          ? "CAPITAL_API_PASSWORD not set (the custom API password, NOT login)"
          : undefined,
  };
}

export function currentBroker(): BrokerCapabilities {
  // BROKER env var was used historically to switch between OANDA and Capital.
  // Now that Capital is the only broker, the only meaningful values are
  // "capital" (force on) and "none" (force off). Anything else falls through
  // to auto-detect based on whether Capital creds are present.
  const explicit = (process.env.BROKER ?? "").toLowerCase();
  if (explicit === "none") return { name: "none", configured: false, envHint: "BROKER=none" };
  if (explicit === "capital") return describeCapital();
  // Auto-detect: if creds look real, use Capital; else nothing.
  const cap = describeCapital();
  if (cap.configured) return cap;
  return { name: "none", configured: false, envHint: cap.envHint ?? "No broker configured" };
}

export class BrokerUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrokerUnavailableError";
  }
}

function ensureConfigured(): BrokerName {
  const c = currentBroker();
  if (!c.configured) {
    throw new BrokerUnavailableError(
      `Broker "${c.name}" is not configured: ${c.envHint ?? "missing env vars"}`
    );
  }
  return c.name;
}

// ── Operations ───────────────────────────────────────────────────────────────

export async function getCurrentPrice(instrument: string): Promise<{ bid: number; ask: number; mid: number }> {
  ensureConfigured();
  return capital.getCurrentPrice(instrument);
}

export async function getAccount(): Promise<BrokerAccount> {
  ensureConfigured();
  return capital.getAccount();
}

export async function placeOrder(req: BrokerOrderRequest): Promise<BrokerOrderResult> {
  ensureConfigured();
  return capital.placeOrder(req);
}

export async function closeTrade(tradeId: string, units?: number): Promise<{ closePrice: number; realizedPL: number }> {
  ensureConfigured();
  return capital.closeTrade(tradeId, units);
}

export async function getOpenTrades(instrument?: string): Promise<BrokerTrade[]> {
  ensureConfigured();
  return capital.getOpenTrades(instrument);
}

export async function getMarketInfo(instrument: string) {
  ensureConfigured();
  return capital.getMarketInfo(instrument);
}
