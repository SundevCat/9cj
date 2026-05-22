# Optional integrations

These are documented but not wired in. The app runs as-is on `localhost:3000`
and exercises every Phase 1–5 module without them.

---

## 1. Tauri desktop packaging

Tauri wraps the Next.js app into a native window (Win/Mac/Linux) with a Rust
shell. The build stays the same — only the launcher changes.

### Install

```bash
npm install --save-dev @tauri-apps/cli
npx tauri init
```

Answer the prompts with:

| Prompt                              | Answer                              |
|-------------------------------------|-------------------------------------|
| App name                            | `9CJ Corp`                          |
| Window title                        | `9CJ Corp — Personal AI OS`         |
| Web assets location                 | `out` (after `next build && next export`) |
| Dev server URL                      | `http://localhost:3000`             |

### Add to `package.json` scripts

```json
"scripts": {
  "tauri:dev":   "tauri dev",
  "tauri:build": "next build && next export && tauri build"
}
```

> Note: with App Router + SSE + SQLite the cleanest packaging path is actually
> to ship Next.js in standalone mode (`output: "standalone"` in `next.config.mjs`)
> and have Tauri launch the Node server as a sidecar. Pure static export drops
> the API routes.

---

## 2. Claude API chat panel

The shell at [`src/lib/`](../src/lib) already gives Claude everything it needs
to reason about your data: indicators, finance summary, memory feed, policy
hits. To add a chat panel:

### Install

```bash
npm install @anthropic-ai/sdk
```

Persist the key via the Settings page (it lands in the `Setting` table under
`claude.api_key`).

### Minimal client (server-only)

```typescript
// src/lib/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";

async function getKey() {
  const row = await prisma.setting.findUnique({ where: { key: "claude.api_key" } });
  return row?.value || process.env.ANTHROPIC_API_KEY || "";
}

export async function ask(prompt: string, context: string) {
  const key = await getKey();
  if (!key) throw new Error("No Claude API key configured");
  const client = new Anthropic({ apiKey: key });
  const res = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: "You are 9CJ's personal ops assistant. Reference the supplied context. Be terse.",
    messages: [{ role: "user", content: `${context}\n\nQuestion: ${prompt}` }],
  });
  return res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");
}
```

### Tool to feed Claude live context

Build a `/api/chat` route that:
1. Reads the user prompt
2. Pulls latest signals + finance summary + pending tasks
3. Stuffs them into the `context` string
4. Calls `ask()` and streams the response back

### Why we kept it out of the default build

A few reasons worth knowing:
- It introduces a network dependency that breaks the "fully local" guarantee
- An exposed key in dev would be a footgun; rate-limit + access-control belong
  with the user
- The plan explicitly marked it optional / Session 15

---

## 3. UptimeRobot integration

[`src/lib/pinger.ts`](../src/lib/pinger.ts) handles HTTP pings locally and
stores results in `ServiceCheck`. To pull UptimeRobot's 30-day history:

```typescript
// src/lib/uptimeRobot.ts
const API = "https://api.uptimerobot.com/v2/getMonitors";

export async function fetchUptime(apiKey: string) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `api_key=${apiKey}&format=json&logs=1&logs_limit=720`, // 30 days @ 1h
  });
  return res.json();
}
```

Then map each monitor's logs into `ServiceCheck` rows on a cron tick (Phase 5
SSE pulse is a fine home for this — it already runs every 5s).
