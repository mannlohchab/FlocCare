export type SiteStatus = "queued" | "generating" | "ready" | "error";

export type PageStatus = "pending" | "writing" | "ready" | "error";

export interface SitePage {
  slug: string;
  topic: string;
  status: PageStatus;
  wordCount: number;
  path: string;
  error?: string;
}

export interface WorkItem {
  topic: string;
  name: string;
  blurb: string;
  year: string;
}

export interface SiteProfile {
  greeting: string;
  headline: string;
  bio: string;
  location: string;
  works: WorkItem[];
}

export interface SiteRecord {
  id: string;
  slug: string;
  companyName: string;
  brandColor: string;
  logoPath: string;
  iconId?: string;
  bannerId?: string;
  bannerPath?: string;
  markFit?: "contain" | "cover";
  profile?: SiteProfile;
  topics: string[];
  pages: SitePage[];
  status: SiteStatus;
  model: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
  notice?: string;
}

export interface CreateSiteInput {
  companyName: string;
  brandColor: string;
  topics: string[];
  logoBytes?: Uint8Array;
  logoExt?: string;
  iconId: string;
  bannerId: string;
  /** Used for this run only. Never stored on the site. */
  mimoKey?: string;
}
