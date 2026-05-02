"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import {
  createTaskFromText,
  deleteTask,
  getTodayPlan,
  getWhatNowRecommendations,
  setProtocolApproved,
  setTaskDone,
  updateTaskNotes,
  updateTaskTitle,
} from "@/app/actions";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";

export type TaskDTO = {
  id: string;
  rawInput: string;
  title: string;
  priority: string;
  deadline: string | null;
  done: boolean;
  protocolApproved: boolean;
  category: string | null;
  notes: string | null;
  createdAt: string;
};

/** Cormorant bold italic — Today’s protocol, From your list. */
const SECTION_HEADING_CLASS =
  "font-[family-name:var(--font-cormorant)] text-[1.35rem] font-bold italic leading-tight text-[#2F4156] sm:text-[1.5rem]";

/** DM Sans column eyebrow — YOUR TASKS / YOUR PROTOCOL. */
const COLUMN_EYEBROW_CLASS =
  "mb-2 font-[family-name:var(--font-dm-sans)] text-[9px] font-normal uppercase tracking-[3px] text-[#9BAFC0]";

/** Meaning-based lanes for Today’s protocol (glow = beauty/morning, body = health, etc.). */
type ProtocolLane = "glow" | "body" | "work" | "nourish" | "rest";

const PROTOCOL_LANE: Record<
  ProtocolLane,
  { dot: string; accent: string; tint: string; chipBg: string; chipText: string; label: string }
> = {
  glow: {
    dot: "#D9A8BE",
    accent: "#A67D92",
    tint: "rgba(217, 168, 190, 0.2)",
    chipBg: "#F5E6EE",
    chipText: "#7A5A6E",
    label: "Beauty",
  },
  body: {
    dot: "#8CC9A8",
    accent: "#5A9E7A",
    tint: "rgba(140, 201, 168, 0.2)",
    chipBg: "#E4F4EC",
    chipText: "#3D6B52",
    label: "Health",
  },
  work: {
    dot: "#9BB9E8",
    accent: "#6A88C4",
    tint: "rgba(155, 185, 232, 0.22)",
    chipBg: "#E8EFFA",
    chipText: "#4A5F8C",
    label: "Work",
  },
  nourish: {
    dot: "#EBB59A",
    accent: "#C4896E",
    tint: "rgba(235, 181, 154, 0.22)",
    chipBg: "#FDEDE4",
    chipText: "#85604A",
    label: "Nourish",
  },
  rest: {
    dot: "#B4BDD4",
    accent: "#8B95AE",
    tint: "rgba(180, 189, 212, 0.22)",
    chipBg: "#ECEEF6",
    chipText: "#5A6178",
    label: "Rest",
  },
};

/** Editable demo protocol — category drives dot + chip colors. */
export type ProtocolCategoryKey =
  | "Morning"
  | "Fitness"
  | "Work"
  | "Nutrition"
  | "Rest"
  | "Mind"
  | "Social"
  | "Beauty"
  | "Health";

const PROTOCOL_CATEGORY_OPTIONS: ProtocolCategoryKey[] = [
  "Morning",
  "Fitness",
  "Work",
  "Nutrition",
  "Rest",
  "Mind",
  "Social",
  "Beauty",
  "Health",
];

const PROTOCOL_CATEGORY_STYLES: Record<
  ProtocolCategoryKey,
  { dot: string; accent: string; chipBg: string; chipText: string; short: string }
> = {
  Morning: {
    dot: "#E8C89A",
    accent: "#C4A574",
    chipBg: "#FDF6EA",
    chipText: "#7A623D",
    short: "Morning",
  },
  Fitness: {
    dot: "#8CC9A8",
    accent: "#5A9E7A",
    chipBg: "#E4F4EC",
    chipText: "#3D6B52",
    short: "Fitness",
  },
  Work: {
    dot: "#9BB9E8",
    accent: "#6A88C4",
    chipBg: "#E8EFFA",
    chipText: "#4A5F8C",
    short: "Work",
  },
  Nutrition: {
    dot: "#EBB59A",
    accent: "#C4896E",
    chipBg: "#FDEDE4",
    chipText: "#85604A",
    short: "Nutrition",
  },
  Rest: {
    dot: "#B4BDD4",
    accent: "#8B95AE",
    chipBg: "#ECEEF6",
    chipText: "#5A6178",
    short: "Rest",
  },
  Mind: {
    dot: "#C9B8E8",
    accent: "#8B7BA8",
    chipBg: "#F0ECFA",
    chipText: "#5A4D6E",
    short: "Mind",
  },
  Social: {
    dot: "#E8B4C8",
    accent: "#B87D96",
    chipBg: "#FDEDF3",
    chipText: "#6B4558",
    short: "Social",
  },
  Beauty: {
    dot: "#D9A8BE",
    accent: "#A67D92",
    chipBg: "#F5E6EE",
    chipText: "#7A5A6E",
    short: "Beauty",
  },
  Health: {
    dot: "#7BC4BE",
    accent: "#4A9490",
    chipBg: "#E4F5F3",
    chipText: "#2F5E5A",
    short: "Health",
  },
};

type DemoProtocolBlock = {
  id: string;
  time: string;
  activity: string;
  protocolCategory: ProtocolCategoryKey;
  note: string;
};

