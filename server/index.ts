import { existsSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { isBannerId, isIconId } from "./catalog.ts";
import { createSite, subscribe } from "./generate.ts";
import { activeModelLabel } from "./llm.ts";
import { ROOT, SITES_DIR, getSite, listSites } from "./store.ts";

const PORT = Number(process.env.PORT ?? 8787);
const isProd = process.env.NODE_ENV === "production";
const webDist = join(ROOT, "web", "dist");

const app = new Hono();

app.use("/api/*", cors());

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    model: activeModelLabel(),
    time: new Date().toISOString(),
  }),
);

app.get("/api/sites", async (c) => {
  const sites = await listSites();
  return c.json({ sites });
});

app.get("/api/sites/:id", async (c) => {
  const site = await getSite(c.req.param("id"));
  if (!site) return c.json({ error: "Not found" }, 404);
  return c.json({ site });
});

app.get("/api/sites/:id/events", async (c) => {
  const id = c.req.param("id");
  const site = await getSite(id);
  if (!site) return c.json({ error: "Not found" }, 404);

  return streamSSE(c, async (stream) => {
    let closed = false;
    c.req.raw.signal.addEventListener("abort", () => {
      closed = true;
    });

    await stream.writeSSE({
      event: "site",
      data: JSON.stringify(site),
    });

    const unsub = subscribe(site.id, async (next) => {
      if (closed) return;
      await stream.writeSSE({
        event: "site",
        data: JSON.stringify(next),
      });
      if (next.status === "ready" || next.status === "error") {
        closed = true;
        await stream.writeSSE({ event: "done", data: "{}" });
      }
    });

    while (!closed) {
      await stream.sleep(1000);
      const latest = await getSite(site.id);
      if (!latest) break;
      if (latest.status === "ready" || latest.status === "error") {
        await stream.writeSSE({
          event: "site",
          data: JSON.stringify(latest),
        });
        await stream.writeSSE({ event: "done", data: "{}" });
        break;
      }
    }
    unsub();
  });
});

app.post("/api/sites", async (c) => {
  const form = await c.req.formData();
  const companyName = String(form.get("companyName") ?? "").trim();
  const brandColor = String(form.get("brandColor") ?? "").trim();
  const topicsRaw = String(form.get("topics") ?? "").trim();

  if (!companyName) return c.json({ error: "Company name is required" }, 400);
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(brandColor)) {
    return c.json({ error: "Brand colour must be a hex value like #1A73E8" }, 400);
  }

  let topics: string[] = [];
  try {
    const parsed = JSON.parse(topicsRaw);
    if (Array.isArray(parsed)) {
      topics = parsed.map((t) => String(t).trim()).filter(Boolean);
    }
  } catch {
    topics = topicsRaw
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  if (topics.length < 1 || topics.length > 10) {
    return c.json({ error: "Provide between 1 and 10 topics" }, 400);
  }

  const iconId = String(form.get("iconId") ?? "").trim();
  const bannerId = String(form.get("bannerId") ?? "").trim();
  if (!isIconId(iconId)) {
    return c.json({ error: "Choose a glass site icon" }, 400);
  }
  if (!isBannerId(bannerId)) {
    return c.json({ error: "Choose a banner" }, 400);
  }

  const logo = form.get("logo");
  let logoBytes: Uint8Array | undefined;
  let logoExt: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 4 * 1024 * 1024) {
      return c.json({ error: "Logo must be under 4MB" }, 400);
    }
    const name = logo.name.toLowerCase();
    logoExt = name.endsWith(".png")
      ? "png"
      : name.endsWith(".webp")
        ? "webp"
        : name.endsWith(".gif")
          ? "gif"
          : name.endsWith(".svg")
            ? "svg"
            : "jpg";
    logoBytes = new Uint8Array(await logo.arrayBuffer());
  }

  const mimoKey = String(form.get("mimoKey") ?? "").trim();

  const site = await createSite({
    companyName,
    brandColor: brandColor.length === 4
      ? `#${brandColor[1]}${brandColor[1]}${brandColor[2]}${brandColor[2]}${brandColor[3]}${brandColor[3]}`
      : brandColor.toUpperCase(),
    topics: topics.slice(0, 10),
    logoBytes,
    logoExt,
    iconId,
    bannerId,
    mimoKey: mimoKey || undefined,
  });

  return c.json({ site }, 201);
});

// Hosted generated sites
app.get("/s/:slug", (c) => c.redirect(`/s/${c.req.param("slug")}/`, 302));
app.get("/s/:slug/", async (c) => {
  const file = Bun.file(join(SITES_DIR, c.req.param("slug"), "index.html"));
  if (!(await file.exists())) return c.notFound();
  return new Response(file, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
app.get("/s/:slug/*", async (c) => {
  const slug = c.req.param("slug");
  const rest = c.req.path.replace(`/s/${slug}/`, "");
  const filePath = join(SITES_DIR, slug, rest);
  if (!filePath.startsWith(join(SITES_DIR, slug))) return c.notFound();
  const file = Bun.file(filePath);
  if (!(await file.exists())) return c.notFound();
  return new Response(file);
});

async function serveWeb(path: string) {
  if (!isProd || !existsSync(webDist)) return null;
  const clean = path === "/" ? "/index.html" : path;
  const filePath = join(webDist, clean);
  const file = Bun.file(filePath);
  if (await file.exists()) return file;
  const fallback = Bun.file(join(webDist, "index.html"));
  if (await fallback.exists()) return fallback;
  return null;
}

app.get("*", async (c) => {
  if (c.req.path.startsWith("/api") || c.req.path.startsWith("/s/")) {
    return c.notFound();
  }

  if (isProd) {
    const file = await serveWeb(c.req.path);
    if (file) return new Response(file);
  }

  // Dev: Vite proxies API; this process is API-only unless production.
  return c.html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>FlocCare API</title>
  <style>
    body { font-family: Figtree, system-ui, sans-serif; background:#0b0b0d; color:#f4f4f5; padding:48px; }
    a { color:#4fc1f5; }
    code { background:#1a1a1f; padding:2px 6px; border-radius:6px; }
  </style>
</head>
<body>
  <h1>FlocCare API · :${PORT}</h1>
  <p>In development, open the Vite portal at <a href="http://localhost:5173">http://localhost:5173</a>.</p>
  <p>Active model: <code>${activeModelLabel()}</code></p>
</body>
</html>`);
});

console.log(`FlocCare listening on http://localhost:${PORT}`);
console.log(`LLM: ${activeModelLabel()}`);
Bun.serve({
  port: PORT,
  fetch: app.fetch,
});
