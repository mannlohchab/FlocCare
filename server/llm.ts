/**
 * Long-form writer for hosted pages.
 *
 * Priority:
 *  1. Xiaomi MiMo — MIMO_API_KEY, or a key pasted for this run
 *  2. Groq (free tier) — if GROQ_API_KEY is set
 *  3. Google Gemini (free tier) — if GEMINI_API_KEY is set
 *  4. Pollinations text API — free, no key (rate-limited)
 *  5. Local compositional writer — always-available fallback
 */

import { writeLocalBlog } from "./localWriter.ts";
import { coerceProfile, localProfile } from "./profile.ts";
import type { SiteProfile } from "./types.ts";

const TARGET_WORDS = 1000;

/** Pollinations free tier: 1 reply / 30s per IP. Serialize + wait. */
let pollinationsChain: Promise<void> = Promise.resolve();
let lastPollinationsAt = 0;

function mimoModelName(): string {
  return process.env.MIMO_MODEL ?? "mimo-v2.6-flash";
}

export function activeModelLabel(): string {
  if (process.env.MIMO_API_KEY) {
    return `${mimoModelName()} (MiMo)`;
  }
  if (process.env.GROQ_API_KEY) {
    return process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile (Groq)";
  }
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_MODEL ?? "gemini-2.0-flash (Gemini)";
  }
  if (process.env.FORCE_LOCAL_WRITER === "1") {
    return "local-compositional-writer";
  }
  return `pollinations/${process.env.POLLINATIONS_MODEL ?? "openai"} (+ local fallback)`;
}

export function preferredConcurrency(): number {
  if (
    process.env.MIMO_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.GEMINI_API_KEY
  ) {
    return Number(process.env.GEN_CONCURRENCY ?? 3);
  }
  if (process.env.FORCE_LOCAL_WRITER === "1") {
    return Number(process.env.GEN_CONCURRENCY ?? 6);
  }
  // Free Pollinations: one request at a time
  return 1;
}

function buildPrompt(companyName: string, topic: string): string {
  return `You are a senior editorial writer for ${companyName}.

Write a well-structured blog post about: "${topic}".

Hard requirements:
- Aim for approximately ${TARGET_WORDS} words (900–1100 is fine).
- Use Markdown only (no HTML).
- Start with a single H1 title (# Title).
- Include 4–6 H2 sections with clear headings.
- Open with a short hook paragraph, then develop the topic with concrete examples, practical takeaways, and a concise closing.
- Professional, readable tone — not salesy.
- Do not mention that you are an AI.
- Do not wrap the whole answer in a code fence.`;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mimoKeyFrom(override?: string): string {
  return override?.trim() || process.env.MIMO_API_KEY?.trim() || "";
}

function profilePrompt(companyName: string, topics: string[]): string {
  const list = topics.map((topic, index) => `${index + 1}. ${topic}`).join("\n");
  return `Write the homepage copy for ${companyName}, a personal studio site in the voice of one person publishing their work.

Topics, in order:
${list}

Return only JSON with this shape:
{
  "greeting": "Hello, I'm ${companyName}",
  "headline": "I build **a short phrase** in public and share what I learn.",
  "bio": "One or two calm sentences, under 220 characters.",
  "location": "",
  "works": [
    { "topic": "exact topic from the list", "name": "Short name", "blurb": "Short description under 64 characters", "year": "2026" }
  ]
}

Rules:
- greeting starts with "Hello, I'm"
- headline is one sentence and wraps one or two short phrases in **double asterisks**
- bio sounds like a person writing in public, not a press release
- location is "City, Country" only when it is genuinely associated with this name; otherwise an empty string
- works has exactly one item per topic, and topic must match the list verbatim
- name is a short title, not the full topic sentence
- blurb is a plain description without exclamation marks
- use year ${new Date().getFullYear()} for the first half of the list and ${new Date().getFullYear() - 1} for the rest
- no markdown fences and no commentary`;
}

async function callMimo(
  prompt: string,
  key: string,
  maxTokens: number,
): Promise<string> {
  const base = (process.env.MIMO_BASE_URL ?? "https://api.xiaomimimo.com/v1").replace(
    /\/$/,
    "",
  );
  const model = mimoModelName();

  const send = async (withThinkingFlag: boolean) => {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "api-key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_completion_tokens: maxTokens,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You are MiMo, an editorial assistant. Follow the user instructions exactly. Do not mention that you are an AI.",
          },
          { role: "user", content: prompt },
        ],
        ...(withThinkingFlag ? { thinking: { type: "disabled" } } : {}),
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      const err = new Error(`MiMo error ${res.status}: ${body.slice(0, 240)}`);
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }
    return body;
  };

  let body: string;
  try {
    body = await send(true);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 400) body = await send(false);
    else throw err;
  }

  const data = JSON.parse(body) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ text?: string }>;
        reasoning_content?: string;
      };
    }>;
  };
  const message = data.choices?.[0]?.message;
  let text = "";
  if (typeof message?.content === "string") text = message.content;
  else if (Array.isArray(message?.content)) {
    text = message.content.map((part) => part.text ?? "").join("");
  }
  if (!text.trim() && message?.reasoning_content) text = message.reasoning_content;
  text = text.trim();
  if (!text) throw new Error("MiMo returned empty content");
  return text;
}

