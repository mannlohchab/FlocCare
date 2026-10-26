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

export interface Site {
  id: string;
  slug: string;
  companyName: string;
  brandColor: string;
  logoPath: string;
  iconId?: string;
  bannerId?: string;
  bannerPath?: string;
  markFit?: "contain" | "cover";
  topics: string[];
  pages: SitePage[];
  status: SiteStatus;
  model: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
  notice?: string;
}
