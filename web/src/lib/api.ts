import type { Site } from "./types";

export async function fetchSites(): Promise<Site[]> {
  const res = await fetch("/api/sites");
  if (!res.ok) throw new Error("Failed to load sites");
  const data = (await res.json()) as { sites: Site[] };
  return data.sites;
}

export async function fetchSite(id: string): Promise<Site> {
  const res = await fetch(`/api/sites/${id}`);
  if (!res.ok) throw new Error("Site not found");
  const data = (await res.json()) as { site: Site };
  return data.site;
}

export async function fetchHealth(): Promise<{ model: string }> {
  const res = await fetch("/api/health");
  if (!res.ok) return { model: "unknown" };
  return res.json();
}

export async function createSite(input: {
  companyName: string;
  brandColor: string;
  topics: string[];
  logo: File | null;
  iconId: string;
  bannerId: string;
  mimoKey?: string;
}): Promise<Site> {
  const form = new FormData();
  form.set("companyName", input.companyName);
  form.set("brandColor", input.brandColor);
  form.set("topics", JSON.stringify(input.topics));
  form.set("iconId", input.iconId);
  form.set("bannerId", input.bannerId);
  if (input.logo) form.set("logo", input.logo);
  if (input.mimoKey) form.set("mimoKey", input.mimoKey);

  const res = await fetch("/api/sites", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to create site");
  return data.site as Site;
}

export function watchSite(
  id: string,
  onSite: (site: Site) => void,
  onDone?: () => void,
): () => void {
  const es = new EventSource(`/api/sites/${id}/events`);
  es.addEventListener("site", (ev) => {
    try {
      onSite(JSON.parse((ev as MessageEvent).data) as Site);
    } catch {
      /* ignore */
    }
  });
  es.addEventListener("done", () => {
    es.close();
    onDone?.();
  });
  es.onerror = () => {
    // Browser will retry; if site is finished we also poll as backup
  };
  return () => es.close();
}
