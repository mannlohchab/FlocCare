import type { SiteProfile, WorkItem } from "./types.ts";

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function balanceMarks(value: string): string {
  const marks = value.match(/\*\*/g)?.length ?? 0;
  if (marks % 2 === 1) return value.replaceAll("**", "");
  return value;
}

function workName(topic: string): string {
  const skip =
    /^(a|an|the|of|and|or|for|to|in|on|with|without|from|why|how|what|when|into|your|that|this|designing|writing|choosing|measuring|shipping|hosting)$/i;
  const words = topic.replace(/[^A-Za-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const picked = words.filter((word) => !skip.test(word) && word.length > 3);
  picked.sort((a, b) => b.length - a.length);
  const base = picked[0] ?? words[0] ?? "Note";
  return base.charAt(0).toUpperCase() + base.slice(1, 14);
}

function phrase(topic: string): string {
  const text = topic.trim().replace(/[.]+$/, "");
  if (text.length <= 42) return text.toLowerCase();
  return text.split(/\s+/).slice(0, 4).join(" ").toLowerCase();
}

export function localProfile(companyName: string, topics: string[]): SiteProfile {
  const yearNow = new Date().getFullYear();
  const split = Math.ceil(topics.length / 2);
  const lead = topics[0] ?? "useful work";
  const works: WorkItem[] = topics.map((topic, index) => ({
    topic,
    name: workName(topic),
    blurb: clip(topic, 64),
    year: String(index < split ? yearNow : yearNow - 1),
  }));

  return {
    greeting: `Hello, I'm ${companyName}`,
    headline: `I build **${phrase(lead)}** and share what I learn.`,
    bio: `Most days at ${companyName}, I'm turning rough ideas into useful work, figuring out the messy parts, and sharing what I learn along the way.`,
    location: "",
    works,
  };
}

function cleanLocation(value: unknown): string {
  const text = clip(String(value ?? ""), 48);
  if (!text || /^(n\/a|none|unknown|null|—|-|empty)$/i.test(text)) return "";
  return text;
}

export function coerceProfile(
  raw: string,
  companyName: string,
  topics: string[],
): SiteProfile {
  const fallback = localProfile(companyName, topics);
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return fallback;

  let data: {
    greeting?: unknown;
    headline?: unknown;
    bio?: unknown;
    location?: unknown;
    works?: unknown;
  };
  try {
    data = JSON.parse(cleaned.slice(start, end + 1)) as typeof data;
  } catch {
    return fallback;
  }

  const incoming = Array.isArray(data.works) ? data.works : [];
  const works = topics.map((topic, index) => {
    const local = fallback.works[index] ?? {
      topic,
      name: workName(topic),
      blurb: clip(topic, 64),
      year: String(new Date().getFullYear()),
    };
    const found =
      incoming.find((item) => {
        if (!item || typeof item !== "object") return false;
        const topicValue = (item as { topic?: unknown }).topic;
        return String(topicValue ?? "").trim().toLowerCase() === topic.toLowerCase();
      }) ?? incoming[index];
    const row =
      found && typeof found === "object"
        ? (found as { name?: unknown; blurb?: unknown; year?: unknown })
        : {};
    const year = String(row.year ?? "");
    return {
      topic,
      name: clip(String(row.name ?? ""), 28) || local.name,
      blurb: clip(String(row.blurb ?? ""), 72) || local.blurb,
      year: /^\d{4}$/.test(year) ? year : local.year,
    };
  });

  const headline = balanceMarks(clip(String(data.headline ?? ""), 180));

  return {
    greeting: clip(String(data.greeting ?? ""), 80) || fallback.greeting,
    headline: headline || fallback.headline,
    bio: clip(String(data.bio ?? ""), 320) || fallback.bio,
    location: cleanLocation(data.location),
    works,
  };
}
