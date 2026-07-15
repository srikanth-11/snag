---
title: Snag
emoji: 🪝
colorFrom: purple
colorTo: red
sdk: docker
app_port: 7860
pinned: false
---

# Snag

**Find the snags before your users do.** Paste a URL — Snag turns loose an AI
agent that explores your live web app in a real browser like a hostile QA
engineer, catches real bugs (console errors, 5xx, broken flows, silent
failures), streams its reasoning live, and hands back a report you can ship.

## Stack (all free tier)

| Layer | Choice |
|---|---|
| App + agent | Next.js 16 (App Router) + in-process Playwright worker, one Docker container |
| Compute | Hugging Face Spaces (Docker) |
| State | Supabase — Auth + Postgres (RLS) + Storage |
| Vision LLM | Gemini 3 Flash → Flash-Lite → NVIDIA NIM → Groq (rotate on 429) |

## Local dev

```bash
cp .env.example .env.local      # fill in Supabase + GEMINI_API_KEY
npm install
npm run dev                     # http://localhost:3000
```

Run the Supabase migration in `supabase/migrations/0001_init.sql` (SQL editor),
which also creates the public `shots` storage bucket.

## Deploy

Push this repo to a Hugging Face **Docker** Space. Add the keys from
`.env.example` as Space **Secrets**. The container listens on `7860`.

## Security notes

- SSRF guard on the hunt endpoint rejects localhost/private-range targets.
- Row-level security scopes every row to its owner; server writes use the
  service-role key.
- The vision model sees screenshots — run Snag against apps whose content you
  are comfortable sending to a third-party model. Don't point it at pages
  behind your own auth with real secrets.
