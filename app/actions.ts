"use server";

import { revalidatePath } from "next/cache";

import { getPrisma } from "@/lib/prisma";
import { generateDayPlan, parseTaskFromText, recommendTopTasks } from "@/lib/parse-task";

export async function createTaskFromText(rawInput: string) {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { ok: false as const, error: "Write something first." };
  }

  try {
    const parsed = await parseTaskFromText(trimmed);
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
    return { ok: true as const };
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
