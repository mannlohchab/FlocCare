import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { SiteRecord } from "./types.ts";

export const ROOT = join(import.meta.dir, "..");
export const DATA_DIR = join(ROOT, "data");
export const SITES_DIR = join(DATA_DIR, "sites");
export const INDEX_PATH = join(DATA_DIR, "index.json");

await mkdir(SITES_DIR, { recursive: true });

async function readIndex(): Promise<SiteRecord[]> {
  const file = Bun.file(INDEX_PATH);
  if (!(await file.exists())) return [];
  try {
    return (await file.json()) as SiteRecord[];
  } catch {
    return [];
  }
}

async function writeIndex(sites: SiteRecord[]) {
  await Bun.write(INDEX_PATH, JSON.stringify(sites, null, 2));
}

export async function listSites(): Promise<SiteRecord[]> {
  const sites = await readIndex();
  return [...sites].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export async function getSite(idOrSlug: string): Promise<SiteRecord | null> {
  const sites = await readIndex();
  return sites.find((s) => s.id === idOrSlug || s.slug === idOrSlug) ?? null;
}

export async function saveSite(site: SiteRecord): Promise<void> {
  const sites = await readIndex();
  const i = sites.findIndex((s) => s.id === site.id);
  if (i >= 0) sites[i] = site;
  else sites.push(site);
  await writeIndex(sites);
  await mkdir(join(SITES_DIR, site.slug), { recursive: true });
  await Bun.write(
    join(SITES_DIR, site.slug, "meta.json"),
    JSON.stringify(site, null, 2),
  );
}

export function siteDir(slug: string): string {
  return join(SITES_DIR, slug);
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "site";
}

export function topicSlug(topic: string, index: number): string {
  const s = slugify(topic);
  return s
    ? `${String(index + 1).padStart(2, "0")}-${s}`
    : `post-${index + 1}`;
}
