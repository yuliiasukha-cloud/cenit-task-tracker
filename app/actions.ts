"use server";

import { revalidatePath } from "next/cache";

import { getPrisma } from "@/lib/prisma";
import { parseTaskFromText, recommendTopTasks } from "@/lib/parse-task";

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
