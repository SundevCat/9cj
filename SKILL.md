# 9CJ Corp — Code Review Skill

## Purpose

Review new or modified code in the **9CJ Corp Personal AI Operating System** project against its established conventions. This skill checks correctness, consistency, security, and maintainability — specifically for this Next.js 14 / Prisma / SQLite / Tailwind stack.

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
- [ ] Errors return `{ error: string }` with an appropriate HTTP status code (400, 404, 500)
- [ ] No direct `PrismaClient` instantiation — always import from `src/lib/prisma.ts`
- [ ] GET routes are read-only; mutations use POST / PATCH / DELETE appropriately

### 3. Database / Prisma

- [ ] Prisma is imported via the singleton: `import prisma from '@/lib/prisma'`
- [ ] Queries use `try/catch` and return proper error responses
- [ ] New models match the existing naming conventions (PascalCase models, camelCase fields)
- [ ] No raw SQL unless absolutely necessary — use Prisma query API
- [ ] Migrations / schema changes run with `npx prisma db push`

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
- [ ] Memory tags: `TRADE` | `POLICY` | `AI` | `SYS` | `OK`

### 7. Real-time / SSE

- [ ] New real-time data types emitted via `/api/stream` follow the event shape:
  `{ type: string, ...payload }`
- [ ] Client-side subscription uses `EventSource` inside `StreamProvider` — not a new listener
- [ ] No polling loops where SSE events already cover the update

### 8. Security & Safety

- [ ] No secrets hardcoded in source — API keys from `.env` only
- [ ] Policy checks called before any trade or spend action (use `src/lib/policy.ts`)
- [ ] Human-in-loop tasks created for high-risk actions (size > threshold → queue approval)
- [ ] Memory log entry written for significant agent actions (use `src/lib/memory.ts`)
- [ ] No `dangerouslySetInnerHTML` unless the input is sanitized

### 9. Performance

- [ ] Gold API calls cached in SQLite — no duplicate external requests per page load
- [ ] Prisma queries select only needed fields (use `select: {}` for large tables)
- [ ] Price history queries bounded by date range — no unbounded `findMany()`
- [ ] Backtest runs are isolated to `src/lib/backtest.ts` — not inline in API routes

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
| Memory logger | `src/lib/memory.ts` |
| Gold API | `src/lib/goldApi.ts` |
| Indicators | `src/lib/indicators.ts` |
| Reusable UI | `src/components/ui/` |
| Shell layout | `src/components/shell/` |
| SSE stream | `src/components/stream/StreamProvider.tsx` |
| Prisma schema | `prisma/schema.prisma` |
| Env config | `.env` |