function tidyMarkdown(markdown: string): string {
  return markdown
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function writeSiteProfile(
  companyName: string,
  topics: string[],
  mimoKey?: string,
): Promise<{ profile: SiteProfile; model: string }> {
  const key = mimoKeyFrom(mimoKey);
  if (!key) {
    return { profile: localProfile(companyName, topics), model: activeModelLabel() };
  }
  try {
    const raw = await callMimo(profilePrompt(companyName, topics), key, 1400);
    return {
      profile: coerceProfile(raw, companyName, topics),
      model: `${mimoModelName()} (MiMo)`,
    };
  } catch (err) {
    console.warn(
      "[llm] MiMo profile fell back to local copy:",
      err instanceof Error ? err.message : err,
    );
    return { profile: localProfile(companyName, topics), model: "local-profile" };
  }
}

async function callGroq(prompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY!;
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content:
            "You write long-form Markdown blog posts. Follow the user instructions exactly.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned empty content");
  return text;
}

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY!;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini returned empty content");
  return text;
}

async function callPollinationsOnce(prompt: string): Promise<string> {
  const model = process.env.POLLINATIONS_MODEL ?? "openai";
  const res = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You write long-form Markdown blog posts. Follow the user instructions exactly.",
        },
        { role: "user", content: prompt },
      ],
      model,
      seed: Math.floor(Math.random() * 1_000_000),
    }),
  });

  const body = await res.text();
  if (res.status === 402 || /free limit reached/i.test(body)) {
    const err = new Error(`Pollinations rate limit: ${body.slice(0, 180)}`);
    (err as Error & { code?: string }).code = "RATE_LIMIT";
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Pollinations error ${res.status}: ${body.slice(0, 200)}`);
  }
  const text = body.trim();
  if (!text) throw new Error("Pollinations returned empty content");
  return text;
}

async function callPollinations(prompt: string): Promise<string> {
  const run = async () => {
    const waitFor = Math.max(0, 32_000 - (Date.now() - lastPollinationsAt));
    if (waitFor > 0) await sleep(waitFor);

    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const text = await callPollinationsOnce(prompt);
        lastPollinationsAt = Date.now();
        return text;
      } catch (err) {
        lastErr = err;
        const code = (err as { code?: string }).code;
        if (code === "RATE_LIMIT") {
          await sleep(32_000);
          continue;
        }
        throw err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  };

  const next = pollinationsChain.then(run, run);
  pollinationsChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function expandPrompt(companyName: string, topic: string, markdown: string): string {
  return `Continue and expand this Markdown blog post for ${companyName} about "${topic}".
Current draft is only ~${countWords(markdown)} words. Keep the same title and structure, deepen each section with examples and actionable advice, and bring the full article to about ${TARGET_WORDS} words.
Return the COMPLETE revised Markdown article (not just the new paragraphs).

DRAFT:
${markdown}`;
}

function padShortDraft(markdown: string, companyName: string, topic: string, model: string) {
  if (countWords(markdown) >= 700) {
    return { markdown, model };
  }
  const local = writeLocalBlog(companyName, topic);
  return {
    markdown: `${markdown.trim()}\n\n${local.markdown.replace(/^#.+\n+/, "")}`,
    model: `${model} + local pad`,
  };
}

export async function writeBlogPost(
  companyName: string,
  topic: string,
  mimoKey?: string,
): Promise<{ markdown: string; wordCount: number; model: string }> {
  const prompt = buildPrompt(companyName, topic);
  const key = mimoKeyFrom(mimoKey);

  if (key) {
    try {
      let markdown = tidyMarkdown(await callMimo(prompt, key, 4096));
      let model = `${mimoModelName()} (MiMo)`;
      if (countWords(markdown) < 850) {
        try {
          const expanded = tidyMarkdown(
            await callMimo(expandPrompt(companyName, topic, markdown), key, 4096),
          );
          if (countWords(expanded) > countWords(markdown)) markdown = expanded;
        } catch {
          /* keep draft */
        }
      }
      const padded = padShortDraft(markdown, companyName, topic, model);
      return {
        markdown: padded.markdown,
        wordCount: countWords(padded.markdown),
        model: padded.model,
      };
    } catch (err) {
      console.warn(
        `[llm] MiMo failed for "${topic}", trying the next writer:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (process.env.FORCE_LOCAL_WRITER === "1") {
    return writeLocalBlog(companyName, topic);
  }

  const keyed = Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);

  try {
    let markdown: string;
    let model = activeModelLabel();

    if (process.env.GROQ_API_KEY) {
      markdown = await callGroq(prompt);
    } else if (process.env.GEMINI_API_KEY) {
      markdown = await callGemini(prompt);
    } else {
      markdown = await callPollinations(prompt);
      model = `pollinations/${process.env.POLLINATIONS_MODEL ?? "openai"}`;
    }

    // Only expand when we have a keyed provider (avoid burning free rate limit)
    if (keyed && countWords(markdown) < 850) {
      try {
        const expanded = process.env.GROQ_API_KEY
          ? await callGroq(expandPrompt(companyName, topic, markdown))
          : await callGemini(expandPrompt(companyName, topic, markdown));
        if (countWords(expanded) > countWords(markdown)) markdown = expanded;
      } catch {
        /* keep draft */
      }
    }

    const padded = padShortDraft(tidyMarkdown(markdown), companyName, topic, model);
    return {
      markdown: padded.markdown,
      wordCount: countWords(padded.markdown),
      model: padded.model,
    };
  } catch (err) {
    console.warn(
      `[llm] falling back to local writer for "${topic}":`,
      err instanceof Error ? err.message : err,
    );
    return writeLocalBlog(companyName, topic);
  }
}
