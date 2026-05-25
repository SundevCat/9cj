# 9CJ Corp — Code Review Skill

## Purpose

Review new or modified code in the **9CJ Corp Personal AI Operating System** project against its established conventions. This skill checks correctness, consistency, security, and maintainability — specifically for this Next.js 14 / Prisma / PostgreSQL / Tailwind / Capital.com stack.

---

## How to Invoke

Say something like:
- "Review this code"
- "Check this file before I commit"
- "Is this following the 9CJ Corp conventions?"
- Paste code directly and ask "is this right?"

---

## Review Checklist

When reviewing code, go through each section below and report findings.

### 1. File & Module Structure

- [ ] New pages live at `src/app/<module>/page.tsx` (thin server component)
- [ ] Client logic lives in `src/app/<module>/_components/<ModuleName>Page.tsx`
- [ ] Client components start with `"use client"` at the top
- [ ] Page components stay as server components (no `"use client"` in `page.tsx`)
- [ ] Shared UI components (MetricCard, ModuleCard, LogEntry, StatusBadge) reused — not recreated

### 2. API Routes

- [ ] Routes live at `src/app/api/<resource>/route.ts`
- [ ] Dynamic segments use `src/app/api/<resource>/[id]/route.ts`
- [ ] All responses use `NextResponse.json(data)` — no raw `Response.json()`
- [ ] Errors return `{ error: string }` with an appropriate HTTP status code (400, 404, 500, 502 for broker, 503 for unconfigured broker)
- [ ] No direct `PrismaClient` instantiation — always import from `src/lib/prisma.ts`
- [ ] GET routes are read-only; mutations use POST / PATCH / PUT / DELETE appropriately

### 3. Database / Prisma

- [ ] Prisma is imported via the singleton: `import { prisma } from '@/lib/prisma'`
- [ ] Queries use `try/catch` and return proper error responses
- [ ] New models match the existing naming conventions (PascalCase models, camelCase fields)
- [ ] No raw SQL unless absolutely necessary — use Prisma query API
- [ ] Migrations run with `npx prisma migrate dev --name <change>`. After schema edits, **existing Postgres data must be preserved** — prefer column renames (Prisma `@map`) over drop/add when renaming.
- [ ] JSON columns use `Json?` (native Postgres) — no `JSON.stringify()` before `prisma.create`

### 4. TypeScript

- [ ] No `any` types — use proper interfaces or Prisma-generated types
- [ ] Props interfaces defined for React components
- [ ] API responses typed — avoid untyped `fetch` returns
- [ ] Enums/union types for status fields (e.g., `'BUY' | 'SELL' | 'NEUTRAL'`)

### 5. Design & Styling

- [ ] Dark OS color palette used — no hardcoded light colors
  - Backgrounds: `#0a0c10`, `#111318`, `#161a22`
  - Accents: blue `#63B3ED`, green `#68D391`, amber `#F6AD55`, red `#FC8181`, purple `#B794F4`
- [ ] Tailwind utility classes only — no inline `style={{}}` for colors/layout
- [ ] Space Mono for data/mono, Syne for headings — not arbitrary font choices
- [ ] Signal colors: green = BUY, red = SELL, amber = NEUTRAL
- [ ] Status badge colors: green = OK, amber = WARN, red = ERROR, gray = PENDING

### 6. Data Conventions

- [ ] Monetary amounts in **THB (฿)** by default — currency field present where needed
- [ ] Timestamps stored in UTC, displayed in **Asia/Bangkok** timezone
- [ ] Trade direction: `LONG` | `SHORT`
- [ ] Task status: `PENDING` | `APPROVED` | `REJECTED` | `DONE`
- [ ] Kanban status: `BACKLOG` | `IN_PROGRESS` | `REVIEW` | `DONE`
- [ ] Finance type: `INCOME` | `EXPENSE`
- [ ] Memory tags: `TRADE` | `POLICY` | `AI` | `SYS` | `OK` | `WARN` | `ERR`

### 7. Real-time / SSE

- [ ] New real-time data types emitted via `/api/stream` follow the event shape:
  `{ type: string, ...payload }`
- [ ] Client-side subscription uses `EventSource` inside `StreamProvider` — not a new listener
- [ ] No polling loops where SSE events already cover the update
- [ ] New per-pulse work added to `pulse()` is wrapped in `try/catch` — must not crash the stream

### 8. Security & Safety

