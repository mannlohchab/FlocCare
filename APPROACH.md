# Approach & writing model

## Product shape

The assignment asks for a **reusable portal**, not a one-off static export. **atelier.** treats each submission as a first-class **site**:

- Identity: company name, logo file, brand hex
- Content brief: 1–10 topics
- Output: hosted index + one HTML page per topic, all sharing the same layout tokens (logo, brand colour, typography)

Multiple use-cases are just multiple sites in `data/sites/`, listed on `/sites`.

## Architecture

```
React portal (Vite) ──POST /api/sites──► Hono (Bun)
                                           │
                                           ├─ persist logo + meta
                                           ├─ LLM write Markdown (~1000 words / topic)
                                           ├─ render branded HTML (marked)
                                           └─ host at /s/<slug>/…
```

Generation runs with bounded concurrency (default 3) so ten long posts finish without hammering the free endpoint. The detail page listens on `GET /api/sites/:id/events` (SSE) and also polls as a safety net.

## Visual approach

- **Portal chrome** follows klasc.space: dark field, Sora for display, Figtree for UI, cool accent (`#4FC1F5`), soft motion.
- **Blueprint rails** echo mann.expert’s structured page frame.
- **Generated journals** flip to a light paper surface so long reading is comfortable, while still keyed to the user’s brand colour (header pill, accents, soft gradients, sticky topic nav).

## Writing model

Priority order in `server/llm.ts`:

1. **Groq** (`llama-3.3-70b-versatile` by default) — if `GROQ_API_KEY` is set  
2. **Google Gemini** (`gemini-2.0-flash` by default) — if `GEMINI_API_KEY` is set  
3. **Pollinations text API** (`openai` model alias) — **default**, free, no API key  
4. **Local compositional writer** — fallback when the free endpoint rate-limits (1 req / 30s) or errors

The prompt asks for Markdown with an H1, 4–6 H2 sections, and ~1000 words. Keyed providers may run a second “expand” pass under ~850 words. Pollinations calls are serialized with a ~32s gap to respect the free tier; failures fall through to the local writer so all 10 pages still ship. Markdown is converted to HTML with `marked` and injected into the shared layout template.

For a fully offline/fast demo: `FORCE_LOCAL_WRITER=1`. For higher quality: set a free Groq or Gemini key in `.env`.

## Why this model choice

- Assignment explicitly allows a **free LLM**
- Pollinations needs zero signup for a working demo
- Groq / Gemini remain first-class when a free-tier key is available
- Local fallback keeps multi-topic hosting reliable under rate limits
- One interface (`writeBlogPost`) keeps the portal UX identical regardless of provider
