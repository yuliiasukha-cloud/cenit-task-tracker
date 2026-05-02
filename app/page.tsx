import { TaskBoard, type TaskDTO } from "@/components/TaskBoard";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { taskScopeWhere } from "@/lib/task-scope";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const rows = await getPrisma().task.findMany({
    where: taskScopeWhere(session?.user?.id),
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });

  const tasks: TaskDTO[] = rows.map((t) => ({
    id: t.id,
    rawInput: t.rawInput,
    title: t.title,
    priority: t.priority,
    deadline: t.deadline ? t.deadline.toISOString() : null,
    done: t.done,
    protocolApproved: t.protocolApproved,
    category: t.category,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
  }));

  return <TaskBoard initialTasks={tasks} />;
}
