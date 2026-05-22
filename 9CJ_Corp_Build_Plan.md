# 9CJ Corp — Build Plan
## Personal AI Operating System

> **Stack:** Next.js 14 · TypeScript · Tailwind CSS · Prisma · SQLite  
> **No Claude API required** — all modules work locally. API can be plugged in later.

---

## Summary

| Item | Detail |
|------|--------|
| Total Phases | 5 |
| Total Modules | 11 |
| Estimated Time | 2–4 weeks |
| Claude Code Sessions | ~15 sessions |
| Hosting | Local (localhost) or Tauri desktop app |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | SQLite via Prisma ORM |
| Charts | Recharts + Lightweight Charts (TradingView) |
| Indicators | `technicalindicators` npm package |
| Price Data | Gold-API.io (free tier) or metals-api.com |
| Smart Home | Home Assistant local REST API |
| Uptime | UptimeRobot free tier |
| Desktop (optional) | Tauri |

---

## Phase 1 — Project Setup + Dashboard Shell
**Timeline: Day 1–2**

### Goals
Set up the project foundation and build the visual shell of the OS dashboard.

### Tasks
- [ ] Initialize Next.js 14 project with TypeScript + Tailwind CSS (App Router, `src/` directory)
- [ ] Build dark OS-style layout — sticky topbar + 200px fixed sidebar + main content area
- [ ] Create reusable component library: `MetricCard`, `ModuleCard`, `LogEntry`, `StatusBadge`
- [ ] Set up routing for all 11 modules (page-based or tab navigation)
- [ ] Configure local SQLite database with Prisma ORM
- [ ] Define initial Prisma schema: trades, memories, tasks, policies, logs tables

### Setup Commands

```bash
npx create-next-app@latest 9cj-corp --typescript --tailwind --app
cd 9cj-corp
npm install prisma @prisma/client
npm install technicalindicators lightweight-charts recharts
npm install @dnd-kit/core @dnd-kit/sortable
npx prisma init --datasource-provider sqlite
npm run dev
```

### Claude Code Starting Prompt

```
Create a Next.js 14 app with TypeScript and Tailwind called "9CJ Corp — Personal AI Operating System".
Build a dark-themed OS-style dashboard with:
- Sticky topbar: logo on left, 3 status pills on right (AGENTS LIVE, XAU DESK, BACKTEST)
- 200px fixed sidebar with navigation groups: Overview, Trading, Operations, System
- Main content area that renders the active module

Color palette:
- Backgrounds: #0a0c10, #111318, #161a22
- Accents: blue #63B3ED, green #68D391, amber #F6AD55, red #FC8181, purple #B794F4
- Use Space Mono font for data/mono elements, Syne for headings

Sidebar nav items: Dashboard, AI Agents, Quant XAU Desk, Backtest Lab,
Finance/P&L, Smart Home Ops, ProductOps, DevOps, Memory/Audit, Policy Governance, Human-in-Loop
```

---

## Phase 2 — Quant XAU Trading Desk + Backtest Lab
**Timeline: Day 3–7**

### Goals
Build the core trading module with live gold price data, technical indicators, trade logging, and strategy backtesting.

### Tasks
- [ ] Connect to Gold-API.io or metals-api.com for live XAU/USD price (auto-refresh every 30s)
- [ ] Store OHLCV price history in SQLite (`prices` table)
- [ ] Calculate RSI(14), MACD(12,26,9), EMA(50,200) using `technicalindicators` package
- [ ] Build signal dashboard — each indicator shows value + BUY / SELL / NEUTRAL label
- [ ] Integrate Lightweight Charts (free TradingView library) for candlestick chart
- [ ] Build trade journal — manual entry form + auto P&L calculation per trade
- [ ] Create `/api/trades` endpoint (GET + POST) with Prisma
- [ ] Backtest Lab — load historical CSV, run RSI/MACD/EMA strategies, display results
- [ ] Show backtest stats: win rate, Sharpe ratio, max drawdown per strategy

### Key API Routes

```
GET  /api/price          — fetch latest XAU/USD price
GET  /api/price/history  — OHLCV history for charts
GET  /api/trades         — all trade journal entries
POST /api/trades         — create new trade entry
GET  /api/signals        — current RSI, MACD, EMA values + signal labels
POST /api/backtest       — run strategy on historical data
```

### Claude Code Prompt

```
Build a Quant XAU Desk page in the 9CJ Corp dashboard.

1. Fetch live XAU/USD price from Gold-API.io every 30 seconds. Store in SQLite.
2. Calculate RSI(14), MACD(12,26,9), EMA(50/200) from last 200 candles using technicalindicators.
3. Signal dashboard: show each indicator's value + a colored label (BUY=green, SELL=red, NEUTRAL=amber).
4. Candlestick chart using lightweight-charts library.
5. Trade journal table: Time | Direction | Entry | Exit | Size | P&L | Status
6. Manual trade entry form: direction (LONG/SHORT), entry price, size, notes.
7. Store all trades in SQLite via /api/trades.
```