const INITIAL_DEMO_PROTOCOL: DemoProtocolBlock[] = [
  {
    id: "pb-1",
    time: "07:00",
    activity: "Morning sunlight & walk",
    protocolCategory: "Morning",
    note: "Morning light · skincare prep",
  },
  {
    id: "pb-2",
    time: "07:30",
    activity: "Strength training",
    protocolCategory: "Fitness",
    note: "Movement · vitality",
  },
  {
    id: "pb-3",
    time: "09:00",
    activity: "Deep work",
    protocolCategory: "Work",
    note: "Focus · career",
  },
  {
    id: "pb-4",
    time: "12:00",
    activity: "Lunch + walk",
    protocolCategory: "Nutrition",
    note: "Fuel · digestion",
  },
  {
    id: "pb-5",
    time: "13:00",
    activity: "Focused work",
    protocolCategory: "Work",
    note: "Projects · output",
  },
  {
    id: "pb-6",
    time: "18:00",
    activity: "Dinner",
    protocolCategory: "Nutrition",
    note: "Evening meal · unwind",
  },
  {
    id: "pb-7",
    time: "21:30",
    activity: "Wind-down",
    protocolCategory: "Rest",
    note: "Sleep · nervous system",
  },
];

type FeelingOption = "exhausted" | "tired" | "good" | "energised";

const FEELING_OPTIONS: { key: FeelingOption; emoji: string; label: string; hint: string }[] = [
  { key: "exhausted", emoji: "😴", label: "Exhausted", hint: "We've lightened your protocol for today." },
  { key: "tired", emoji: "😐", label: "Tired", hint: "We've eased the pace slightly — listen to your body." },
  { key: "good", emoji: "🙂", label: "Good", hint: "Your protocol stays aligned with your plan." },
  { key: "energised", emoji: "⚡", label: "Energised", hint: "Full protocol ahead — make the most of it." },
];

