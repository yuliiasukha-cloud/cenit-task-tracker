import { DateTime } from "luxon";
import OpenAI from "openai";

export type ParsedTask = {
  title: string;
  priority: "high" | "medium" | "low";
  deadline: Date | null;
  category: "work" | "personal" | "learning" | null;
};

export type ParseTaskOptions = {
  /** IANA zone, e.g. Europe/Kyiv — from `x-vercel-ip-timezone` or TASK_PARSER_TIMEZONE. */
  timeZone?: string | null;
};

function normalizePriority(value: unknown): "high" | "medium" | "low" {
  const s = String(value ?? "").toLowerCase();
  if (s === "high" || s === "medium" || s === "low") return s;
  return "medium";
}

function safeIanaTimeZone(tz: string | undefined | null): string {
  const fallback = "UTC";
  if (!tz || !tz.trim()) return fallback;
  const z = tz.trim();
  const probe = DateTime.now().setZone(z);
  return probe.isValid ? z : fallback;
}

function hasExplicitOffsetOrZ(s: string): boolean {
  return /[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s) || /[+-]\d{4}$/.test(s);
}

/** Interpret model output as wall time in `timeZone` when no offset/Z is present. */
function parseDeadline(value: unknown, timeZone: string): Date | null {
  if (value == null || value === "") return null;
  const s0 = String(value).trim();
  const s = s0.includes("T") ? s0 : s0.replace(/^(\d{4}-\d{2}-\d{2})[ ](\d)/, "$1T$2");

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnly) {
    const y = parseInt(dateOnly[1], 10);
    const mo = parseInt(dateOnly[2], 10);
    const d = parseInt(dateOnly[3], 10);
    const dt = DateTime.fromObject({ year: y, month: mo, day: d }, { zone: timeZone }).startOf("day");
    return dt.isValid ? dt.toJSDate() : null;
  }

  if (!hasExplicitOffsetOrZ(s) && /^\d{4}-\d{2}-\d{2}T\d/.test(s)) {
    const dt = DateTime.fromISO(s, { zone: timeZone });
    return dt.isValid ? dt.toJSDate() : null;
  }

  const dt = DateTime.fromISO(s, { setZone: true });
  return dt.isValid ? dt.toJSDate() : null;
}

function normalizeCategory(value: unknown): "work" | "personal" | "learning" | null {
  const s = String(value ?? "").toLowerCase();
  if (s === "work" || s === "personal" || s === "learning") return s;
  return null;
}

export async function parseTaskFromText(rawInput: string, options?: ParseTaskOptions): Promise<ParsedTask> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const timeZone = safeIanaTimeZone(
    options?.timeZone ?? process.env.TASK_PARSER_TIMEZONE ?? undefined,
  );
  const nowZ = DateTime.now().setZone(timeZone);
  const nowIsoUtc = nowZ.toUTC().toISO() ?? nowZ.toISO()!;
  const localDateStr = nowZ.toISODate() ?? "";
  const weekdayToday = nowZ.setLocale("en").toFormat("cccc");
  const localHm = nowZ.toFormat("HH:mm");

  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You extract structured task data from the user's message.

**Timezone (critical):** All calendar dates and clock times are in IANA zone **${timeZone}**.
- "Today" means calendar date **${localDateStr}** in ${timeZone}.
- "Tomorrow" is the next calendar day after ${localDateStr} in ${timeZone}.
- Current instant (UTC, reference only): ${nowIsoUtc}
- **Right now in ${timeZone}:** ${localDateStr} (${weekdayToday}), local time **${localHm}**.

**Deadlines — match the user's words exactly:**
- If they say **"today at 1 pm"** / **"today at 1:00 PM"** / **"at 1 pm today"**: use date **${localDateStr}** and **13:00** (24h) in ${timeZone}.
- Map 12-hour times carefully: 1 pm → 13:00, 12 am → 00:00, 12 pm → 12:00.
- If **no** time of day is given, use **YYYY-MM-DD** only (that calendar day in ${timeZone}, interpreted as start of that day).
- If a **clock time** is given, use **YYYY-MM-DDTHH:mm** in 24-hour form (**no "Z"**, **no +00:00**) — that string is **wall time in ${timeZone}**, not UTC.
- Do **not** use a trailing **Z** unless the user clearly meant UTC.

Weekday rules (still critical):
- Weekday without "next": earliest that weekday **on or after** ${localDateStr} in ${timeZone}.
- **"next Sunday"** (explicit "next"): Sunday in the week **after** the week containing ${localDateStr}.

Other phrases ("before lunch", "end of day", "EOD"): interpret in ${timeZone}.

Respond ONLY with valid JSON, no markdown, no explanation.
The JSON object must have exactly these keys: "title" (string), "priority" (exactly one of: "high", "medium", "low"), "deadline" (YYYY-MM-DD for date-only, OR YYYY-MM-DDTHH:mm for wall time in ${timeZone} without Z/offset, OR null), "category" (exactly one of: "work", "personal", "learning", or null if unclear).`,
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
  const deadline = parseDeadline(obj.deadline, timeZone);
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
