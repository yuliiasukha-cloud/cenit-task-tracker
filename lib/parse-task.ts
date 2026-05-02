import OpenAI from "openai";

export type ParsedTask = {
  title: string;
  priority: "high" | "medium" | "low";
  deadline: Date | null;
};

function normalizePriority(value: unknown): "high" | "medium" | "low" {
  const s = String(value ?? "").toLowerCase();
  if (s === "high" || s === "medium" || s === "low") return s;
  return "medium";
}

function parseDeadline(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function parseTaskFromText(rawInput: string): Promise<ParsedTask> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const openai = new OpenAI({ apiKey });
  const now = new Date().toISOString();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You extract structured task data from the user's message. Current date and time (ISO 8601): ${now}
Interpret relative phrases like "tomorrow", "before lunch", "next Friday", "end of day" using this current moment.
Respond ONLY with valid JSON, no markdown, no explanation.
The JSON object must have exactly these keys: "title" (string), "priority" (exactly one of: "high", "medium", "low"), "deadline" (ISO 8601 date-time string, or null if unknown).`,
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

  return { title, priority, deadline };
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
