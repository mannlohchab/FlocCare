# atelier. — Webpage Generator

A brand journal portal: enter a company name, logo, brand hex, and up to **10 topics**. The platform writes a ~**1000-word** Markdown post per topic with a free LLM, wraps every page in a consistent branded layout, and **hosts** the full site. Create as many sites as you want.

Design language follows [mann.expert](https://mann.expert) (blueprint rails, restrained chrome) and [klasc.space](https://klasc.space) (dark product UI, Sora + Figtree).

## Stack

| Layer | Choice |
| --- | --- |
| Runtime | Bun |
| API | Hono |
| Portal | React 19 + Vite + TypeScript |
| Writer | Pollinations (default, free) · optional Groq / Gemini · local fallback |
| Storage | Local filesystem under `data/sites/` |

## Quick start

```bash
bun install
cd web && bun install && cd ..
cp .env.example .env   # optional API keys
bun run dev
```

- Portal: http://localhost:5173  
- API: http://localhost:8787  
- Hosted journals: http://localhost:5173/s/<slug>/  

Or run processes separately: `bun run dev:api` and `bun run dev:web`.

Production-style single process:

```bash
bun run build
bun run start
# open http://localhost:8787
```

### Writer modes

| Mode | How |
| --- | --- |
| Pollinations (default) | no env needed; serialized ~1 req / 32s; falls back locally on rate limit |
| Groq | `GROQ_API_KEY=...` in `.env` |
| Gemini | `GEMINI_API_KEY=...` in `.env` |
| Fast offline demo | `FORCE_LOCAL_WRITER=1 bun run dev:api` |

## How it works

1. Submit company + logo + brand colour + topics (1–10).
2. Server creates `/s/<slug>/`, stores the logo, queues generation.
3. Each topic becomes ~1000 words of Markdown, then branded HTML.
4. Progress streams over SSE; when ready, index + posts are live.
5. Repeat for other brands — every run is an independent hosted site (`/sites`).

## Approach & model

See [APPROACH.md](./APPROACH.md).

## Screen recording (deliverable)

Suggested walkthrough (OBS / Loom, ~2–3 min):

1. Open http://localhost:5173 — show the atelier. create form.
2. Enter a company, pick a hex, upload a logo, keep 10 topics → **Generate & host pages**.
3. On the progress screen, show pages flipping to `ready` with word counts.
4. **Open hosted site** — show index with brand colour + logo.
5. Open 2–3 posts — consistent layout, long-form content, topic nav.
6. Back to **Sites** — create a second brand briefly to show multi-use.

## Project layout

```
server/     Hono API, LLM writer, HTML templates, site store
web/        React portal (Vite)
data/sites/ Generated + hosted journals
APPROACH.md Writing pipeline + model notes
```