### Free Resources
- **Gold-API.io** — 100 free requests/day, no credit card
- **Lightweight Charts** — free open-source TradingView charting library
- **technicalindicators** — npm package, no API needed, runs locally

---

## Phase 3 — Finance / P&L + Smart Home Ops + DevOps
**Timeline: Day 8–12**

### Goals
Track personal and trading finances, connect smart home devices, and monitor infrastructure uptime.

### Tasks

#### Finance / P&L
- [ ] Income sources table — trading gains, consulting, passive income
- [ ] Expense categories — living, SaaS subscriptions, research/data
- [ ] Budget vs actuals tracker with progress bars
- [ ] Portfolio allocation breakdown (XAU, cash, equities)
- [ ] CSV import for bank/brokerage statements
- [ ] Monthly P&L chart with Recharts

#### Smart Home Ops
- [ ] Connect to Home Assistant local REST API (`http://homeassistant.local:8123/api`)
- [ ] Fetch device states (lights, AC, switches, sensors)
- [ ] Display device grid with toggle controls
- [ ] Energy usage summary (kWh today vs average)
- [ ] Home mode switcher (WORK / HOME / AWAY / SLEEP)

#### DevOps
- [ ] Ping configured service URLs, display uptime status (green/red)
- [ ] Integrate UptimeRobot API for 30-day uptime history
- [ ] Deploy log — manual entry for deployment notes
- [ ] Service health grid with last-checked timestamp

### Claude Code Prompt

```
Build a Finance/P&L page with:
- 4 metric cards: Net Worth, Trading P&L %, Monthly Burn, Savings Rate
- Two-column layout: left = income/expense line items, right = budget utilization + portfolio allocation
- Recharts BarChart showing monthly P&L trend
- CSV import button that parses bank statement and categorizes transactions
- All data stored in SQLite tables: income_entries, expense_entries, portfolio_allocations
```

---

## Phase 4 — AI Orchestration + Memory + Policy Governance
**Timeline: Day 13–18**

### Goals
Build the "brain" of the OS — task routing, persistent memory, rule enforcement, and human approval flow.

### Tasks

#### AI Orchestration
- [ ] Task queue system with priority levels (HIGH / MEDIUM / LOW)
- [ ] Rule-based router — tags on tasks determine which module handles them
- [ ] Background worker system — modules process their queue items
- [ ] Agent activity feed — all module actions write to a shared log

#### Memory / Audit Plane
- [ ] SQLite `memories` table: id, timestamp, agent, tag, message, metadata JSON
- [ ] Memory feed sorted by newest first with tag color-coding
- [ ] Full-text search across all memories
- [ ] Filter by agent, tag, or date range
- [ ] Metric cards: total memories, indexed count, decisions logged, oldest entry

#### Policy Governance
- [ ] SQLite `policies` table: name, description, rule type, threshold, enabled
- [ ] Policy check function — called before any significant action executes
- [ ] Violation log — record any policy breach with full context
- [ ] UI to add/edit/disable policies

#### Human-in-the-Loop
- [ ] Approval queue for actions flagged by policies
- [ ] Each item shows: timestamp, module, action description, estimated value
- [ ] APPROVE / REJECT buttons with confirmation
- [ ] Approved/rejected history with outcome log

#### ProductOps
- [ ] Kanban board with columns: Backlog / In Progress / Review / Done
- [ ] Drag-and-drop cards using `@dnd-kit/core`
- [ ] Card fields: title, description, priority, module tag, due date

### Claude Code Prompt

```
Build a Memory & Audit Plane page.

SQLite table 'memories':
- id (auto), timestamp, agent (string), tag (TRADE/POLICY/AI/SYS/OK),
  message (text), metadata (JSON string)

API routes:
- GET /api/memories?search=&tag=&agent= — filtered list
- POST /api/memories — create entry

UI:
- Top: 4 metric cards (Total Memories, Indexed %, Decisions Logged, Oldest Entry)
- Search bar + tag filter pills
- Live feed of memory entries sorted newest first
- Each entry: timestamp | colored tag badge | agent name | message text
```

---

## Phase 5 — Polish + Real-time Updates + Local Hosting
**Timeline: Day 19–28**

### Goals
Wire everything together with live updates, a daily briefing, and package the app for everyday use.

### Tasks
- [ ] Shared activity log — all modules write timestamped entries to one feed on the Dashboard
- [ ] Server-Sent Events (SSE) for real-time updates — price ticker, log feed, metric cards
- [ ] Daily briefing page — auto-generated summary pulling data from all modules each morning
- [ ] Notification system — in-app alerts for policy violations, trade signals, approval requests
- [ ] Settings page — configure API keys, module preferences, policy thresholds
- [ ] Dark/light mode toggle
- [ ] Package as local desktop app with Tauri (optional) or run as `localhost:3000`
- [ ] [Optional] Plug in Claude API — AI chat panel that can query your data and explain signals