function newProtocolBlockId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `pb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function startOfWeekMonday(reference = new Date()) {
  const ref = new Date(reference);
  ref.setHours(12, 0, 0, 0);
  const day = ref.getDay();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - (day === 0 ? 6 : day - 1));
  return monday;
}

function weekDaysMondayFirst(reference = new Date()) {
  const monday = startOfWeekMonday(reference);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function priorityBarColor(priority: string) {
  const p = priority.toLowerCase();
  if (p === "high") return "#E24B4A";
  if (p === "low") return "#3B6D11";
  return "#C17F24";
}

function priorityPillClass(priority: string) {
  const p = priority.toLowerCase();
  if (p === "high") return "bg-[#FAECE7] text-[#993C1D]";
  if (p === "low") return "bg-[#EAF3DE] text-[#3B6D11]";
  return "bg-[#FAEEDA] text-[#BA7517]";
}

function priorityShortLabel(priority: string) {
  const p = priority.toLowerCase();
  if (p === "high") return "High";
  if (p === "low") return "Low";
  return "Medium";
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function compareDeadlineThenCreated(a: TaskDTO, b: TaskDTO) {
  if (a.deadline && b.deadline) {
    const t = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    if (t !== 0) return t;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
  if (a.deadline && !b.deadline) return -1;
  if (!a.deadline && b.deadline) return 1;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function comparePriorityThenDeadline(a: TaskDTO, b: TaskDTO) {
  const pa = PRIORITY_ORDER[a.priority.toLowerCase()] ?? 1;
  const pb = PRIORITY_ORDER[b.priority.toLowerCase()] ?? 1;
  if (pa !== pb) return pa - pb;
  return compareDeadlineThenCreated(a, b);
}

function taskCategoryChip(category: string | null | undefined) {
  if (!category) return null;
  const c = category.toLowerCase();
  const map: Record<string, { bg: string; text: string; label: string }> = {
    work: { bg: "#E8EFFA", text: "#4A5F8C", label: "Work" },
    personal: { bg: "#F0ECFA", text: "#5A4D6E", label: "Personal" },
    learning: { bg: "#E4F5F3", text: "#2F5E5A", label: "Learning" },
  };
  return map[c] ?? null;
}

function formatDeadline(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** Time column for protocol rows (deadline time or em dash). */
function formatProtocolTime(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Parse "HH:MM" / "H:MM" for timeline ordering (minutes from midnight). */
function protocolTimeToMinutes(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return 24 * 60;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return h * 60 + min;
}

function compareProtocolTimeStrings(a: string, b: string): number {
  return protocolTimeToMinutes(a) - protocolTimeToMinutes(b);
}

function priorityToProtocolLane(priority: string): ProtocolLane {
  const p = priority.toLowerCase();
  if (p === "low") return "rest";
  if (p === "high") return "work";
  return "body";
}

function isOverdue(deadline: string | null, done: boolean) {
  if (done || !deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

function SectionDivider() {
  return (
    <div className="py-2" role="presentation">
      <div className="h-[0.5px] w-full bg-[#EEF3F7]" />
    </div>
  );
}

function ProtocolRow({
  timeLabel,
  title,
  subtitle,
  lane,
  chipLabel,
  rightAction,
}: {
  timeLabel: string;
  title: string;
  subtitle: string;
  lane: ProtocolLane;
  /** When set, shown instead of lane name in the chip (e.g. priority). */
  chipLabel?: string;
  rightAction?: ReactNode;
}) {
  const laneStyle = PROTOCOL_LANE[lane];
  const chip = chipLabel ?? laneStyle.label;
  return (
    <li className="pb-3 last:pb-0">
      <div className="flex gap-3 rounded-lg border border-[#EEF3F7] bg-transparent py-2 pl-2 pr-2">
        <div
          className="w-[2.75rem] shrink-0 pt-0.5 text-right text-[11px] font-medium leading-none"
          style={{ color: laneStyle.accent }}
        >
          {timeLabel}
        </div>
        <div className="flex w-4 shrink-0 justify-center pt-1">
          <span
            className="h-2 w-2 shrink-0 rounded-full opacity-90"
            style={{ backgroundColor: laneStyle.dot }}
          />
        </div>
        <div className="min-w-0 flex-1 pt-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[13px] font-medium leading-snug text-[#2F4156]" style={{ fontWeight: 500 }}>
              {title}
            </p>
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide"
              style={{
                backgroundColor: laneStyle.chipBg,
                color: laneStyle.chipText,
              }}
            >
              {chip}
            </span>
          </div>
          <div className="mt-1 flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 text-[10px] font-normal leading-snug text-[#567C8D]" style={{ fontWeight: 400 }}>
              {subtitle}
            </p>
            {rightAction ? <div className="shrink-0">{rightAction}</div> : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function DemoProtocolTimelineBlock({
  block,
  isEditing,
  draft,
  setDraft,
  isExiting,
  onRequestEdit,
  onDelete,
  onSave,
  onCancel,
}: {
  block: DemoProtocolBlock;
  isEditing: boolean;
  draft: DemoProtocolBlock | null;
  setDraft: Dispatch<SetStateAction<DemoProtocolBlock | null>>;
  isExiting: boolean;
  onRequestEdit: () => void;
  onDelete: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const cat = isEditing && draft ? draft.protocolCategory : block.protocolCategory;
  const style = PROTOCOL_CATEGORY_STYLES[cat];

  return (
    <li
      className={cn(
        "pb-3 transition-opacity duration-150 last:pb-0",
        isExiting ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      {!isEditing ? (
        <div
          role="button"
          tabIndex={0}
          onClick={onRequestEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onRequestEdit();
            }
          }}
          className="group relative flex cursor-pointer gap-3 rounded-lg border border-[#EEF3F7] bg-transparent py-2 pl-2 pr-2 transition-colors duration-150 hover:bg-[#FAFAFA]/80"
        >
          <button
            type="button"
            aria-label="Remove block"
            className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full text-[14px] leading-none text-[#9BAFC0] opacity-0 transition-opacity duration-150 hover:bg-[#F5EFEB] hover:text-[#567C8D] group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            ×
          </button>
          <div
            className="w-[2.75rem] shrink-0 pt-0.5 text-right text-[11px] font-medium leading-none"
            style={{ color: style.accent }}
          >
            {block.time}
          </div>
          <div className="flex w-4 shrink-0 justify-center pt-1">
            <span
              className="h-2 w-2 shrink-0 rounded-full opacity-90 transition-colors duration-150"
              style={{ backgroundColor: style.dot }}
            />
          </div>
          <div className="min-w-0 flex-1 pr-6 pt-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-[13px] font-medium leading-snug text-[#2F4156]" style={{ fontWeight: 500 }}>
                {block.activity}
              </p>
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide transition-colors duration-150"
                style={{
                  backgroundColor: style.chipBg,
                  color: style.chipText,
                }}
              >
                {style.short}
              </span>
            </div>
            {block.note ? (
              <p className="mt-1 text-[10px] font-normal leading-snug text-[#567C8D]" style={{ fontWeight: 400 }}>
                {block.note}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        draft && (
          <div className="flex flex-col gap-3 rounded-lg border border-[#567C8D] bg-white/60 py-3 pl-2 pr-3 ring-1 ring-[#567C8D]/90 transition-[border-color,box-shadow] duration-150">
            <div className="flex flex-wrap gap-3 sm:flex-nowrap">
              <label className="flex min-w-[6.5rem] flex-col gap-0.5">
                <span className="text-[9px] font-normal uppercase tracking-wide text-[#9BAFC0]">Time</span>
                <input
                  type="time"
                  value={draft.time.length >= 5 ? draft.time.slice(0, 5) : draft.time}
                  onChange={(e) => setDraft((d) => (d ? { ...d, time: e.target.value } : d))}
                  className="rounded-md border border-[#EEF3F7] bg-white px-2 py-1.5 text-[12px] text-[#2F4156]"
                  style={{ fontWeight: 400 }}
                />
              </label>
              <label className="min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[9px] font-normal uppercase tracking-wide text-[#9BAFC0]">Activity</span>
                <input
                  type="text"
                  value={draft.activity}
                  onChange={(e) => setDraft((d) => (d ? { ...d, activity: e.target.value } : d))}
                  className="w-full rounded-md border border-[#EEF3F7] bg-white px-2 py-1.5 text-[13px] text-[#2F4156]"
                  style={{ fontWeight: 400 }}
                  placeholder="Activity name"
                />
              </label>
            </div>
            <label className="flex flex-col gap-0.5">
              <span className="text-[9px] font-normal uppercase tracking-wide text-[#9BAFC0]">Category</span>
              <select
                value={draft.protocolCategory}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, protocolCategory: e.target.value as ProtocolCategoryKey } : d,
                  )
                }
                className="rounded-md border border-[#EEF3F7] bg-white px-2 py-1.5 text-[13px] text-[#2F4156]"
                style={{ fontWeight: 400 }}
              >
                {PROTOCOL_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-[9px] font-normal uppercase tracking-wide text-[#9BAFC0]">Note</span>
              <textarea
                value={draft.note}
                onChange={(e) => setDraft((d) => (d ? { ...d, note: e.target.value } : d))}
                rows={2}
                className="resize-y rounded-md border border-[#EEF3F7] bg-white px-2 py-1.5 text-[12px] leading-relaxed text-[#2F4156]"
                style={{ fontWeight: 400 }}
                placeholder="Optional note"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-0.5">
              <Button
                type="button"
                className="h-auto rounded-md bg-[#3A8D84] px-3 py-1.5 text-[12px] font-medium text-white shadow-none hover:bg-[#328a7a]"
                style={{ fontWeight: 500 }}
                onClick={onSave}
              >
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto rounded-md border-[#C8D9E6] bg-transparent px-3 py-1.5 text-[12px] font-medium text-[#567C8D] hover:bg-[#F5EFEB]"
                style={{ fontWeight: 500 }}
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        )
      )}
    </li>
  );
}

function FeelingCheckInRow({
  feeling,
  onFeelingChange,
}: {
  feeling: FeelingOption | null;
  onFeelingChange: (key: FeelingOption) => void;
}) {
  const feelingHint = feeling ? FEELING_OPTIONS.find((f) => f.key === feeling)?.hint : null;
  return (
    <div className="bg-transparent">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-[11px] font-normal text-[#9BAFC0]" style={{ fontWeight: 400 }}>
          How are you feeling?
        </span>
        <div className="flex items-center gap-0.5">
          {FEELING_OPTIONS.map(({ key, emoji, label }) => (
            <button
              key={key}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={feeling === key}
              onClick={() => onFeelingChange(key)}
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[14px] leading-none transition-opacity",
                feeling === key
                  ? "bg-white/50 opacity-100 ring-1 ring-[#E3EBF2]"
                  : "opacity-45 hover:bg-white/30 hover:opacity-80",
              )}
            >
              <span aria-hidden>{emoji}</span>
            </button>
          ))}
        </div>
      </div>
      {feelingHint ? (
        <p
          className="mt-1 line-clamp-1 text-[9px] font-normal leading-tight text-[#9BAFC0]/85"
          style={{ fontWeight: 400 }}
        >
          {feelingHint}
        </p>
      ) : null}
    </div>
  );
}

function TodaysProtocolColumn({
  protocolTasks,
  onRemoveFromProtocol,
  pending,
}: {
  protocolTasks: TaskDTO[];
  onRemoveFromProtocol: (id: string) => void;
  pending: boolean;
}) {
  const [demoBlocks, setDemoBlocks] = useState<DemoProtocolBlock[]>(() => [...INITIAL_DEMO_PROTOCOL]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DemoProtocolBlock | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());
  const newlyCreatedIdsRef = useRef<Set<string>>(new Set());

  const startEdit = useCallback((block: DemoProtocolBlock) => {
    setEditingId(block.id);
    setDraft({ ...block });
  }, []);

  const cancelEdit = useCallback(() => {
    const id = editingId;
    const d = draft;
    if (id && d && newlyCreatedIdsRef.current.has(id) && !d.activity.trim()) {
      setDemoBlocks((bs) => bs.filter((b) => b.id !== id));
      newlyCreatedIdsRef.current.delete(id);
    }
    setEditingId(null);
    setDraft(null);
  }, [draft, editingId]);

  const saveEdit = useCallback(() => {
    if (!editingId || !draft) return;
    const time = draft.time.trim() || "09:00";
    const activity = draft.activity.trim() || "Untitled";
    setDemoBlocks((bs) =>
      bs.map((b) => (b.id === editingId ? { ...draft, time, activity, note: draft.note.trim() } : b)),
    );
    newlyCreatedIdsRef.current.delete(editingId);
    setEditingId(null);
    setDraft(null);
  }, [draft, editingId]);

  const removeBlock = useCallback((id: string) => {
    setExitingIds((s) => new Set(s).add(id));
    window.setTimeout(() => {
      newlyCreatedIdsRef.current.delete(id);
      setDemoBlocks((bs) => bs.filter((b) => b.id !== id));
      setExitingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      setEditingId((cur) => (cur === id ? null : cur));
      setDraft((d) => (d && d.id === id ? null : d));
    }, 150);
  }, []);

  const addBlock = useCallback(() => {
    const id = newProtocolBlockId();
    newlyCreatedIdsRef.current.add(id);
    const next: DemoProtocolBlock = {
      id,
      time: "09:00",
      activity: "",
      protocolCategory: "Morning",
      note: "",
    };
    setDemoBlocks((bs) => [...bs, next]);
    setEditingId(id);
    setDraft({ ...next });
  }, []);

  const sortedDemoBlocks = useMemo(
    () =>
      [...demoBlocks].sort((a, b) => {
        const d = compareProtocolTimeStrings(a.time, b.time);
        if (d !== 0) return d;
        return a.id.localeCompare(b.id);
      }),
    [demoBlocks],
  );

  return (
    <aside className="flex min-w-0 flex-[2] basis-0 flex-col lg:sticky lg:top-4 lg:self-start lg:pl-8">
      <p className={COLUMN_EYEBROW_CLASS}>Your protocol</p>
      <h2 className={cn(SECTION_HEADING_CLASS, "mb-4")}>Today&apos;s protocol</h2>

      <ul className="m-0 list-none space-y-0 p-0">
        {sortedDemoBlocks.map((block) => (
          <DemoProtocolTimelineBlock
            key={block.id}
            block={block}
            isEditing={editingId === block.id}
            draft={draft}
            setDraft={setDraft}
            isExiting={exitingIds.has(block.id)}
            onRequestEdit={() => {
              if (editingId && editingId !== block.id) {
                cancelEdit();
              }
              startEdit(block);
            }}
            onDelete={() => removeBlock(block.id)}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        ))}
      </ul>

      <div className="mt-3">
        <button
          type="button"
          onClick={addBlock}
          className="text-[12px] font-medium text-[#3A8D84] underline-offset-2 transition-opacity duration-150 hover:opacity-80"
          style={{ fontWeight: 500 }}
        >
          + Add to your protocol
        </button>
      </div>

      {protocolTasks.length > 0 ? (
        <div className="mt-6 border-t border-[#EEF3F7] pt-5">
          <h3 className={cn(SECTION_HEADING_CLASS, "mb-3")}>From your list</h3>
          <p className="mb-3 text-[11px] font-normal leading-snug text-[#567C8D]" style={{ fontWeight: 400 }}>
            Approve active tasks below — they appear here and stay in sync with your list.
          </p>
          <ul className="m-0 list-none space-y-0 p-0">
            {protocolTasks.map((task) => {
              const lane = priorityToProtocolLane(task.priority);
              return (
                <ProtocolRow
                  key={task.id}
                  timeLabel={formatProtocolTime(task.deadline)}
                  title={task.title}
                  subtitle={task.rawInput.length > 80 ? `${task.rawInput.slice(0, 80)}…` : task.rawInput}
                  lane={lane}
                  chipLabel={priorityShortLabel(task.priority)}
                  rightAction={
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => onRemoveFromProtocol(task.id)}
                      className="h-auto px-2 py-0 text-[10px] font-normal text-[#9BAFC0] hover:bg-transparent hover:text-[#567C8D]"
                      style={{ fontWeight: 400 }}
                    >
                      Remove
                    </Button>
                  }
                />
              );
            })}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}

type Filter = "all" | "active" | "done";

type TaskSortBy = "deadline" | "priority" | "created";

export function TaskBoard({ initialTasks }: { initialTasks: TaskDTO[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<TaskSortBy>("deadline");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reco, setReco] = useState<{ title: string; reason: string }[] | null>(null);
  const [recoError, setRecoError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [titleEditError, setTitleEditError] = useState<string | null>(null);
  const [notesExpandedId, setNotesExpandedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [planText, setPlanText] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [feeling, setFeeling] = useState<FeelingOption | null>(null);

  const tasks = initialTasks;

  const weekDays = useMemo(() => weekDaysMondayFirst(new Date()), []);
  const today = useMemo(() => new Date(), []);

  const visible = useMemo(() => {
    if (filter === "active") return tasks.filter((t) => !t.done);
    if (filter === "done") return tasks.filter((t) => t.done);
    return tasks;
  }, [tasks, filter]);

  const sortedVisible = useMemo(() => {
    const list = [...visible];
    if (sortBy === "deadline") list.sort(compareDeadlineThenCreated);
    else if (sortBy === "priority") list.sort(comparePriorityThenDeadline);
    else list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [visible, sortBy]);

  const activeCount = tasks.filter((t) => !t.done).length;
  const hasAnyTasks = tasks.length > 0;

  const protocolTasks = useMemo(
    () =>
      [...tasks]
        .filter((t) => t.protocolApproved && !t.done)
        .sort((a, b) => {
          if (a.deadline && b.deadline) {
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          }
          if (a.deadline) return -1;
          if (b.deadline) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
    [tasks],
  );

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const text = input.trim();
    if (!text) return;

    startTransition(async () => {
      const res = await createTaskFromText(text);
      if (res.ok) {
        setInput("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function onToggleDone(id: string, done: boolean) {
    startTransition(async () => {
      await setTaskDone(id, done);
      router.refresh();
    });
  }

  function removeTask(id: string) {
    startTransition(async () => {
      await deleteTask(id);
      router.refresh();
    });
  }

  function toggleProtocolApproved(id: string, approved: boolean) {
    startTransition(async () => {
      await setProtocolApproved(id, approved);
      router.refresh();
    });
  }

  function onWhatNowAndPlan() {
    setReco(null);
    setRecoError(null);
    setPlanError(null);
    setPlanText(null);
    startTransition(async () => {
      const [recoRes, planRes] = await Promise.all([getWhatNowRecommendations(), getTodayPlan()]);
      if (recoRes.ok) {
        setReco(recoRes.items);
      } else {
        setRecoError(recoRes.error);
      }
      if (planRes.ok) {
        setPlanText(planRes.text);
      } else {
        setPlanError(planRes.error);
      }
    });
  }

  function beginTitleEdit(task: TaskDTO) {
    if (task.done) return;
    setEditingTitleId(task.id);
    setTitleDraft(task.title);
    setTitleEditError(null);
    setNotesExpandedId(null);
  }

  function cancelTitleEdit() {
    setEditingTitleId(null);
    setTitleEditError(null);
  }

  function saveTitle(taskId: string) {
    setTitleEditError(null);
    startTransition(async () => {
      const res = await updateTaskTitle(taskId, titleDraft);
      if (res.ok) {
        setEditingTitleId(null);
        router.refresh();
      } else {
        setTitleEditError(res.error);
      }
    });
  }

  function toggleNotesPanel(task: TaskDTO) {
    if (notesExpandedId === task.id) {
      setNotesExpandedId(null);
    } else {
      setNotesExpandedId(task.id);
      setNotesDraft(task.notes ?? "");
    }
  }

  function saveNotesForTask(taskId: string) {
    startTransition(async () => {
      await updateTaskNotes(taskId, notesDraft);
      setNotesExpandedId(null);
      router.refresh();
    });
  }

  const showAllDoneCelebration = hasAnyTasks && activeCount === 0 && filter !== "done";

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-10 pt-2 sm:px-6 sm:pt-3">
      <section className="py-0.5">
        <div className="flex justify-between gap-1 overflow-x-auto pb-0 sm:gap-2 sm:pb-0.5">
          {weekDays.map((d, i) => {
            const isToday = isSameDay(d, today);
            return (
              <div
                key={d.toISOString()}
                className="flex min-w-[2.75rem] flex-1 flex-col items-center gap-1 text-center sm:min-w-0"
              >
                <span
                  className="text-[9px] font-normal uppercase tracking-wide text-[#A9B8C9]"
                  style={{ fontWeight: 400 }}
                >
                  {WEEKDAY_SHORT[i]}
                </span>
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center text-[13px] font-medium leading-none",
                    isToday
                      ? "rounded-full bg-[#567C8D] text-white"
                      : "rounded-full text-[#5F7082]",
                  )}
                  style={{ fontWeight: 500 }}
                >
                  {d.getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <SectionDivider />

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div className="flex min-h-0 min-w-0 flex-[3] basis-0 flex-col gap-6 lg:border-r lg:border-[#EEF3F7] lg:pr-8">
          <section className="flex flex-col gap-6 py-0">
        <FeelingCheckInRow feeling={feeling} onFeelingChange={setFeeling} />
        <p className={COLUMN_EYEBROW_CLASS}>Your tasks</p>
        <form onSubmit={onAdd} className="flex flex-col gap-6">
          <Textarea
            id="task-input"
            name="task"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What do you need to do today? Write it like you'd tell a friend..."
            aria-label="New task"
            className="min-h-[72px] resize-y rounded-[12px] border-[#EEF3F7] bg-white px-4 py-3 text-[15px] font-normal leading-relaxed text-[#2F4156] shadow-none placeholder:text-[#9BAFC0] placeholder:opacity-90 focus-visible:border-[#C8D9E6] focus-visible:ring-1 focus-visible:ring-[#C8D9E6] focus-visible:ring-offset-0 disabled:opacity-60 md:text-[15px]"
            style={{ fontWeight: 400 }}
            disabled={pending}
          />
          {error ? (
            <p className="text-[13px] font-normal text-[#E24B4A]" style={{ fontWeight: 400 }}>
              {error}
            </p>
          ) : null}
          <div className="flex flex-col items-start gap-2">
            <Button
              type="submit"
              disabled={pending || !input.trim()}
              className="h-auto w-auto self-start rounded-[8px] border-0 bg-[#2F4156] text-[14px] font-medium text-white shadow-none hover:bg-[#2F4156]/95 hover:opacity-100 disabled:opacity-45"
              style={{ fontWeight: 500, padding: "10px 24px" }}
            >
              {pending ? "Adding…" : "Add task"}
            </Button>
            <button
              type="button"
              disabled={pending || !hasAnyTasks}
              onClick={onWhatNowAndPlan}
              className="border-0 bg-transparent p-0 text-left text-[13px] font-normal text-[#567C8D] shadow-none hover:underline disabled:cursor-not-allowed disabled:opacity-45 disabled:no-underline"
              style={{ fontWeight: 400 }}
            >
              What should I do now?
            </button>
          </div>
        </form>

        {recoError ? (
          <p className="text-[13px] text-[#E24B4A]" style={{ fontWeight: 400 }}>
            {recoError}
          </p>
        ) : null}
        {reco && reco.length > 0 ? (
          <Card
            className="rounded-[12px] border-0 bg-[#F5EFEB] shadow-none"
            aria-live="polite"
          >
            <CardContent className="p-4 sm:p-5">
              <h3 className="font-[family-name:var(--font-cormorant)] text-[20px] font-normal italic text-[#2F4156]">
                Top picks for right now
              </h3>
              <ol
                className="mt-4 list-decimal space-y-3 pl-5 text-[14px] leading-relaxed text-[#2F4156]"
                style={{ fontWeight: 400 }}
              >
                {reco.map((item, idx) => (
                  <li key={`${item.title}-${idx}`}>
                    <span className="font-medium" style={{ fontWeight: 500 }}>
                      {item.title}
                    </span>
                    <span className="text-[#567C8D]"> — {item.reason}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ) : null}
        {planError ? (
          <p className="text-[13px] text-[#E24B4A]" style={{ fontWeight: 400 }}>
            {planError}
          </p>
        ) : null}
        {planText ? (
          <Card
            className="rounded-[12px] border-0 bg-[#ECEEF6] shadow-none"
            aria-live="polite"
          >
            <CardContent className="p-4 sm:p-5">
              <h3 className="font-[family-name:var(--font-cormorant)] text-[20px] font-normal italic text-[#2F4156]">
                Today’s plan
              </h3>
              <p
                className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-[#2F4156]"
                style={{ fontWeight: 400 }}
              >
                {planText}
              </p>
            </CardContent>
          </Card>
        ) : null}
          </section>

          <section className="flex min-h-0 flex-1 flex-col gap-6 py-0">
        {hasAnyTasks ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", "All"],
                  ["active", "Active"],
                  ["done", "Done"],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  variant="ghost"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "h-auto rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.6px] shadow-none hover:bg-transparent",
                    filter === key
                      ? "bg-[#F5EFEB] font-medium text-[#2F4156] hover:bg-[#F5EFEB] hover:text-[#2F4156]"
                      : "font-normal text-[#9BAFC0] hover:text-[#567C8D]",
                  )}
                  style={{ fontWeight: filter === key ? 500 : 400 }}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[10px] font-normal uppercase tracking-[0.8px] text-[#9BAFC0]" style={{ fontWeight: 400 }}>
                Sort
              </span>
              {(
                [
                  ["deadline", "Deadline"],
                  ["priority", "Priority"],
                  ["created", "Newest"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSortBy(key)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-normal transition-colors",
                    sortBy === key
                      ? "font-medium text-[#2F4156]"
                      : "text-[#9BAFC0] hover:text-[#567C8D]",
                  )}
                  style={{ fontWeight: sortBy === key ? 500 : 400 }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 lg:max-h-[calc(100dvh-16rem)] lg:overflow-y-auto lg:pr-1">
          {!hasAnyTasks ? (
            <Card className="rounded-[12px] border-[#EEF3F7] bg-[#F5EFEB]/40 shadow-none">
              <CardContent className="px-6 py-12 text-center sm:px-8">
                <p className="font-[family-name:var(--font-cormorant)] text-[26px] font-normal italic leading-snug text-[#2F4156]">
                  Your day is a blank canvas
                </p>
                <p
                  className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-[#567C8D]"
                  style={{ fontWeight: 400 }}
                >
                  Add your first task above — write it like you&apos;d tell a friend
                </p>
              </CardContent>
            </Card>
          ) : showAllDoneCelebration ? (
            <Card className="rounded-[12px] border-[#EEF3F7] bg-white shadow-[0_2px_24px_rgba(47,65,86,0.06)]">
              <CardContent className="px-6 py-12 text-center sm:px-8">
                <p className="font-[family-name:var(--font-cormorant)] text-[28px] font-normal italic text-[#2F4156]">
                  All done 🎉
                </p>
                <p className="mt-3 text-[14px] text-[#567C8D]" style={{ fontWeight: 400 }}>
                  Switch to &quot;Done&quot; to review, or add something new.
                </p>
              </CardContent>
            </Card>
          ) : visible.length === 0 ? (
            <Card className="rounded-[12px] border border-dashed border-[#EEF3F7] bg-[#F5EFEB]/30 shadow-none">
              <CardContent className="px-6 py-10 text-center sm:px-8">
                <p className="font-[family-name:var(--font-cormorant)] text-[20px] italic text-[#567C8D]">
                  Nothing in this view
                </p>
                <p className="mt-2 text-[13px] text-[#9BAFC0]" style={{ fontWeight: 400 }}>
                  Try another filter.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {sortedVisible.map((task) => {
                const overdue = isOverdue(task.deadline, task.done);
                const bar = priorityBarColor(task.priority);
                const deadlineLabel = formatDeadline(task.deadline);
                const cat = taskCategoryChip(task.category);

                return (
                  <li key={task.id}>
                    <Card
                      className={cn(
                        "group flex overflow-hidden rounded-[12px] border-[0.5px] border-[#EEF3F7] p-0 shadow-[0_2px_20px_rgba(47,65,86,0.05)] transition",
                        task.done && "opacity-60",
                        overdue && !task.done && "ring-1 ring-[#FAECE7]",
                      )}
                    >
                      <div
                        className="w-[3px] shrink-0 self-stretch"
                        style={{ backgroundColor: bar }}
                        aria-hidden
                      />

                      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:pr-3">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <div className="mt-0.5 flex shrink-0 items-start pt-0.5">
                            <Checkbox
                              checked={task.done}
                              onCheckedChange={(v) => onToggleDone(task.id, v === true)}
                              aria-label={`Mark done: ${task.title}`}
                              className="h-[22px] w-[22px] rounded-full border-[1.5px] border-[#C8D9E6] bg-white text-white shadow-none ring-offset-0 focus-visible:ring-[#C8D9E6] data-[state=checked]:border-[#3A8D84] data-[state=checked]:bg-[#3A8D84] data-[state=checked]:text-white data-[state=unchecked]:bg-white [&_svg]:h-2.5 [&_svg]:w-2.5"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            {editingTitleId === task.id ? (
                              <div className="flex flex-col gap-2">
                                <input
                                  type="text"
                                  value={titleDraft}
                                  onChange={(e) => setTitleDraft(e.target.value)}
                                  disabled={pending}
                                  className="w-full rounded-[8px] border border-[#EEF3F7] bg-white px-3 py-2 text-[15px] font-medium leading-snug text-[#2F4156] focus-visible:border-[#C8D9E6] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C8D9E6]"
                                  style={{ fontWeight: 500 }}
                                  aria-label="Edit task title"
                                />
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={pending}
                                    onClick={() => saveTitle(task.id)}
                                    className="h-auto rounded-[8px] bg-[#2F4156] px-3 py-1.5 text-[12px] text-white"
                                    style={{ fontWeight: 500 }}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={pending}
                                    onClick={cancelTitleEdit}
                                    className="h-auto px-3 py-1.5 text-[12px] text-[#567C8D]"
                                    style={{ fontWeight: 500 }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                                {titleEditError ? (
                                  <p className="text-[12px] text-[#E24B4A]" style={{ fontWeight: 400 }}>
                                    {titleEditError}
                                  </p>
                                ) : null}
                              </div>
                            ) : task.done ? (
                              <p
                                className="text-[15px] font-medium leading-snug text-[#2F4156] line-through"
                                style={{ fontWeight: 500 }}
                              >
                                {task.title}
                              </p>
                            ) : (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => beginTitleEdit(task)}
                                className="w-full text-left text-[15px] font-medium leading-snug text-[#2F4156] hover:underline disabled:opacity-60"
                                style={{ fontWeight: 500 }}
                              >
                                {task.title}
                              </button>
                            )}
                            <p
                              className="mt-1 line-clamp-2 text-[13px] italic leading-relaxed text-[#9BAFC0]"
                              style={{ fontWeight: 400 }}
                            >
                              {task.rawInput}
                            </p>
                            <div className="mt-2">
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => toggleNotesPanel(task)}
                                className="text-[12px] font-normal text-[#567C8D] underline decoration-[#C8D9E6] underline-offset-2 hover:text-[#2F4156]"
                                style={{ fontWeight: 400 }}
                              >
                                {notesExpandedId === task.id
                                  ? "Close note"
                                  : task.notes
                                    ? "Edit note"
                                    : "Add note"}
                              </button>
                              {notesExpandedId === task.id ? (
                                <div className="mt-2 flex flex-col gap-2">
                                  <Textarea
                                    value={notesDraft}
                                    onChange={(e) => setNotesDraft(e.target.value)}
                                    rows={3}
                                    disabled={pending}
                                    placeholder="Your note…"
                                    className="resize-y rounded-[10px] border-[#EEF3F7] text-[13px] text-[#2F4156]"
                                    style={{ fontWeight: 400 }}
                                    aria-label="Task note"
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={pending}
                                      onClick={() => saveNotesForTask(task.id)}
                                      className="h-auto rounded-[8px] bg-[#2F4156] px-3 py-1.5 text-[12px] text-white"
                                      style={{ fontWeight: 500 }}
                                    >
                                      Save note
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      disabled={pending}
                                      onClick={() => setNotesExpandedId(null)}
                                      className="h-auto px-3 py-1.5 text-[12px] text-[#567C8D]"
                                      style={{ fontWeight: 500 }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : task.notes ? (
                                <p
                                  className="mt-1 line-clamp-4 whitespace-pre-wrap text-[13px] leading-relaxed text-[#567C8D]"
                                  style={{ fontWeight: 400 }}
                                >
                                  {task.notes}
                                </p>
                              ) : null}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {!task.done ? (
                                <Button
                                  type="button"
                                  variant={task.protocolApproved ? "secondary" : "outline"}
                                  disabled={pending}
                                  onClick={() => toggleProtocolApproved(task.id, !task.protocolApproved)}
                                  className={cn(
                                    "h-auto rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide shadow-none",
                                    task.protocolApproved
                                      ? "border-[#567C8D] bg-[#F5EFEB] text-[#2F4156] hover:bg-[#F5EFEB]"
                                      : "border-[#C8D9E6] text-[#567C8D] hover:bg-[#F5EFEB]/60",
                                  )}
                                  style={{ fontWeight: 500 }}
                                >
                                  {task.protocolApproved ? "On protocol" : "Add to protocol"}
                                </Button>
                              ) : null}
                              {deadlineLabel ? (
                                <Badge
                                  variant="secondary"
                                  className="rounded-full border-0 bg-[#F5EFEB] px-2.5 py-1 text-[11px] font-normal text-[#567C8D] hover:bg-[#F5EFEB]"
                                  style={{ fontWeight: 400 }}
                                >
                                  {deadlineLabel}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="rounded-full border-0 bg-[#F5EFEB] px-2.5 py-1 text-[11px] font-normal text-[#9BAFC0] hover:bg-[#F5EFEB]"
                                  style={{ fontWeight: 400 }}
                                >
                                  No deadline
                                </Badge>
                              )}
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "rounded-full border-0 px-2.5 py-1 text-[11px] font-medium hover:bg-opacity-100",
                                  priorityPillClass(task.priority),
                                )}
                                style={{ fontWeight: 500 }}
                              >
                                {priorityShortLabel(task.priority)}
                              </Badge>
                              {cat ? (
                                <Badge
                                  variant="secondary"
                                  className="rounded-full border-0 px-2.5 py-1 text-[11px] font-medium hover:bg-opacity-100"
                                  style={{
                                    fontWeight: 500,
                                    backgroundColor: cat.bg,
                                    color: cat.text,
                                  }}
                                >
                                  {cat.label}
                                </Badge>
                              ) : null}
                              {overdue && !task.done ? (
                                <span
                                  className="text-[11px] font-medium text-[#E24B4A]"
                                  style={{ fontWeight: 500 }}
                                >
                                  Overdue
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeTask(task.id)}
                          className="h-auto shrink-0 self-start px-1 py-0 pt-0.5 text-[12px] font-normal text-[#9BAFC0] hover:bg-transparent hover:text-[#567C8D]"
                          style={{ fontWeight: 400 }}
                        >
                          Delete
                        </Button>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
          </section>
        </div>

        <TodaysProtocolColumn
          protocolTasks={protocolTasks}
          pending={pending}
          onRemoveFromProtocol={(id) => toggleProtocolApproved(id, false)}
        />
      </div>
    </div>
  );
}
