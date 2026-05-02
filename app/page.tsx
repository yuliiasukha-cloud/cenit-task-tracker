import { TaskBoard, type TaskDTO } from "@/components/TaskBoard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rows = await getPrisma().task.findMany({
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
    createdAt: t.createdAt.toISOString(),
  }));

  return <TaskBoard initialTasks={tasks} />;
}
