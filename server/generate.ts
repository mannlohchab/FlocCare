import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { nanoid } from "nanoid";
import { bannerPathFor, iconPathFor } from "./catalog.ts";
import {
  writeBlogPost,
  writeSiteProfile,
  activeModelLabel,
  preferredConcurrency,
} from "./llm.ts";
import { localProfile } from "./profile.ts";
import { renderBlogPage, renderIndexPage } from "./template.ts";
import {
  getSite,
  saveSite,
  siteDir,
  slugify,
  topicSlug,
} from "./store.ts";
import type { CreateSiteInput, SitePage, SiteRecord } from "./types.ts";

const listeners = new Map<string, Set<(site: SiteRecord) => void>>();

/** Serialize read-modify-write for a site so concurrent workers don't clobber pages. */
const siteLocks = new Map<string, Promise<void>>();

async function withSiteLock<T>(siteId: string, fn: () => Promise<T>): Promise<T> {
  const prev = siteLocks.get(siteId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  siteLocks.set(
    siteId,
    prev.then(() => gate),
  );
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

export function subscribe(siteId: string, fn: (site: SiteRecord) => void) {
  let set = listeners.get(siteId);
  if (!set) {
    set = new Set();
    listeners.set(siteId, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) listeners.delete(siteId);
  };
}

function emit(site: SiteRecord) {
  const set = listeners.get(site.id);
  if (!set) return;
  for (const fn of set) fn(structuredClone(site));
}

async function uniqueSlug(companyName: string): Promise<string> {
  const base = slugify(companyName);
  let candidate = base;
  let n = 2;
  while (await getSite(candidate)) {
    candidate = `${base}-${n++}`;
  }
  return candidate;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]!, i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  );
  return results;
}

async function patchSite(
  siteId: string,
  patch: (site: SiteRecord) => void,
): Promise<SiteRecord> {
  return withSiteLock(siteId, async () => {
    const site = await getSite(siteId);
    if (!site) throw new Error(`Site ${siteId} missing`);
    patch(site);
    site.updatedAt = new Date().toISOString();
    await saveSite(site);
    emit(site);
    return site;
  });
}

export async function createSite(input: CreateSiteInput): Promise<SiteRecord> {
  const id = nanoid(10);
  const slug = await uniqueSlug(input.companyName);
  const dir = siteDir(slug);
  await mkdir(dir, { recursive: true });
  await mkdir(join(dir, "posts"), { recursive: true });

  const iconSrc = iconPathFor(input.iconId);
  const bannerSrc = bannerPathFor(input.bannerId);
  if (!iconSrc || !bannerSrc) {
    throw new Error("Choose a glass icon and a banner.");
  }

  let logoName: string;
  let markFit: "contain" | "cover";
  if (input.logoBytes && input.logoExt) {
    logoName = `logo.${input.logoExt}`;
    markFit = input.logoExt === "svg" ? "contain" : "cover";
    await Bun.write(join(dir, logoName), input.logoBytes);
  } else {
    logoName = "icon.svg";
    markFit = "contain";
    await copyFile(iconSrc, join(dir, logoName));
  }
  await copyFile(bannerSrc, join(dir, "banner.jpg"));

  const pages: SitePage[] = input.topics.map((topic, index) => {
    const pageSlug = topicSlug(topic, index);
    return {
      slug: pageSlug,
      topic,
      status: "pending",
      wordCount: 0,
      path: `/s/${slug}/posts/${pageSlug}.html`,
    };
  });

  const now = new Date().toISOString();
  const site: SiteRecord = {
    id,
    slug,
    companyName: input.companyName,
    brandColor: input.brandColor,
    logoPath: `/s/${slug}/${logoName}`,
    iconId: input.iconId,
    bannerId: input.bannerId,
    bannerPath: `/s/${slug}/banner.jpg`,
    markFit,
    profile: localProfile(input.companyName, input.topics),
    topics: input.topics,
    pages,
    status: "queued",
    model: activeModelLabel(),
    createdAt: now,
    updatedAt: now,
  };

  await saveSite(site);
  void generateSite(site.id, input.mimoKey);
  return site;
}

