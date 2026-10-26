import { existsSync } from "node:fs";
import { join } from "node:path";

/** Keep ids in sync with web/src/lib/catalog.ts */
const ICON_IDS = [
  "star",
  "rocket",
  "house",
  "feather",
  "heart",
  "camera",
  "bolt",
  "sparkle",
  "plane",
  "book",
  "palette",
  "wand",
  "pin",
  "suitcase",
  "flame",
  "cube",
] as const;

export const BANNERS = [
  { id: "mist", file: "mist.jpg", label: "Mist ridge" },
  { id: "shore", file: "shore.jpg", label: "Quiet shore" },
  { id: "dunes", file: "dunes.jpg", label: "Dune light" },
  { id: "linen", file: "linen.jpg", label: "Linen room" },
  { id: "coffee", file: "coffee.jpg", label: "Morning cup" },
  { id: "kyoto", file: "kyoto.jpg", label: "Lantern street" },
  { id: "greenhouse", file: "greenhouse.jpg", label: "Greenhouse" },
  { id: "reading", file: "reading.jpg", label: "Reading room" },
  { id: "concrete", file: "concrete.jpg", label: "Soft concrete" },
  { id: "camera", file: "camera.jpg", label: "Film still" },
  { id: "marble", file: "marble.jpg", label: "Marble wash" },
  { id: "dusk", file: "dusk.jpg", label: "City dusk" },
  { id: "ceramics", file: "ceramics.jpg", label: "Ceramic still" },
  { id: "journal", file: "journal.jpg", label: "Open journal" },
  { id: "meadow", file: "meadow.jpg", label: "Wild meadow" },
  { id: "shadow", file: "shadow.jpg", label: "Long shadow" },
] as const;

const PUBLIC = join(import.meta.dir, "../web/public");
const ICONS = new Set<string>(ICON_IDS);

export function isIconId(id: string): boolean {
  return ICONS.has(id);
}

export function isBannerId(id: string): boolean {
  return BANNERS.some((banner) => banner.id === id);
}

export function iconPathFor(id: string): string | null {
  if (!isIconId(id)) return null;
  const path = join(PUBLIC, "icons", `${id}.svg`);
  return existsSync(path) ? path : null;
}

export function bannerPathFor(id: string): string | null {
  const banner = BANNERS.find((item) => item.id === id);
  if (!banner) return null;
  const path = join(PUBLIC, "banners", banner.file);
  return existsSync(path) ? path : null;
}
