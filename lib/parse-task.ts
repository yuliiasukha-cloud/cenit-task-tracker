import OpenAI from "openai";

export type ParsedTask = {
  title: string;
  priority: "high" | "medium" | "low";
  deadline: Date | null;
  category: "work" | "personal" | "learning" | null;
};

function normalizePriority(value: unknown): "high" | "medium" | "low" {
  const s = String(value ?? "").toLowerCase();
  if (s === "high" || s === "medium" || s === "low") return s;
  return "medium";
}

function parseDeadline(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  // Date-only → local midnight (avoids UTC-shift bugs for "Sunday")
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnly) {
    const y = parseInt(dateOnly[1], 10);
    const mo = parseInt(dateOnly[2], 10) - 1;
    const d = parseInt(dateOnly[3], 10);
    const loc = new Date(y, mo, d, 0, 0, 0, 0);
    return Number.isNaN(loc.getTime()) ? null : loc;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeCategory(value: unknown): "work" | "personal" | "learning" | null {
  const s = String(value ?? "").toLowerCase();
  if (s === "work" || s === "personal" || s === "learning") return s;
  return null;
}

export async function parseTaskFromText(rawInput: string): Promise<ParsedTask> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const openai = new OpenAI({ apiKey });
  const now = new Date();
  const nowIso = now.toISOString();
  const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const localY = now.getFullYear();
  const localM = String(now.getMonth() + 1).padStart(2, "0");
  const localD = String(now.getDate()).padStart(2, "0");
  const localDateStr = `${localY}-${localM}-${localD}`;
  const weekdayToday = weekdayNames[now.getDay()];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You extract structured task data from the user's message.

Clock context (use for ALL relative dates):
- Current instant (ISO UTC): ${nowIso}
- **Today's calendar date (local): ${localDateStr} (${weekdayToday}).**

Weekday rules (critical — users get angry if this is wrong):
- If the user says a weekday alone ("Sunday", "on Sunday", "this Sunday", "SUnday") **without** the word "next": choose the **earliest calendar date D** such that D is that weekday and **D is on or after ${localDateStr}** (same calendar day counts: if today IS that weekday, use today).
- Example: if today is Saturday ${localDateStr}, "Sunday" means the very next calendar day (Sunday), not a random Thursday.
- If they say **"next Sunday"** (explicit "next"): use the Sunday in the **week after** the week that contains today (if today is Sunday, "next Sunday" is 7 days later).
- The weekday of your deadline **must match** the weekday the user asked for.
- If no time of day is given, set **deadline to the calendar date only in form YYYY-MM-DD** (no time, no timezone letter). That encodes local midnight for that date.
- If a specific time is given, use full ISO 8601 date-time for deadline instead.

Other relative phrases: "tomorrow", "before lunch", "next Friday", "end of day" — interpret from the current instant above.

Respond ONLY with valid JSON, no markdown, no explanation.
The JSON object must have exactly these keys: "title" (string), "priority" (exactly one of: "high", "medium", "low"), "deadline" (YYYY-MM-DD for date-only at midnight, OR ISO date-time if a clock time is specified, or null if unknown), "category" (exactly one of: "work", "personal", "learning", or null if unclear).`,
      },
      { role: "user", content: rawInput },
    ],
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) {
    throw new Error("No response from AI");
  }

  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    throw new Error("AI did not return valid JSON");
  }

  if (typeof data !== "object" || data === null || !("title" in data)) {
    throw new Error("Invalid task shape from AI");
  }

  const obj = data as Record<string, unknown>;
  const title = String(obj.title ?? "").trim() || rawInput.trim().slice(0, 200);
  const priority = normalizePriority(obj.priority);
  const deadline = parseDeadline(obj.deadline);
  const category = normalizeCategory(obj.category);

  return { title, priority, deadline, category };
}

export type Recommendation = { title: string; reason: string };

export async function recommendTopTasks(
  tasks: { id: string; title: string; priority: string; deadline: Date | null; done: boolean }[],
): Promise<Recommendation[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const openai = new OpenAI({ apiKey });
  const now = new Date().toISOString();
  const open = tasks.filter((t) => !t.done);

  if (open.length === 0) {
    return [];
  }

  const payload = open.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    deadline: t.deadline ? t.deadline.toISOString() : null,
  }));

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You help prioritize work. Current time (ISO): ${now}
Given open tasks as JSON, pick the top 3 to focus on in the next few hours. Prefer urgent items and soonest deadlines.
Respond ONLY with valid JSON, no markdown, no explanation.
Return: {"items":[{"title":"exact task title from input","reason":"one short sentence"}]} — at most 3 items, only from the provided tasks (match title exactly).`,
      },
      { role: "user", content: JSON.stringify(payload) },
    ],
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("No response from AI");

  const parsed = JSON.parse(text) as { items?: { title?: string; reason?: string }[] };
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return items
    .slice(0, 3)
    .map((i) => ({
      title: String(i.title ?? ""),
      reason: String(i.reason ?? ""),
    }))
    .filter((i) => i.title.length > 0);
}

export async function generateDayPlan(
  tasks: { title: string; priority: string; deadline: Date | null }[],
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  if (tasks.length === 0) {
    return "No open tasks — enjoy a lighter day or add something meaningful.";
  }

  const openai = new OpenAI({ apiKey });
  const now = new Date().toISOString();
  const payload = tasks.map((t) => ({
    title: t.title,
    priority: t.priority,
    deadline: t.deadline ? t.deadline.toISOString() : null,
  }));

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a calm planning assistant. Current time (ISO): ${now}
Given open tasks as JSON, write a short plan for TODAY only: 5–8 bullet lines (use "- " at the start of each line).
Be concrete and kind. Plain text only — no JSON, no markdown headings.`,
      },
      { role: "user", content: JSON.stringify(payload) },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("No response from AI");
  return text;
}
