"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getPrisma } from "@/lib/prisma";
import { generateDayPlan, parseTaskFromText, recommendTopTasks } from "@/lib/parse-task";

export async function createTaskFromText(rawInput: string) {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { ok: false as const, error: "Write something first." };
  }

  try {
    const h = await headers();
    const tzFromRequest =
      h.get("x-vercel-ip-timezone") ?? h.get("x-timezone") ?? process.env.TASK_PARSER_TIMEZONE ?? null;
    const parsed = await parseTaskFromText(trimmed, { timeZone: tzFromRequest });
    await getPrisma().task.create({
      data: {
        rawInput: trimmed,
        title: parsed.title,
        priority: parsed.priority,
        deadline: parsed.deadline,
        category: parsed.category,
      },
    });
    revalidatePath("/");
    return {
      ok: true as const,
      deadline: parsed.deadline ? parsed.deadline.toISOString() : null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong.";
    return { ok: false as const, error: message };
  }
}

export async function setTaskDone(id: string, done: boolean) {
  await getPrisma().task.update({
    where: { id },
    data: {
      done,
      ...(done ? { protocolApproved: false } : {}),
    },
  });
  revalidatePath("/");
}

export async function setProtocolApproved(id: string, protocolApproved: boolean) {
  await getPrisma().task.update({
    where: { id },
    data: { protocolApproved },
  });
  revalidatePath("/");
}

export async function deleteTask(id: string) {
  await getPrisma().task.delete({ where: { id } });
  revalidatePath("/");
}

export async function updateTaskTitle(id: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) {
    return { ok: false as const, error: "Title cannot be empty." };
  }
  await getPrisma().task.update({
    where: { id },
    data: { title: trimmed.slice(0, 500) },
  });
  revalidatePath("/");
  return { ok: true as const };
}

export async function updateTaskNotes(id: string, notes: string) {
  const trimmed = notes.trim();
  await getPrisma().task.update({
    where: { id },
    data: { notes: trimmed ? trimmed.slice(0, 8000) : null },
  });
  revalidatePath("/");
}

export async function updateTaskMeta(
  id: string,
  payload: { priority: string; category: string | null; deadlineIso: string | null },
) {
  const prio = payload.priority.toLowerCase();
  if (prio !== "high" && prio !== "medium" && prio !== "low") {
    return { ok: false as const, error: "Priority must be high, medium, or low." };
  }
  const cat = payload.category?.toLowerCase().trim() || null;
  if (cat && cat !== "work" && cat !== "personal" && cat !== "learning") {
    return { ok: false as const, error: "Category must be work, personal, learning, or empty." };
  }
  let deadline: Date | null = null;
  if (payload.deadlineIso) {
    const d = new Date(payload.deadlineIso);
    if (Number.isNaN(d.getTime())) {
      return { ok: false as const, error: "Invalid deadline." };
    }
    deadline = d;
  }
  await getPrisma().task.update({
    where: { id },
    data: {
      priority: prio,
      category: cat,
      deadline,
    },
  });
  revalidatePath("/");
  return { ok: true as const };
}

export async function getWhatNowRecommendations() {
  const tasks = await getPrisma().task.findMany({
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });
  try {
    const items = await recommendTopTasks(tasks);
    return { ok: true as const, items };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not get suggestions.";
    return { ok: false as const, error: message };
  }
}

export async function getTodayPlan() {
  const tasks = await getPrisma().task.findMany({
    where: { done: false },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });
  try {
    const text = await generateDayPlan(
      tasks.map((t) => ({
        title: t.title,
        priority: t.priority,
        deadline: t.deadline,
      })),
    );
    return { ok: true as const, text };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not build today’s plan.";
    return { ok: false as const, error: message };
  }
}
