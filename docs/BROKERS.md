# Broker — Capital.com

The 9CJ XAU desk uses **Capital.com** for live (paper or real) order execution. Pricing falls back to gold-api.com if Capital is unreachable. The rest of the app (signals, backtest, briefing) doesn't require a broker.

```
┌──────────────────────────┐
│   /xau page              │
│   ├─ PriceTicker         │ ─── /api/price ─────┐
│   ├─ SignalDashboard     │ ─── /api/signals ───┤
│   ├─ CandlestickChart    │ ─── /api/price/...  │
│   ├─ AutoTraderPanel     │ ─── /api/autotrader │
│   └─ TradeJournal        │ ─── /api/trades     │
└──────────────────────────┘                     │
                                                 ▼
        broker facade  ──────►   Capital.com REST API
        src/lib/broker.ts        src/lib/capital.ts
              │
              ▼ fallback when broker down or unconfigured
        gold-api.com (free, no key)
              │
              ▼ last resort
        synthetic random walk
```

---

## Setup

1. Sign up at https://capital.com/trading/signup — free demo with USD 10k virtual.
2. Open the Capital.com web/desktop app → **Settings → API integrations**:
   1. Click **Generate** to create an API key
   2. Set a custom **API password** (separate from your login password — most common stumble)
   3. Copy the API key, your account email, and the API password
3. Update `.env`:

```env
BROKER=capital
CAPITAL_API_KEY=<the generated key>
CAPITAL_EMAIL=<your account email>
CAPITAL_API_PASSWORD=<the custom API password from step 2.2>
CAPITAL_ENV=demo   # or "live" for real money
```

4. Restart `npm run dev`. The Settings page (`/settings`) shows `CAPITAL · READY` when wired correctly.

---

## Quirks worth knowing

- **Custom API password ≠ login password.** This is the #1 setup mistake. You set this once on the API integrations page; it's used for `POST /api/v1/session` and is completely separate from the password you type when you log in to the Capital app.
- **Session expiry.** Capital sessions die after ~10 min of idle. The client in [`src/lib/capital.ts`](../src/lib/capital.ts) caches tokens for 9 min and auto-relogs on 401.
- **Instrument naming.** Capital uses `GOLD` for XAU/USD. The facade maps our canonical `XAU_USD` → `GOLD` (`EPIC_MAP` in `capital.ts`), so nothing else in the app needs to know.
- **Size unit.** Capital GOLD CFD: `size: 1` = 1 contract = 100 oz. OANDA's old `units: 1` was 1 oz. **The auto-trader and TradeJournal both pass `size` straight through** — when you say "0.1 size" you're trading 10 oz of gold, not 0.1 oz. Size your trades accordingly.
- **Demo balance reset.** From inside the Capital app: Settings → Account → Reset balance.
- **All endpoints require an authenticated session,** including pricing (`getCurrentPrice`). There's no anonymous price endpoint.

---

## Files

| Path | Purpose |
|------|---------|
| [`src/lib/capital.ts`](../src/lib/capital.ts) | REST client (session, account, orders, prices) |
| [`src/lib/broker.ts`](../src/lib/broker.ts) | Facade — `currentBroker()` + same six functions |
| [`src/lib/goldApi.ts`](../src/lib/goldApi.ts) | Spot pricing with gold-api.com fallback |
| `src/app/api/broker/info/route.ts` | `GET` — is the broker ready? |
| `src/app/api/broker/account/route.ts` | `GET` — cached account summary |
| `src/app/api/broker/trades/close/route.ts` | `POST` — close a live trade by local `Trade.id` |
| `src/app/api/trades/route.ts` | `POST` with `isLive: true` → live order through the facade |

---

## Database

Live trades land in the `Trade` table with `isLive: true`. Two broker-id columns:
- `brokerOrderId` — Capital's `dealReference`
- `brokerDealId` — Capital's `dealId` (used by `closeTrade`)

> Historical note: these columns were originally named `oandaOrderId`/`oandaTradeId` when OANDA was the broker. The Postgres columns kept their old names (via Prisma `@map`) so historical rows stayed intact; the TypeScript types now use the broker-agnostic names. If you want to physically rename the columns later, write a small `RENAME COLUMN` migration.

The `BrokerSnapshot` table caches account summaries with a `broker` column (currently always `"capital"`).

---

## Previous broker (OANDA)

OANDA fxTrade was the initial integration but had to be removed — OANDA Global Markets (the entity that serves Thai/SEA residents) only exposes MetaTrader 5, which has no REST API. Capital.com works for Thai residents and has a clean REST API. All OANDA code, env vars, and docs were removed; only the historical DB column names remain (as opaque strings).
