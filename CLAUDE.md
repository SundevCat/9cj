# 9CJ Corp — Personal AI Operating System

## Project Overview

A focused trading dashboard for XAU/USD. Runs on `localhost:3000`. State lives in a local SQLite file (`prisma/dev.db`) via Prisma. Live trading goes through Capital.com's REST API.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, `src/` directory) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | SQLite (single file at `prisma/dev.db`) via Prisma ORM |
| Charts | Recharts + Lightweight Charts (TradingView) |
| Indicators | `technicalindicators` npm package |
| Price Data | Capital.com (primary, bid/ask) → gold-api.com (fallback) → synthetic |
| Broker (live trades) | Capital.com REST API (demo or live) |
| Smart Home | Home Assistant local REST API (optional) |
| Drag-Drop | @dnd-kit/core + @dnd-kit/sortable |

## Commands

```bash
npm run dev               # Start dev server (localhost:3000)
npm run build             # Production build
npm run lint              # ESLint
npx prisma studio         # Open Prisma DB browser
npx prisma migrate dev    # Apply schema changes (preferred)
npx prisma db push        # Sync schema without migration history (dev shortcut)
npx prisma generate       # Regenerate Prisma client
```

### Always run after a job

After finishing any meaningful change (new module, schema edit, refactor),
run these **three** steps and fix anything that comes up:

```bash
npm run lint    # 1. ESLint
npm run build   # 2. Production build (catches type errors dev doesn't)
# 3. Update CLAUDE.md + SKILL.md so they reflect what changed
```

**Step 3 is not optional.** Both docs are the durable map of the project for
future sessions / contributors. If you added a new API route, a new lib file,
a new model, or changed a convention — update both. Specifically:

- New API route → add a row to the API Routes table
- New lib file → add to Project Structure
- New Prisma model → add to the Prisma Schema list
- New env var → update the Environment Variables block
- New cross-cutting rule → add to Key Conventions
- New top-level page / sidebar entry → update Modules Summary
- New safety/security rule → add to SKILL.md Section 8
- New file worth knowing about → add to SKILL.md Quick Reference

The build catches type errors `next dev` doesn't surface (the build worker
uses stricter TS settings, e.g. it won't iterate `Map` / `Set` with `[...]`
spread — use `Array.from(...)` instead). Common type traps in this codebase:

- SQLite has no native JSON — `Memory.metadata`, `Task.metadata`, `Violation.context`, `BrokerSnapshot.raw` are `String?` / `String`. Always `JSON.stringify` on write and `JSON.parse` on read.
- `Map.entries()` / `Map.values()` / `Set` spread: use `Array.from(...)`, not `[...x]`.
- `routeAction({ pnl })`: expects `number | undefined`, not `number | null` — pass `pnl ?? undefined`.
- Recharts `<Tooltip formatter>`: param is `ValueType | undefined`, not `number` — coerce with `Number(v)`.
- lightweight-charts v5 `time`: cast unix-seconds to `UTCTimestamp` (`import type { UTCTimestamp } from "lightweight-charts"`).
- Apostrophes inside JSX text need `&apos;` (e.g. `module&apos;s`).
- Capital.com `placeOrder` → store **`affectedDeals[0].dealId`** as `brokerDealId`, NOT `confirm.dealId`. The top-level `dealId` is the order confirmation id; only `affectedDeals[].dealId` is the persistent position id that `DELETE /positions/{id}` accepts.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Dashboard (root)
│   ├── layout.tsx                        # Root layout with shell + StreamProvider
│   ├── xau/                              # Quant XAU Trading Desk + auto-trader
│   └── api/                              # API routes (see below)
├── components/
│   ├── shell/                            # Layout: Topbar, Sidebar, LiveStatusPills
│   ├── stream/                           # SSE: StreamProvider, ToastContainer
│   └── ui/                               # Shared: MetricCard, ModuleCard, LogEntry, StatusBadge
└── lib/
    ├── prisma.ts                         # Prisma client singleton
    ├── goldApi.ts                        # XAU spot pricing (broker → gold-api → synthetic)
    ├── capital.ts                        # Capital.com REST client
    ├── broker.ts                         # Broker facade (Capital-only today)
    ├── autoTrader.ts                     # Consensus-driven auto-trader (RSI+MACD+EMA)
    ├── indicators.ts                     # RSI, MACD, EMA calculations
    ├── memory.ts                         # Memory log helpers
    ├── policy.ts                         # Policy rule engine (programmatic; no admin UI)
    ├── router.ts                         # Policy + HIL action router
    ├── seed.ts                           # Price history seed helpers
    └── setting.ts                        # Settings key/value store
