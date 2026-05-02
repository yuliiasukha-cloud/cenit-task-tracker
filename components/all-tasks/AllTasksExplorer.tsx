"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  deleteAllCompletedTasks,
  deleteTask,
  setTaskDone,
} from "@/app/actions";
import type { TaskDTO } from "@/components/TaskBoard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "done";
type PriorityFilter = "all" | "high" | "medium" | "low";
type CategoryFilter = "all" | "work" | "personal" | "learning" | "none";
type ProtocolFilter = "all" | "yes" | "no";
type DeadlineFilter = "all" | "with" | "without";
type SortKey =
  | "deadlineAsc"
  | "deadlineDesc"
  | "createdDesc"
  | "createdAsc"
  | "priority"
  | "title";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function formatWhen(iso: string | null, empty: string) {
  if (!iso) return empty;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return empty;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function priorityPillClass(priority: string) {
  const p = priority.toLowerCase();
  if (p === "high") return "bg-[#FAECE7] text-[#993C1D]";
  if (p === "low") return "bg-[#EAF3DE] text-[#3B6D11]";
  return "bg-[#FAEEDA] text-[#BA7517]";
}

export function AllTasksExplorer({ initialTasks }: { initialTasks: TaskDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [priorityF, setPriorityF] = useState<PriorityFilter>("all");
  const [categoryF, setCategoryF] = useState<CategoryFilter>("all");
  const [protocolF, setProtocolF] = useState<ProtocolFilter>("all");
  const [deadlineF, setDeadlineF] = useState<DeadlineFilter>("all");
  const [sort, setSort] = useState<SortKey>("deadlineAsc");
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...initialTasks];
    if (status === "active") list = list.filter((t) => !t.done);
    else if (status === "done") list = list.filter((t) => t.done);
    if (priorityF !== "all") list = list.filter((t) => t.priority.toLowerCase() === priorityF);
    if (categoryF === "work") list = list.filter((t) => t.category?.toLowerCase() === "work");
    else if (categoryF === "personal") list = list.filter((t) => t.category?.toLowerCase() === "personal");
    else if (categoryF === "learning") list = list.filter((t) => t.category?.toLowerCase() === "learning");
    else if (categoryF === "none") list = list.filter((t) => !t.category?.trim());
    if (protocolF === "yes") list = list.filter((t) => t.protocolApproved);
    else if (protocolF === "no") list = list.filter((t) => !t.protocolApproved);
    if (deadlineF === "with") list = list.filter((t) => Boolean(t.deadline));
    else if (deadlineF === "without") list = list.filter((t) => !t.deadline);

    list.sort((a, b) => {
      switch (sort) {
        case "title":
          return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
        case "priority": {
          const pa = PRIORITY_ORDER[a.priority.toLowerCase()] ?? 1;
          const pb = PRIORITY_ORDER[b.priority.toLowerCase()] ?? 1;
          if (pa !== pb) return pa - pb;
          const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
          const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
          return da - db;
        }
        case "createdAsc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "createdDesc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "deadlineDesc": {
          const da = a.deadline ? new Date(a.deadline).getTime() : -Infinity;
          const db = b.deadline ? new Date(b.deadline).getTime() : -Infinity;
          return db - da;
        }
        case "deadlineAsc":
        default: {
          const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
          const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
          if (da !== db) return da - db;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      }
    });
    return list;
  }, [initialTasks, status, priorityF, categoryF, protocolF, deadlineF, sort]);

  function refresh() {
    router.refresh();
  }

  function onToggleDone(id: string, done: boolean) {
    startTransition(async () => {
      await setTaskDone(id, done);
      refresh();
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteTask(id);
      refresh();
    });
  }

  function onDeleteAllDone() {
    setBulkMsg(null);
    if (!confirm("Permanently delete all completed tasks? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deleteAllCompletedTasks();
      setBulkMsg(`Removed ${res.deleted} completed task${res.deleted === 1 ? "" : "s"}.`);
      refresh();
    });
  }

  const filterChip =
    "h-auto min-h-[40px] rounded-full px-3 py-2 text-[13px] font-medium shadow-none md:min-h-0 md:px-2.5 md:py-1 md:text-[12px]";

  return (
    <div className="mx-auto w-full max-w-[1100px] px-3 pb-20 pt-4 md:px-6 md:pt-6">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[14px] text-muted-foreground">
        <Link href="/" className="min-h-[44px] underline-offset-2 hover:text-foreground hover:underline">
          ← Home
        </Link>
      </div>
      <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-bold italic text-foreground md:text-4xl">
        All tasks
      </h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
        Every task you&apos;ve created for this account, with filters and due dates. Use this view to review and clean
        up your backlog.
      </p>

      <div className="mt-8 space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1.5">
            <span className="w-full text-[11px] font-normal uppercase tracking-wide text-muted-foreground md:w-auto md:pr-2">
              Status
            </span>
            {(
              [
                ["all", "All"],
                ["active", "Active"],
                ["done", "Done"],
              ] as const
            ).map(([k, label]) => (
              <Button
                key={k}
                type="button"
                variant={status === k ? "default" : "outline"}
                className={filterChip}
                onClick={() => setStatus(k)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="w-full text-[11px] font-normal uppercase tracking-wide text-muted-foreground md:w-auto md:pr-2">
              Priority
            </span>
            {(
              [
                ["all", "Any"],
                ["high", "High"],
                ["medium", "Medium"],
                ["low", "Low"],
              ] as const
            ).map(([k, label]) => (
              <Button
                key={k}
                type="button"
                variant={priorityF === k ? "default" : "outline"}
                className={filterChip}
                onClick={() => setPriorityF(k)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:flex-wrap md:items-start">
          <div className="flex flex-wrap gap-1.5">
            <span className="w-full text-[11px] font-normal uppercase tracking-wide text-muted-foreground md:w-auto md:pr-2">
              Category
            </span>
            {(
              [
                ["all", "Any"],
                ["work", "Work"],
                ["personal", "Personal"],
                ["learning", "Learning"],
                ["none", "Uncategorized"],
              ] as const
            ).map(([k, label]) => (
              <Button
                key={k}
                type="button"
                variant={categoryF === k ? "default" : "outline"}
                className={filterChip}
                onClick={() => setCategoryF(k)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="w-full text-[11px] font-normal uppercase tracking-wide text-muted-foreground md:w-auto md:pr-2">
              Protocol
            </span>
            {(
              [
                ["all", "Any"],
                ["yes", "On protocol"],
                ["no", "Not on protocol"],
              ] as const
            ).map(([k, label]) => (
              <Button
                key={k}
                type="button"
                variant={protocolF === k ? "default" : "outline"}
                className={filterChip}
                onClick={() => setProtocolF(k)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="w-full text-[11px] font-normal uppercase tracking-wide text-muted-foreground md:w-auto md:pr-2">
              Due date
            </span>
            {(
              [
                ["all", "Any"],
                ["with", "Has due date"],
                ["without", "No due date"],
              ] as const
            ).map(([k, label]) => (
              <Button
                key={k}
                type="button"
                variant={deadlineF === k ? "default" : "outline"}
                className={filterChip}
                onClick={() => setDeadlineF(k)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-normal uppercase tracking-wide text-muted-foreground">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="min-h-[44px] rounded-md border border-input bg-background px-3 py-2 text-[14px] text-foreground md:min-h-10"
              aria-label="Sort tasks"
            >
              <option value="deadlineAsc">Due date (soonest first)</option>
              <option value="deadlineDesc">Due date (latest first)</option>
              <option value="createdDesc">Created (newest)</option>
              <option value="createdAsc">Created (oldest)</option>
              <option value="priority">Priority</option>
              <option value="title">Title (A–Z)</option>
            </select>
          </div>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || initialTasks.filter((t) => t.done).length === 0}
            onClick={onDeleteAllDone}
            className="min-h-[44px] w-full text-[14px] sm:w-auto"
          >
            Delete all completed
          </Button>
        </div>
        {bulkMsg ? (
          <p className="text-[14px] text-muted-foreground" role="status">
            {bulkMsg}
          </p>
        ) : null}
      </div>

      <p className="mt-6 text-[14px] text-muted-foreground">
        Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
        <span className="font-medium text-foreground">{initialTasks.length}</span> tasks
      </p>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="font-[family-name:var(--font-cormorant)] text-xl font-semibold italic text-muted-foreground">
            No tasks match these filters
          </p>
          <p className="mt-2 text-[14px] text-muted-foreground">Reset filters or add tasks from the home board.</p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {filtered.map((task) => (
            <li key={task.id}>
              <Card className="overflow-hidden border-border shadow-sm">
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between md:gap-4">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <Checkbox
                      checked={task.done}
                      disabled={pending}
                      onCheckedChange={(v) => onToggleDone(task.id, v === true)}
                      className="mt-1"
                      aria-label={task.done ? "Mark not done" : "Mark done"}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[16px] font-medium leading-snug text-foreground",
                          task.done && "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[13px] italic text-muted-foreground">{task.rawInput}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline" className={cn("font-normal", priorityPillClass(task.priority))}>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className="font-normal">
                          {task.category?.trim() ? task.category : "No category"}
                        </Badge>
                        {task.protocolApproved ? (
                          <Badge variant="secondary" className="font-normal">
                            On protocol
                          </Badge>
                        ) : null}
                      </div>
                      <dl className="mt-3 grid gap-1 text-[13px] text-muted-foreground sm:grid-cols-2">
                        <div>
                          <dt className="inline font-medium text-foreground">Due: </dt>
                          <dd className="inline">{formatWhen(task.deadline, "—")}</dd>
                        </div>
                        <div>
                          <dt className="inline font-medium text-foreground">Created: </dt>
                          <dd className="inline">{formatWhen(task.createdAt, "—")}</dd>
                        </div>
                        {task.calendarDate ? (
                          <div className="sm:col-span-2">
                            <dt className="inline font-medium text-foreground">Plan day: </dt>
                            <dd className="inline">{formatWhen(task.calendarDate, "—")}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-row gap-2 md:flex-col">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      asChild
                      className="min-h-[44px] flex-1 md:flex-none"
                    >
                      <Link href="/">Open board</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => onDelete(task.id)}
                      className="min-h-[44px] flex-1 text-destructive hover:text-destructive md:flex-none"
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