### Real-time Setup (SSE — no WebSocket needed)

```typescript
// app/api/stream/route.ts
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        const data = `data: ${JSON.stringify({ type: 'tick', time: Date.now() })}\n\n`
        controller.enqueue(new TextEncoder().encode(data))
      }, 5000)
      return () => clearInterval(interval)
    }
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  })
}
```

### Claude Code Prompt

```
Add real-time updates to the 9CJ Corp dashboard using Server-Sent Events (SSE).

1. Create /api/stream route that emits events every 5 seconds
2. Events: { type: 'price', value: number } | { type: 'log', entry: LogEntry } | { type: 'signal', signals: SignalData }
3. Dashboard subscribes to the stream with EventSource
4. Price ticker, agent log feed, and signal badges auto-update without page refresh

Also build a Daily Briefing page that runs at 08:00 and pulls:
- XAU price + today's signals
- Finance: yesterday's P&L + budget status
- Task queue: top 3 priorities
- Human-in-loop: pending approvals count
Display as a clean morning summary card.
```

---

## All 11 Modules — Quick Reference

| Module | Implementation Approach | Effort |
|--------|------------------------|--------|
| AI Orchestration | Priority task queue + rule-based router | Medium |
| Multi-Agent Team | Module workers with background jobs / cron | Medium |
| Quant XAU Desk | Gold-API.io + technicalindicators npm | Hard |
| Backtest Lab | Historical CSV + local strategy runner | Hard |
| Policy Governance | SQLite rule table + pre-action check function | Easy |
| Finance / P&L | Manual entry + CSV import + Recharts | Easy |
| Smart Home Ops | Home Assistant local REST API | Medium |
| ProductOps | Kanban board with @dnd-kit/core drag-drop | Easy |
| DevOps | URL health pings + UptimeRobot API | Easy |
| Memory / Audit | SQLite log table + full-text search | Easy |
| Human-in-Loop | Approval queue UI with APPROVE/REJECT actions | Easy |

---

## Prisma Schema (SQLite)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./9cj.db"
}

model Trade {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  direction String   // LONG | SHORT
  entry     Float
  exit      Float?
  size      Float
  pnl       Float?
  status    String   @default("OPEN") // OPEN | CLOSED
  notes     String?
}

model Memory {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  agent     String
  tag       String   // TRADE | POLICY | AI | SYS | OK
  message   String
  metadata  String?  // JSON string
}

model Policy {
  id          Int      @id @default(autoincrement())
  name        String
  description String
  ruleType    String   // MAX_TRADE_SIZE | DAILY_LOSS | SPEND_LIMIT | etc
  threshold   Float
  enabled     Boolean  @default(true)
  violations  Int      @default(0)
}

model Task {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  title     String
  module    String
  priority  String   @default("MEDIUM") // HIGH | MEDIUM | LOW
  status    String   @default("PENDING") // PENDING | APPROVED | REJECTED | DONE
  metadata  String?
}

model Price {
  id        Int      @id @default(autoincrement())
  timestamp DateTime @default(now())
  open      Float
  high      Float
  low       Float
  close     Float
  volume    Float?
}

model FinanceEntry {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  type      String   // INCOME | EXPENSE
  category  String
  amount    Float
  currency  String   @default("THB")
  notes     String?
}
```

---

## Recommended Claude Code Session Order

| Session | Focus |
|---------|-------|
| 1 | Project init + layout shell + sidebar |
| 2 | Reusable components (MetricCard, ModuleCard, LogEntry) |
| 3 | Prisma schema + API route structure |
| 4 | Gold price API + price history storage |
| 5 | Technical indicators + signal dashboard |
| 6 | Candlestick chart + trade journal |
| 7 | Backtest Lab — strategy runner |
| 8 | Finance / P&L module |
| 9 | Smart Home Ops (Home Assistant) |
| 10 | DevOps uptime monitor |
| 11 | Memory / Audit Plane |
| 12 | Policy Governance + rule engine |
| 13 | Human-in-Loop approval queue + ProductOps Kanban |
| 14 | SSE real-time updates + daily briefing |
| 15 | Polish, settings page, Tauri packaging (optional) |

---

## Notes

- **No Claude API needed** — the entire system works with local data, free APIs, and rule-based logic.
- **When you get Claude API** — add it in Session 15 as a chat panel that reads your SQLite data and explains signals. The architecture supports it cleanly without refactoring.
- **Free API limits** — Gold-API.io gives 100 req/day free. Cache prices in SQLite to avoid hitting limits.
- **Bangkok timezone** — set `TZ=Asia/Bangkok` in your `.env` for correct timestamps.
- **Currency** — all finance amounts default to THB (฿). Configurable in settings.

---

*Generated for 9CJ Corp Personal AI Operating System*  
*Use with Claude Code — paste each phase prompt at the start of a new session*