```

## Module Structure Convention

Each module follows this pattern:

```
src/app/<module>/
├── page.tsx                # Thin server component — just renders the _component
└── _components/
    └── <ModuleName>Page.tsx  # Main client component ("use client")
```

API routes live at `src/app/api/<module>/route.ts` — always use Prisma for DB access via `src/lib/prisma.ts`.

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/price` | GET | Live XAU/USD price |
| `/api/price/history` | GET | OHLCV price history |
| `/api/signals` | GET | RSI/MACD/EMA signals |
| `/api/trades` | GET, POST | Trade journal + live order placement (isLive flag) |
| `/api/broker/info` | GET | Active broker + readiness |
| `/api/broker/account` | GET | Broker account summary (cached 30s) |
| `/api/broker/market-info` | GET | Capital market info (margin factor, lot size); cached 5min |
| `/api/broker/trades/close` | POST | Close a live broker position (with 404→open-positions recovery) |
| `/api/autotrader` | GET, PUT | Auto-trader config + state |
| `/api/autotrader/status` | GET | Read-only dry-run: signals, votes, verdict, next action |
| `/api/autotrader/trigger` | POST | Manual "Trade now" — bypasses signal + cooldown |
| `/api/memories` | GET, POST | Memory log entries (dashboard activity feed) |
| `/api/reseed` | POST | Reseed price history |
| `/api/stream` | GET | SSE real-time stream (also fires auto-trader tick) |

## Prisma Schema (SQLite)

Models: `Trade`, `Memory`, `Policy`, `Task`, `Price`, `Setting`, `Violation`, `BrokerSnapshot`

`DATABASE_URL="file:./dev.db"` in `.env` — resolved relative to `prisma/`. No Docker / external services required.

`Policy`, `Task`, and `Violation` have no admin UI but stay in the schema because `routeAction()` enforces them on every live trade.

## Design System

### Color Palette (Dark OS Theme)

```
Backgrounds:  #0a0c10  #111318  #161a22
Accents:
  Blue:   #63B3ED  (primary actions, XAU desk)
  Green:  #68D391  (positive / BUY signals)
  Amber:  #F6AD55  (warnings / NEUTRAL)
  Red:    #FC8181  (danger / SELL signals / violations)
  Purple: #B794F4  (AI / agents / auto-trader)
```

### Typography
- **Headings:** Syne font
- **Data / Mono:** Space Mono font

### UI Components (reuse these, don't reinvent)
- `MetricCard` — stat card with label, value, optional trend
- `ModuleCard` — section card with title and body slot
- `LogEntry` — timestamped log line with colored tag badge
- `StatusBadge` — pill badge: OK | WARN | ERROR | PENDING

## Shell Layout

- **Topbar** — sticky, logo left, live status pills right (LIVE / XAU / approvals count) driven by `useStream()`
- **Sidebar** — 200px fixed, grouped nav: Overview / Trading / Operations / System
- **Main** — scrollable content area rendering active module

## Real-time (SSE)

`StreamProvider` wraps the app and listens to `/api/stream`. Events emitted by `/api/stream/route.ts`:

```typescript
{ type: 'tick', time: number }
{ type: 'price', value: number, delta: number, source: string }
{ type: 'memory', entry: { id, agent, tag, message, createdAt } }
{ type: 'alert', severity: 'HIGH'|'MEDIUM'|'LOW', title, message, module }
{ type: 'metrics', servicesHealthy, servicesTotal, approvalsPending, pricePerf }
```

The pulse runs every 5s and also drives `autoTrader.tick()` so the bot acts on the same cadence the UI updates.

