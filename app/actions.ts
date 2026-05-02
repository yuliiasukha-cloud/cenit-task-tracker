"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { taskByIdScopeWhere, taskScopeWhere } from "@/lib/task-scope";
import { generateDayPlan, parseTaskFromText, recommendTopTasks } from "@/lib/parse-task";

export async function createTaskFromText(rawInput: string) {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { ok: false as const, error: "Write something first." };
  }

  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;
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
        userId,
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
  const session = await auth();
  const r = await getPrisma().task.updateMany({
    where: taskByIdScopeWhere(id, session?.user?.id),
    data: {
      done,
      ...(done ? { protocolApproved: false } : {}),
    },
  });
  if (r.count) revalidatePath("/");
}

export async function setProtocolApproved(id: string, protocolApproved: boolean) {
  const session = await auth();
  const r = await getPrisma().task.updateMany({
    where: taskByIdScopeWhere(id, session?.user?.id),
    data: { protocolApproved },
  });
  if (r.count) revalidatePath("/");
}

export async function deleteTask(id: string) {
  const session = await auth();
  const r = await getPrisma().task.deleteMany({
    where: taskByIdScopeWhere(id, session?.user?.id),
  });
  if (r.count) revalidatePath("/");
}

export async function updateTaskTitle(id: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) {
    return { ok: false as const, error: "Title cannot be empty." };
  }
  const session = await auth();
  const r = await getPrisma().task.updateMany({
    where: taskByIdScopeWhere(id, session?.user?.id),
    data: { title: trimmed.slice(0, 500) },
  });
  if (r.count) revalidatePath("/");
  return r.count ? ({ ok: true as const } as const) : ({ ok: false as const, error: "Task not found." } as const);
}

export async function updateTaskNotes(id: string, notes: string) {
  const trimmed = notes.trim();
  const session = await auth();
  const r = await getPrisma().task.updateMany({
    where: taskByIdScopeWhere(id, session?.user?.id),
    data: { notes: trimmed ? trimmed.slice(0, 8000) : null },
  });
  if (r.count) revalidatePath("/");
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
  const session = await auth();
  const r = await getPrisma().task.updateMany({
    where: taskByIdScopeWhere(id, session?.user?.id),
    data: {
      priority: prio,
      category: cat,
      deadline,
    },
  });
  if (r.count) revalidatePath("/");
  return r.count ? ({ ok: true as const } as const) : ({ ok: false as const, error: "Task not found." } as const);
}

export async function getWhatNowRecommendations() {
  const session = await auth();
  const tasks = await getPrisma().task.findMany({
    where: taskScopeWhere(session?.user?.id),
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
  const session = await auth();
  const tasks = await getPrisma().task.findMany({
    where: { done: false, ...taskScopeWhere(session?.user?.id) },
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
