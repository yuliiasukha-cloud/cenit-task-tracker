import type { Metadata } from "next";

import { AllTasksExplorer } from "@/components/all-tasks/AllTasksExplorer";
import type { TaskDTO } from "@/components/TaskBoard";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { taskScopeWhere } from "@/lib/task-scope";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All tasks · Cénit",
  description: "Review every task, filter by status and due date, and clean up your backlog.",
};

export default async function AllTasksPage() {
  const session = await auth();
  const rows = await getPrisma().task.findMany({
    where: taskScopeWhere(session?.user?.id),
    orderBy: [{ createdAt: "desc" }],
  });

  const tasks: TaskDTO[] = rows.map((t) => ({
    id: t.id,
    rawInput: t.rawInput,
    title: t.title,
    priority: t.priority,
    deadline: t.deadline ? t.deadline.toISOString() : null,
    calendarDate: t.calendarDate ? t.calendarDate.toISOString() : null,
    done: t.done,
    protocolApproved: t.protocolApproved,
    category: t.category,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
  }));

  return <AllTasksExplorer initialTasks={tasks} />;
}