## Environment Variables

```env
DATABASE_URL="file:./dev.db"
TZ=Asia/Bangkok

BROKER=capital                  # capital | none (auto-detect if unset)
GOLD_API_KEY=...                # gold-api.io (fallback price source)
CAPITAL_API_KEY=...             # Capital.com API key
CAPITAL_EMAIL=...               # Capital.com login email
CAPITAL_API_PASSWORD=...        # Capital.com custom API password (NOT login password)
CAPITAL_ENV=demo                # demo | live
```

## Key Conventions

- Trades are USD per Capital.com.
- Timestamps stored UTC, displayed in **Asia/Bangkok** timezone.
- Use `prisma` singleton from `src/lib/prisma.ts` — never import `PrismaClient` directly.
- API routes return `NextResponse.json(data)` — always handle errors with `{ error: message }`.
- Client components must start with `"use client"` — keep `page.tsx` files as server components.
- Signal values: `BUY` | `SELL` | `NEUTRAL`
- Trade direction: `LONG` | `SHORT`
- Task status: `PENDING` | `APPROVED` | `REJECTED` | `DONE`
- Memory tags: `TRADE` | `POLICY` | `AI` | `SYS` | `OK` | `WARN` | `ERR`
- **RSI uses MOMENTUM, not mean-reversion**: `value < 30 = SELL` (strong downside, ride the trend), `value > 70 = BUY` (strong upside, ride the trend). This is the **opposite** of the textbook Wilder convention. The flip applies to both live signals (`lib/indicators.ts`) AND backtest entries (`lib/backtest.ts` `rsiSignals`). Don't "fix" this during code review.
- **Shell layout uses `h-screen` (NOT `min-h-screen`) on the inner flex container** in [`src/app/layout.tsx`](src/app/layout.tsx). This constrains the row so `<main>` scrolls internally and Sidebar/Topbar stay pinned. Switching back to `min-h-screen` breaks the app shell — the body scrolls, taking Sidebar with it.
- **Live trades go through `routeAction()` from `src/lib/router.ts`** so `MAX_TRADE_SIZE` / `DAILY_LOSS` policies + HIL approvals always apply — including auto-trader orders.
- **Auto-trader** runs server-side on the SSE pulse (every 5s); config + state live in the `Setting` table under `autotrader.*` keys. Never call `placeOrder()` directly from `tick()` — always go through `routeAction()`.
- **Auto-trader strategies**: `CONSENSUS` (3/3) and `MAJORITY_2OF3` (2/3 with no opposing). Strategy dispatcher is `deriveSignal()` in [`src/lib/autoTrader.ts`](src/lib/autoTrader.ts) — exported so other code can reuse the same vote math.
- **Manual `↯ Trade now`** button in the Auto-Trader panel calls `triggerManual()` — bypasses signal + cooldown but **still routes through `routeAction()`**.
- **`previewTick()`** is the read-only sibling of `tick()` — same decision tree, zero side effects. The Brain panel polls `/api/autotrader/status` every 2s to surface "what would happen now" without firing real trades.
- **Capital position id gotcha** — when calling `placeOrder()`, store `confirm.affectedDeals[0].dealId` as `brokerDealId`, NOT the top-level `confirm.dealId`. Only `affectedDeals[].dealId` is the persistent position id that `DELETE /positions/{id}` accepts.
- **`closeTrade()` has a fallback** — when Capital returns `404 error.not-found.dealId`, it auto-looks-up open positions via `getOpenTrades(instrument)` and retries with the right id. If still no match, throws `CapitalPositionNotFoundError`, and `/api/broker/trades/close` marks the local Trade CLOSED so the UI doesn't get stuck.

## Modules Summary

| Module | Route | Status |
|--------|-------|--------|
| Dashboard | `/` | Live · XAU price · stream status · activity feed |
| Quant XAU Desk | `/xau` | Live · Capital.com trading · timeframe picker · reseed · Auto-Trader (CONSENSUS / MAJORITY_2OF3) · ↯ Trade now · 🧠 Brain panel · SL/TP/Margin columns |
