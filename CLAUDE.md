# 9CJ Corp — Personal AI Operating System

## Project Overview

A local-first Personal AI Operating System built as a dark OS-style web dashboard. Runs on `localhost:3000`. No cloud dependency — all data stored in local SQLite via Prisma.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, `src/` directory) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | SQLite via Prisma ORM |
| Charts | Recharts + Lightweight Charts (TradingView) |
| Indicators | `technicalindicators` npm package |
| Price Data | Gold-API.io (free tier) |
| Smart Home | Home Assistant local REST API |
| Drag-Drop | @dnd-kit/core + @dnd-kit/sortable |

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
npx prisma studio # Open Prisma DB browser
npx prisma db push # Sync schema to SQLite
npx prisma generate # Regenerate Prisma client
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Dashboard (root)
│   ├── layout.tsx                        # Root layout with shell
│   ├── agents/                           # AI Orchestration module
│   ├── approvals/                        # Human-in-Loop module
│   ├── backtest/                         # Backtest Lab module
│   ├── briefing/                         # Daily Briefing page
│   ├── devops/                           # DevOps uptime monitor
│   ├── finance/                          # Finance / P&L module
│   ├── home-ops/                         # Smart Home Ops module
│   ├── memory/                           # Memory / Audit Plane
│   ├── policy/                           # Policy Governance module
│   ├── product-ops/                      # ProductOps Kanban board
│   ├── settings/                         # Settings page
│   ├── xau/                              # Quant XAU Trading Desk
│   └── api/                              # API routes (see below)
├── components/
│   ├── shell/                            # Layout: Topbar, Sidebar, LiveStatusPills
│   ├── stream/                           # SSE: StreamProvider, ToastContainer
│   └── ui/                              # Shared: MetricCard, ModuleCard, LogEntry, StatusBadge
└── lib/
    ├── prisma.ts                         # Prisma client singleton
    ├── goldApi.ts                        # Gold-API.io integration
    ├── indicators.ts                     # RSI, MACD, EMA calculations
    ├── backtest.ts                       # Strategy runner
    ├── finance.ts                        # Finance helpers
    ├── homeAssistant.ts                  # Home Assistant REST API
    ├── memory.ts                         # Memory log helpers
    ├── pinger.ts                         # Service health checker
    ├── policy.ts                         # Policy rule engine
    ├── router.ts                         # AI task router
    ├── seed.ts                           # DB seed helpers
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
| `/api/trades` | GET, POST | Trade journal |
| `/api/backtest` | GET, POST | Backtest runner |
| `/api/finance/entries` | GET, POST | Income/expense entries |
| `/api/finance/summary` | GET | Finance summary |
| `/api/finance/budgets` | GET, POST | Budget management |
| `/api/finance/holdings` | GET, POST | Portfolio holdings |
| `/api/finance/import` | POST | CSV import |
| `/api/home/devices` | GET, POST | Smart home devices |
| `/api/home/device/[id]/toggle` | POST | Toggle device |
| `/api/home/mode` | GET, POST | Home mode |
| `/api/devops/services` | GET, POST | Monitored services |
| `/api/devops/services/[id]` | PATCH, DELETE | Service management |
| `/api/devops/deploys` | GET, POST | Deploy log |
| `/api/devops/check-all` | POST | Run all health checks |
| `/api/kanban` | GET, POST | Kanban cards |
| `/api/kanban/[id]` | PATCH, DELETE | Card management |
| `/api/kanban/reorder` | POST | Drag-drop reorder |
| `/api/memories` | GET, POST | Memory log entries |
| `/api/policies` | GET, POST | Policy rules |
| `/api/policies/[id]` | PATCH, DELETE | Policy management |
| `/api/violations` | GET | Policy violations |
| `/api/tasks` | GET, POST | Human-in-loop tasks |
| `/api/tasks/[id]` | PATCH | Approve/reject task |
| `/api/settings` | GET, POST | App settings |
| `/api/stream` | GET | SSE real-time stream |
| `/api/briefing` | GET | Daily briefing |

## Prisma Schema (SQLite)

Models: `Trade`, `Memory`, `Policy`, `Task`, `Price`, `FinanceEntry`, `Budget`, `PortfolioHolding`, `Service`, `ServiceCheck`, `DeployLog`, `Setting`, `KanbanCard`, `Violation`

Database file: `prisma/9cj.db` (set via `DATABASE_URL` in `.env`)

## Design System

### Color Palette (Dark OS Theme)

```
Backgrounds:  #0a0c10  #111318  #161a22
Accents:
  Blue:   #63B3ED  (primary actions, XAU desk)
  Green:  #68D391  (positive / BUY signals)
  Amber:  #F6AD55  (warnings / NEUTRAL)
  Red:    #FC8181  (danger / SELL signals / violations)
  Purple: #B794F4  (AI / agents)
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

- **Topbar** — sticky, logo left, 3 status pills right: `AGENTS LIVE`, `XAU DESK`, `BACKTEST`
- **Sidebar** — 200px fixed, grouped nav: Overview / Trading / Operations / System
- **Main** — scrollable content area rendering active module

## Real-time (SSE)

`StreamProvider` wraps the app and listens to `/api/stream`. Events emitted:

```typescript
{ type: 'price', value: number }
{ type: 'log', entry: LogEntry }
{ type: 'signal', signals: SignalData }
```

## Environment Variables

```env
DATABASE_URL="file:./prisma/9cj.db"
GOLD_API_KEY=...          # Gold-API.io key
HOME_ASSISTANT_URL=...    # Local HA instance
HOME_ASSISTANT_TOKEN=...  # HA long-lived token
TZ=Asia/Bangkok           # Bangkok timezone
```

## Key Conventions

- All monetary amounts default to **THB (฿)**
- Timestamps use **Asia/Bangkok** timezone
- Use `Prisma` singleton from `src/lib/prisma.ts` — never import `PrismaClient` directly
- API routes return `NextResponse.json(data)` — always handle errors with `{ error: message }`
- Client components must start with `"use client"` — keep page.tsx files as server components
- Signal values: `BUY` | `SELL` | `NEUTRAL`
- Trade direction: `LONG` | `SHORT`
- Task status: `PENDING` | `APPROVED` | `REJECTED` | `DONE`
- Finance type: `INCOME` | `EXPENSE`
- Kanban status: `BACKLOG` | `IN_PROGRESS` | `REVIEW` | `DONE`

## 11 Modules Summary

| Module | Route | Status |
|--------|-------|--------|
| Dashboard | `/` | Live |
| AI Agents | `/agents` | Live |
| Quant XAU Desk | `/xau` | Live |
| Backtest Lab | `/backtest` | Live |
| Finance / P&L | `/finance` | Live |
| Smart Home Ops | `/home-ops` | Live |
| ProductOps Kanban | `/product-ops` | Live |
| DevOps Uptime | `/devops` | Live |
| Memory / Audit | `/memory` | Live |
| Policy Governance | `/policy` | Live |
| Human-in-Loop | `/approvals` | Live |
| Settings | `/settings` | Live |
| Daily Briefing | `/briefing` | Live |
