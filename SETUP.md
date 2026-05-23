# 9CJ Corp — Setup Guide (PostgreSQL + OANDA Live Trading)

## Prerequisites
- Node.js 18+
- Docker Desktop (running)
- OANDA practice account (free)

---

## Step 1 — Start PostgreSQL with Docker

```bash
# From the project root:
docker compose up -d

# Verify it's running:
docker ps
# You should see: 9cj-postgres (healthy) and 9cj-pgadmin
```

**pgAdmin** is available at http://localhost:5050  
Login: `admin@9cj.local` / `admin`  
Add server: host `postgres`, port `5432`, user `9cj`, password `9cj_secret`, db `9cj_db`

---

## Step 2 — Configure Environment

Edit `.env` and fill in your real keys:

```env
DATABASE_URL="postgresql://9cj:9cj_secret@localhost:5432/9cj_db"

GOLD_API_KEY=your_gold_api_key        # https://gold-api.io
OANDA_API_KEY=your_oanda_api_key      # see Step 3
OANDA_ACCOUNT_ID=your_account_id     # see Step 3
OANDA_ENV=practice                    # keep as "practice" until ready for live
```

---

## Step 3 — Get OANDA Practice API Key (Free)

1. Go to https://www.oanda.com/register/#/sign-up/demo
2. Create a free **Demo** account
3. Log in → top-right menu → **My Account**
4. Click **Manage API Access** → Generate a Personal Access Token
5. Copy the token into `.env` as `OANDA_API_KEY`
6. Your account ID is shown on the account dashboard (format: `123-456-7890123-001`)
7. Copy it into `.env` as `OANDA_ACCOUNT_ID`

---

## Step 4 — Push Database Schema

```bash
# Generate Prisma client for PostgreSQL
npx prisma generate

# Push schema to the running Postgres container
npx prisma db push

# (Optional) Open Prisma Studio to browse the DB
npx prisma studio
```

---

## Step 5 — Start the App

```bash
npm run dev
# Open http://localhost:3000
```

---

## Step 6 — Test Live Trading

1. Open **Quant XAU Desk** → `/xau`
2. The **OANDA Practice Account** panel at the top shows your balance
3. In the **New Trade** form, click **○ Journal** to toggle to **● Live**
4. An amber warning confirms you are in live mode
5. Set direction (LONG/SHORT), size in oz, optional SL/TP
6. Click **▶ Execute Live Order**
7. The order fills at market price — you'll see it appear in the journal with a purple ● dot
8. Click **Close** next to any open live trade to close it via OANDA

---

## Architecture Summary

```
Browser → Next.js API routes → OANDA REST API (practice)
                            → PostgreSQL (Docker)

Key files:
  src/lib/oanda.ts              — OANDA API client
  src/app/api/oanda/account/    — GET account snapshot
  src/app/api/oanda/orders/     — GET open trades, POST new order
  src/app/api/oanda/trades/close/ — POST close a trade
  src/app/api/trades/           — journal + live trade entry point
  prisma/schema.prisma          — PostgreSQL schema
  docker-compose.yml            — Postgres + pgAdmin containers
```

---

## Going Live (Real Money)

When ready to trade with real funds:

1. Open a **live** OANDA account at https://www.oanda.com
2. Get a live API token (same process as demo)
3. Update `.env`:
   ```env
   OANDA_ENV=live
   OANDA_API_KEY=your_live_api_key
   OANDA_ACCOUNT_ID=your_live_account_id
   ```
4. Restart `npm run dev`
5. ⚠️ **Make sure your Policy rules are set** — go to `/policy` and configure `MAX_TRADE_SIZE` and `DAILY_LOSS` limits before placing any live orders

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `OANDA API not configured` | Check `OANDA_API_KEY` and `OANDA_ACCOUNT_ID` in `.env` and restart dev server |
| `502 OANDA 401` | API key is wrong or expired — regenerate from OANDA My Account |
| `DATABASE_URL` connection error | Make sure Docker is running: `docker compose up -d` |
| Prisma type errors after schema change | Run `npx prisma generate` then restart dev server |
| pgAdmin can't connect | Use hostname `postgres` (not `localhost`) inside pgAdmin server settings |
