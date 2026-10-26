/**
 * Deterministic long-form Markdown writer used when free LLM APIs
 * are rate-limited or unreachable. Produces ~1000 words so demos
 * and multi-topic runs still complete.
 */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(seed: number, items: T[], salt: number): T {
  return items[(seed + salt * 97) % items.length]!;
}

function sentences(seed: number, topic: string, company: string, n: number, salt: number): string {
  const openers = [
    `When teams at ${company} talk about ${topic.toLowerCase()}, the conversation usually starts with what feels missing rather than what is already working.`,
    `${topic} is easy to treat as a slogan. The harder work is turning it into a repeatable practice that survives a busy week.`,
    `Most products do not fail because people lack ideas about ${topic.toLowerCase()}. They stall because the craft never becomes concrete.`,
    `At ${company}, we treat ${topic.toLowerCase()} as an operating constraint: something you design for early, then protect under pressure.`,
    `A useful way to rethink ${topic.toLowerCase()} is to ask what a new teammate would notice in the first hour of using the product.`,
  ];
  const middles = [
    `That means naming the trade-offs out loud, writing them down, and revisiting them when metrics or customer feedback shift.`,
    `Small experiments beat grand redesigns: ship a thin slice, watch real behavior, then widen what proved valuable.`,
    `Clarity beats cleverness. If a decision cannot be explained in a short paragraph, it is usually not ready for customers.`,
    `The best rituals are boring on purpose. Consistency is what lets creative work happen without constant re-negotiation.`,
    `Documentation is not overhead when it shortens the next conversation. It is a product surface for your future self.`,
    `Constraints are not the enemy of taste. They are the frame that keeps taste from dissolving into endless options.`,
    `Look for friction that repeats. One awkward moment is noise; the same awkward moment across ten sessions is a design debt.`,
    `Ownership matters more than ceremony. A page without an owner becomes a museum of outdated decisions.`,
  ];
  const closers = [
    `Do less, but make the remaining work unmistakable.`,
    `Then measure whether the next person can continue without a meeting.`,
    `That is how craft compounds instead of resetting every sprint.`,
    `Keep the loop short enough that learning still feels cheap.`,
    `Protect the standard even when shipping pressure rises.`,
  ];

  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = pick(seed, openers, salt + i * 3);
    const b = pick(seed, middles, salt + i * 3 + 1);
    const c = pick(seed, closers, salt + i * 3 + 2);
    parts.push(`${a} ${b} ${c}`);
  }
  return parts.join(" ");
}

function bulletBlock(seed: number, topic: string, salt: number): string {
  const items = [
    `Define what “good” means for ${topic.toLowerCase()} in one sentence.`,
    `List the three moments where users hesitate, then redesign only those.`,
    `Assign a single owner for the decision log and keep it visible.`,
    `Run a weekly fifteen-minute review with one shipped example.`,
    `Capture customer language and reuse it in interface copy.`,
    `Prefer defaults that encode your best judgment.`,
    `Delete one unused pattern for every new pattern you introduce.`,
    `Write the failure case before celebrating the happy path.`,
  ];
  const chosen = [0, 1, 2, 3, 4].map((i) => pick(seed, items, salt + i));
  return chosen.map((line) => `- ${line}`).join("\n");
}

export function writeLocalBlog(
  companyName: string,
  topic: string,
): { markdown: string; wordCount: number; model: string } {
  const seed = hash(`${companyName}::${topic}`);
  const title = topic.replace(/\s+/g, " ").trim();

  const sections = [
    {
      h: "Why this matters now",
      body: sentences(seed, topic, companyName, 4, 1),
    },
    {
      h: "A practical frame",
      body: `${sentences(seed, topic, companyName, 3, 2)}\n\n${bulletBlock(seed, topic, 11)}`,
    },
    {
      h: "Patterns that hold up",
      body: sentences(seed, topic, companyName, 4, 3),
    },
    {
      h: "Common failure modes",
      body: sentences(seed, topic, companyName, 3, 4),
    },
    {
      h: "A week-long operating rhythm",
      body: `${sentences(seed, topic, companyName, 3, 5)}\n\n${bulletBlock(seed, topic, 21)}`,
    },
    {
      h: "Closing",
      body: sentences(seed, topic, companyName, 3, 6),
    },
  ];

  // Pad until ~1000 words with an additional field notes section if needed
  let markdown = `# ${title}\n\n${sentences(seed, topic, companyName, 2, 0)}\n\n`;
  for (const section of sections) {
    markdown += `## ${section.h}\n\n${section.body}\n\n`;
  }

  let words = markdown.trim().split(/\s+/).filter(Boolean).length;
  let pad = 0;
  while (words < 980 && pad < 8) {
    markdown += `## Field notes ${pad + 1}\n\n${sentences(seed, topic, companyName, 3, 40 + pad)}\n\n`;
    words = markdown.trim().split(/\s+/).filter(Boolean).length;
    pad++;
  }

  return {
    markdown: markdown.trim(),
    wordCount: words,
    model: "local-compositional-writer",
  };
}