- [ ] No secrets hardcoded in source — API keys from `.env` only
- [ ] `CAPITAL_API_PASSWORD` (and any broker secret) never logged or returned to the client
- [ ] Policy checks called before any trade or spend action (use `routeAction()` from `src/lib/router.ts`)
- [ ] Live broker calls (Capital.com) wrapped in `try/catch`; return 502 for broker failure, 503 for `BrokerUnavailableError`
- [ ] Auto-trader actions always pass through `routeAction()` — **no direct `placeOrder()` from `autoTrader.tick()` or `triggerManual()`**
- [ ] Manual "↯ Trade now" (`triggerManual()`) bypasses signal + cooldown but still respects policy
- [ ] When closing a Capital position by `dealId`, handle `Capital 404: error.not-found.dealId` — fall back to `getOpenTrades(instrument)` lookup, then to local-only CLOSED state via `CapitalPositionNotFoundError`
- [ ] When storing `brokerDealId` after `placeOrder`, use `confirm.affectedDeals[0].dealId`, NOT the top-level `confirm.dealId` (which 404s on DELETE)
- [ ] `previewTick()` and `/api/autotrader/status` are pure reads — they MUST NOT call `setState`, `recordMemory`, broker, or write to Trade table
- [ ] Human-in-loop tasks created for high-risk actions (size > threshold → queue approval)
- [ ] Memory log entry written for significant agent actions (use `recordMemory()` from `src/lib/memory.ts`)
- [ ] No `dangerouslySetInnerHTML` unless the input is sanitized

### 9. Performance

- [ ] Spot price calls cached via the SSE pulse — no per-page-load external fetch
- [ ] Capital session token cached in `globalThis` for ~9 min (Capital rate-limits POST /session ~5/min); 429 triggers a 60s cooldown
- [ ] Capital market info (`getMarketInfo`) cached in `globalThis` for 5 min per epic
- [ ] Brain panel polls `/api/autotrader/status` at 2s (read-only, fast); config polls `/api/autotrader` at 5s
- [ ] Prisma queries select only needed fields (use `select: {}` for large tables)
- [ ] Price history queries bounded by date range or `take:` — no unbounded `findMany()`
- [ ] `/api/price/history?resolution=MINUTE` serves from local Price table; higher resolutions pass through to Capital live (no local cache)
- [ ] Higher-timeframe candle fetches dedupe by timestamp at the API boundary (`dedupeByTimestamp`) — lightweight-charts asserts strict-ascending unique time
- [ ] Backtest runs isolated to `src/lib/backtest.ts` — not inline in API routes
- [ ] Auto-trader `tick()` short-circuits on `!enabled` and on cooldown before any DB query that's not needed

---

## Output Format

Report findings as:

```
## Code Review — <file or description>

### ✅ Looks Good
- <what's correct>

### ⚠️ Suggestions
- <minor improvements>

### ❌ Issues to Fix
- <bugs, convention violations, security concerns>

### Summary
<1-2 sentence verdict — safe to commit / needs changes>
```

---

## Quick Reference — Key File Paths

| What | Path |
|------|------|
| Prisma client | `src/lib/prisma.ts` |
| Policy engine | `src/lib/policy.ts` |
| Action router (policy + HIL) | `src/lib/router.ts` |
| Memory logger | `src/lib/memory.ts` |
| Gold / spot pricing | `src/lib/goldApi.ts` |
| Indicators (RSI/MACD/EMA) | `src/lib/indicators.ts` |
| Broker facade | `src/lib/broker.ts` |
| Capital.com client (+ getMarketInfo, getCandles) | `src/lib/capital.ts` |
| Auto-trader (tick + triggerManual + previewTick + deriveSignal) | `src/lib/autoTrader.ts` |
| Settings (key/value) | `src/lib/setting.ts` |
| Reusable UI | `src/components/ui/` |
| Shell layout | `src/components/shell/` |
| SSE provider | `src/components/stream/StreamProvider.tsx` |
| Prisma schema | `prisma/schema.prisma` |
| Env config | `.env` |
| Broker docs | `docs/BROKERS.md` |
| Optional integrations | `docs/OPTIONAL_INTEGRATIONS.md` |
| Thai user manual | `src/app/manual/` |
| XAU desk UI (PriceTicker, SignalDashboard, CandlestickChart, AutoTraderPanel + Brain, TradeJournal) | `src/app/xau/_components/` |

---

## After-Job Ritual (mandatory)

After any meaningful change run these **three** steps:

1. `npm run lint` — fix all errors (warnings OK if pre-existing)
2. `npm run build` — fix all type errors (build worker uses stricter TS than dev)
3. **Update `CLAUDE.md` and `SKILL.md`** so the docs stay in sync with reality

Step 3 is not optional. Anything worth knowing about in a future session belongs in one of these files:
- New API route → `CLAUDE.md` API Routes table
- New `src/lib/*.ts` file → `CLAUDE.md` Project Structure + `SKILL.md` Quick Reference
- New Prisma model or column rename → `CLAUDE.md` Prisma Schema list
- New env var → `CLAUDE.md` Environment Variables block
- New rule worth following → `CLAUDE.md` Key Conventions + `SKILL.md` Section 8
- New gotcha / type trap discovered during the build → `CLAUDE.md` "Common type traps" list