async function writePageFiles(
  site: SiteRecord,
  page: SitePage,
  markdown: string,
) {
  const markFile = site.logoPath.split("/").pop() ?? "icon.svg";
  const html = renderBlogPage({
    companyName: site.companyName,
    brandColor: site.brandColor,
    markUrl: `../${markFile}`,
    markFit: site.markFit ?? "contain",
    bannerUrl: "../banner.jpg",
    topic: page.topic,
    markdown,
    homeHref: "../index.html",
  });

  await Bun.write(
    join(siteDir(site.slug), "posts", `${page.slug}.html`),
    html,
  );
  await Bun.write(
    join(siteDir(site.slug), "posts", `${page.slug}.md`),
    markdown,
  );
}

async function generateSite(siteId: string, mimoKey?: string) {
  const site = await getSite(siteId);
  if (!site) return;

  await patchSite(siteId, (s) => {
    s.status = "generating";
  });

  const { profile, model } = await writeSiteProfile(
    site.companyName,
    site.topics,
    mimoKey,
  );
  await patchSite(siteId, (s) => {
    s.profile = profile;
    s.model = model;
    if (mimoKey?.trim() && !model.includes("MiMo")) {
      s.notice = "MiMo didn't respond, so the built-in writer filled the homepage.";
    }
  });

  const concurrency =
    mimoKey?.trim() || process.env.MIMO_API_KEY
      ? Number(process.env.GEN_CONCURRENCY ?? 3)
      : preferredConcurrency();
  const markdownBySlug = new Map<string, string>();

  try {
    await mapPool(site.pages, concurrency, async (page, index) => {
      await patchSite(siteId, (s) => {
        s.pages[index]!.status = "writing";
      });

      try {
        const { markdown, wordCount, model } = await writeBlogPost(
          site.companyName,
          page.topic,
          mimoKey,
        );
        markdownBySlug.set(page.slug, markdown);

        const latest = await patchSite(siteId, (s) => {
          s.model = model;
          if (mimoKey?.trim() && !model.includes("MiMo")) {
            s.notice =
              "MiMo didn't respond, so the built-in writer filled the pages.";
          }
          s.pages[index] = {
            ...page,
            status: "ready",
            wordCount,
            path: `/s/${s.slug}/posts/${page.slug}.html`,
          };
        });

        await writePageFiles(latest, latest.pages[index]!, markdown);
      } catch (err) {
        await patchSite(siteId, (s) => {
          s.pages[index] = {
            ...page,
            status: "error",
            error: err instanceof Error ? err.message : String(err),
          };
        });
      }
    });

    const final = await patchSite(siteId, () => {});
    const readyPages = final.pages.filter((p) => p.status === "ready");

    // Re-render every ready page so topic nav reflects final statuses
    for (const page of readyPages) {
      const md = markdownBySlug.get(page.slug);
      if (!md) continue;
      await writePageFiles(final, page, md);
    }

    const indexHtml = renderIndexPage({
      companyName: final.companyName,
      brandColor: final.brandColor,
      markUrl: final.logoPath.split("/").pop() ?? "icon.svg",
      markFit: final.markFit ?? "contain",
      bannerUrl: "banner.jpg",
      profile: final.profile ?? localProfile(final.companyName, final.topics),
      pages: readyPages.map((p) => ({
        topic: p.topic,
        href: `./posts/${p.slug}.html`,
        wordCount: p.wordCount,
      })),
    });
    await Bun.write(join(siteDir(final.slug), "index.html"), indexHtml);

    await patchSite(siteId, (s) => {
      s.status = readyPages.length > 0 ? "ready" : "error";
      if (s.status === "error") {
        s.error = "No pages were generated successfully.";
      }
    });
  } catch (err) {
    await patchSite(siteId, (s) => {
      s.status = "error";
      s.error = err instanceof Error ? err.message : String(err);
    });
  }
}
