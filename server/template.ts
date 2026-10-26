import { marked } from "marked";
import type { SiteProfile } from "./types.ts";

function contrastText(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = Number.parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#0b0b0d" : "#ffffff";
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Turns **phrase** into an underline after the text has been escaped. */
function renderEmphasis(value: string): string {
  return escapeHtml(value).replace(
    /\*\*(.+?)\*\*/g,
    "<em>$1</em>",
  );
}

const FOLDER = `<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M3.2 6.4c0-.9.7-1.6 1.6-1.6h2.7l1.3 1.4h6.4c.9 0 1.6.7 1.6 1.6v6.4c0 .9-.7 1.6-1.6 1.6H4.8c-.9 0-1.6-.7-1.6-1.6V6.4Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
const CHEVRON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PIN = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 14s4.2-3.8 4.2-6.8A4.2 4.2 0 0 0 8 3a4.2 4.2 0 0 0-4.2 4.2C3.8 10.2 8 14 8 14Z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="7.1" r="1.15" fill="currentColor"/></svg>`;

function shellCss(brandColor: string): string {
  const onBrand = contrastText(brandColor);
  return `
    :root { --brand: ${brandColor}; --on: ${onBrand}; }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: Figtree, ui-sans-serif, system-ui, sans-serif;
      color: #161616;
      background-color: #f3f3f1;
      background-image: radial-gradient(rgba(20, 20, 20, 0.18) 0.65px, transparent 0.7px);
      background-size: 12px 12px;
      -webkit-font-smoothing: antialiased;
    }
    .column {
      width: min(680px, 100%);
      margin: 0 auto;
      min-height: 100vh;
      background: #fff;
      padding: 8px 28px 64px;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04);
    }
    header.bar {
      display: flex;
      align-items: center;
      gap: 10px;
      position: sticky;
      top: 0;
      z-index: 3;
      padding: 12px 0;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(12px);
    }
    .mark {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: #f3f3f3;
      display: grid;
      place-items: center;
      overflow: hidden;
      flex-shrink: 0;
      text-decoration: none;
    }
    .mark img { width: 24px; height: 24px; object-fit: contain; display: block; }
    .mark.cover img { width: 100%; height: 100%; object-fit: cover; }
    .pills { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
    .pills a {
      text-decoration: none;
      color: #3a3a3a;
      background: #f2f2f2;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .pills a:hover { background: #e7e7e7; }
    .who {
      margin-left: auto;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
      background: var(--brand);
      color: var(--on);
    }
    .banner {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 7.2;
      object-fit: cover;
      border-radius: 18px;
      margin: 8px 0 0;
      background: #f3f3f3;
    }
    .banner.slim { aspect-ratio: 16 / 5.2; margin-bottom: 8px; }
    .hello { margin: 22px 0 0; color: #6f6f6f; font-size: 15px; }
    h1.display {
      margin: 8px 0 0;
      max-width: 22ch;
      font-size: clamp(26px, 4vw, 32px);
      font-weight: 650;
      letter-spacing: -0.035em;
      line-height: 1.2;
    }
    h1.display em {
      font-style: normal;
      text-decoration: underline;
      text-underline-offset: 4px;
      text-decoration-thickness: 1.5px;
    }
    .bio {
      margin: 12px 0 0;
      max-width: 54ch;
      color: #8a8a8a;
      font-size: 14.5px;
      line-height: 1.55;
    }
    .loc {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 14px 0 0;
      color: #8a8a8a;
      font-size: 13.5px;
    }
    .work { margin-top: 28px; padding-top: 18px; border-top: 1px solid #eee; }
    .work h2 {
      margin: 0 0 8px;
      font-size: 15px;
      font-weight: 650;
      letter-spacing: -0.02em;
    }
    .year {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 16px 0 2px;
      color: #9a9a9a;
      font-size: 13px;
      font-weight: 600;
    }
    .row {
      display: grid;
      grid-template-columns: minmax(88px, max-content) minmax(0, 1fr) auto;
      gap: 14px;
      align-items: center;
      margin: 0 -8px;
      padding: 11px 8px;
      border-radius: 10px;
      text-decoration: none;
      color: inherit;
    }
    .row:hover { background: #f6f6f6; }
    .row strong { font-size: 14.5px; font-weight: 650; letter-spacing: -0.02em; }
    .row span {
      color: #8d8d8d;
      font-size: 14.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .row svg { color: #c5c5c5; }
    .back {
      display: inline-flex;
      margin: 18px 0 8px;
      color: #8a8a8a;
      font-size: 13px;
      font-weight: 650;
      text-decoration: none;
    }
    .back:hover { color: #161616; }
    .prose { font-size: 1.02rem; line-height: 1.7; color: #222; }
    .prose h1 {
      font-size: clamp(1.7rem, 3vw, 2.15rem);
      letter-spacing: -0.035em;
      line-height: 1.15;
      margin: 8px 0 16px;
    }
    .prose h2 {
      font-size: 1.15rem;
      letter-spacing: -0.02em;
      margin: 1.8rem 0 0.6rem;
    }
    .prose h3 { font-size: 1.02rem; margin: 1.2rem 0 0.4rem; }
    .prose p { margin: 0 0 1rem; }
    .prose ul, .prose ol { margin: 0 0 1rem; padding-left: 1.2rem; }
    .prose a { color: #161616; }
    .prose blockquote {
      margin: 1rem 0;
      padding-left: 0.9rem;
      border-left: 2px solid var(--brand);
      color: #666;
    }
    .prose code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.9em;
      background: #f4f4f4;
      padding: 0.1em 0.35em;
      border-radius: 6px;
    }
    footer.col {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      color: #9a9a9a;
      font-size: 12.5px;
    }
    footer.col a { color: inherit; text-decoration: none; }
    footer.col a:hover { color: #161616; }
    @media (max-width: 720px) {
      body { background: #fff; background-image: none; }
      .column { box-shadow: none; padding: 4px 18px 48px; }
      .row { grid-template-columns: minmax(0, 1fr) auto; }
      .row span { grid-column: 1; white-space: normal; }
      .row svg { grid-row: 1 / span 2; align-self: center; }
    }
  `;
}

function chrome(input: {
  companyName: string;
  brandColor: string;
  markUrl: string;
  markFit: "contain" | "cover";
  markHref: string;
  workHref: string;
  journalHref: string;
  aboutHref: string;
}): string {
  const initial = escapeHtml(input.companyName.trim().charAt(0).toUpperCase() || "A");
  const fit = input.markFit === "cover" ? " cover" : "";
  return `<header class="bar">
      <a class="mark${fit}" href="${input.markHref}">
        <img src="${input.markUrl}" alt="" />
      </a>
      <nav class="pills" aria-label="Site">
        <a href="${input.workHref}">Work</a>
        <a href="${input.journalHref}">Notes</a>
        <a href="${input.aboutHref}">About</a>
      </nav>
      <span class="who" aria-hidden="true">${initial}</span>
    </header>`;
}

function workList(
  profile: SiteProfile,
  pages: Array<{ topic: string; href: string }>,
): string {
  const byTopic = new Map(profile.works.map((work) => [work.topic, work]));
  const rows = pages.map((page) => {
    const work = byTopic.get(page.topic);
    return {
      href: page.href,
      name: work?.name || page.topic,
      blurb: work?.blurb || page.topic,
      year: work?.year || String(new Date().getFullYear()),
    };
  });
  const years = [...new Set(rows.map((row) => row.year))].sort(
    (a, b) => Number(b) - Number(a),
  );
  const blocks = years
    .map((year) => {
      const items = rows
        .filter((row) => row.year === year)
        .map(
          (row) => `<a class="row" href="${row.href}">
            <strong>${escapeHtml(row.name)}</strong>
            <span>${escapeHtml(row.blurb)}</span>
            ${CHEVRON}
          </a>`,
        )
        .join("");
      return `<div class="year">${FOLDER}<span>${escapeHtml(year)}</span></div>${items}`;
    })
    .join("");

  return `<section class="work" id="work">
      <h2>Work</h2>
      ${blocks || "<p class=\"bio\">Essays will appear here as they are published.</p>"}
    </section>`;
}

function documentShell(input: {
  title: string;
  description: string;
  brandColor: string;
  markUrl: string;
  body: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
  <meta name="description" content="${escapeHtml(input.description)}" />
  <link rel="icon" href="${input.markUrl}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet" />
  <style>${shellCss(input.brandColor)}</style>
</head>
<body>
  <div class="column" id="top">
    ${input.body}
  </div>
</body>
</html>`;
}

export function renderIndexPage(input: {
  companyName: string;
  brandColor: string;
  markUrl: string;
  markFit: "contain" | "cover";
  bannerUrl: string;
  profile: SiteProfile;
  pages: Array<{ topic: string; href: string; wordCount: number }>;
}): string {
  const { companyName, brandColor, markUrl, markFit, bannerUrl, profile, pages } = input;
  const journalHref = pages[0]?.href ?? "#work";
  const home = "./index.html";
  const location = profile.location
    ? `<p class="loc">${PIN}<span>${escapeHtml(profile.location)}</span></p>`
    : "";

  const body = `${chrome({
    companyName,
    brandColor,
    markUrl,
    markFit,
    markHref: "#top",
    workHref: "#work",
    journalHref,
    aboutHref: "#about",
  })}
    <img class="banner" src="${bannerUrl}" alt="" />
    <div id="about">
      <p class="hello">${escapeHtml(profile.greeting)}</p>
      <h1 class="display">${renderEmphasis(profile.headline)}</h1>
      <p class="bio">${escapeHtml(profile.bio)}</p>
      ${location}
    </div>
    ${workList(profile, pages)}
    <footer class="col">
      <span>© ${new Date().getFullYear()} ${escapeHtml(companyName)}</span>
      <a href="${home}#top">Back to top</a>
    </footer>`;

  return documentShell({
    title: companyName,
    description: profile.bio,
    brandColor,
    markUrl,
    body,
  });
}

export function renderBlogPage(input: {
  companyName: string;
  brandColor: string;
  markUrl: string;
  markFit: "contain" | "cover";
  bannerUrl: string;
  topic: string;
  markdown: string;
  homeHref: string;
}): string {
  const {
    companyName,
    brandColor,
    markUrl,
    markFit,
    bannerUrl,
    topic,
    markdown,
    homeHref,
  } = input;
  const htmlBody = marked.parse(markdown, { async: false }) as string;
  const body = `${chrome({
    companyName,
    brandColor,
    markUrl,
    markFit,
    markHref: homeHref,
    workHref: `${homeHref}#work`,
    journalHref: `${homeHref}#work`,
    aboutHref: `${homeHref}#about`,
  })}
    <img class="banner slim" src="${bannerUrl}" alt="" />
    <a class="back" href="${homeHref}#work">← Work</a>
    <article class="prose">${htmlBody}</article>
    <footer class="col">
      <span>© ${new Date().getFullYear()} ${escapeHtml(companyName)}</span>
      <a href="${homeHref}">All work</a>
    </footer>`;

  return documentShell({
    title: `${topic} · ${companyName}`,
    description: topic,
    brandColor,
    markUrl,
    body,
  });
}
