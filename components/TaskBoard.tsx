"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Mic,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import type { Session } from "next-auth";
import { useRouter } from "next/navigation";
import { useCallback, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import {
  createTaskFromText,
  deleteTask,
  exportProtocolDayToGoogleCalendar,
  getTodayPlan,
  getWhatNowRecommendations,
  setProtocolApproved,
  setTaskDone,
  updateTaskMeta,
  updateTaskNotes,
  updateTaskTitle,
} from "@/app/actions";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

import { taskOnCalendarDay } from "@/lib/task-calendar-day";
import { useTaskVoiceInput } from "@/lib/use-task-voice-input";
import { cn } from "@/lib/utils";

export type TaskDTO = {
  id: string;
  rawInput: string;
  title: string;
  priority: string;
  deadline: string | null;
  /** When set (and no deadline), task is tied to this calendar day in list + protocol. */
  calendarDate: string | null;
  done: boolean;
  protocolApproved: boolean;
  category: string | null;
  notes: string | null;
  createdAt: string;
};

/** Cormorant bold italic — Today’s protocol, From your list. */
const SECTION_HEADING_CLASS =
  "font-[family-name:var(--font-cormorant)] text-[1.35rem] font-bold italic leading-tight text-[#2F4156] md:text-[1.5rem]";

/** DM Sans column eyebrow — YOUR TASKS / YOUR PROTOCOL. */
const COLUMN_EYEBROW_CLASS =
  "mb-2 font-[family-name:var(--font-dm-sans)] text-[14px] font-normal uppercase tracking-[3px] text-[#9BAFC0] md:text-[9px]";

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
  | "Health"
  | "Other";

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
  "Other",
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
  Other: {
    dot: "#A8B4C4",
    accent: "#6B7B8F",
    chipBg: "#EEF2F6",
    chipText: "#4A5568",
    short: "Other",
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

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, delta: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
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

function isoToDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function datetimeLocalValueToIso(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const DETAILS_SELECT_CLASS =
  "mt-0.5 w-full max-w-full rounded-[8px] border border-[#EEF3F7] bg-white px-3 py-2.5 text-[16px] text-[#2F4156] md:max-w-[260px] md:px-2 md:py-1.5 min-[640px]:text-[13px]";

/** 24h HH:MM for protocol calendar column (matches demo block times). */
function formatProtocolTime24(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function taskDeadlineToSortMinutes(deadline: string | null): number {
  if (!deadline) return 24 * 60 + 59;
  const d = new Date(deadline);
  return d.getHours() * 60 + d.getMinutes();
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
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return false;
  /** Date-only deadlines (local midnight) stay valid through that calendar day. */
  const isStartOfDay =
    d.getHours() === 0 &&
    d.getMinutes() === 0 &&
    d.getSeconds() === 0 &&
    d.getMilliseconds() === 0;
  const limit = isStartOfDay
    ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
    : d;
  return limit.getTime() < Date.now();
}

function SectionDivider() {
  return (
    <div className="py-2" role="presentation">
      <div className="h-[0.5px] w-full bg-[#EEF3F7]" />
    </div>
  );
}

function ProtocolPaneIcon() {
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF3F7] ring-1 ring-[#E3EBF2]"
      aria-hidden
    >
      <ClipboardList className="h-3.5 w-3.5 text-[#567C8D]" strokeWidth={2} />
    </span>
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
      <div className="flex gap-2 rounded-lg border border-[#EEF3F7] bg-transparent py-1.5 pl-1.5 pr-1.5 md:gap-3 md:py-2 md:pl-2 md:pr-2">
        <div
          className="w-10 shrink-0 pt-0.5 text-right text-[14px] font-medium leading-none md:w-[2.75rem] md:text-[11px]"
          style={{ color: laneStyle.accent }}
        >
          {timeLabel}
        </div>
        <div className="flex w-3 shrink-0 justify-center pt-1 md:w-4">
          <span
            className="h-2 w-2 shrink-0 rounded-full opacity-90"
            style={{ backgroundColor: laneStyle.dot }}
          />
        </div>
        <div className="min-w-0 flex-1 pt-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[14px] font-medium leading-snug text-[#2F4156] md:text-[13px]" style={{ fontWeight: 500 }}>
              {title}
            </p>
            <span
              className="rounded-full px-2 py-0.5 text-[12px] font-medium uppercase tracking-wide md:text-[9px]"
              style={{
                backgroundColor: laneStyle.chipBg,
                color: laneStyle.chipText,
              }}
            >
              {chip}
            </span>
          </div>
          <div className="mt-1 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <p className="min-w-0 flex-1 text-[14px] font-normal leading-snug text-[#567C8D] md:text-[10px]" style={{ fontWeight: 400 }}>
              {subtitle}
            </p>
            {rightAction ? <div className="shrink-0 self-start md:self-auto">{rightAction}</div> : null}
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
          className="group relative flex cursor-pointer gap-2 rounded-lg border border-[#EEF3F7] bg-transparent py-1.5 pl-1.5 pr-1.5 transition-colors duration-150 hover:bg-[#FAFAFA]/80 md:gap-3 md:py-2 md:pl-2 md:pr-2"
        >
          <button
            type="button"
            aria-label="Remove block"
            className="absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full text-[15px] leading-none text-[#9BAFC0] opacity-100 transition-opacity duration-150 hover:bg-[#F5EFEB] hover:text-[#567C8D] md:h-6 md:w-6 md:text-[14px] md:opacity-0 md:group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            ×
          </button>
          <div
            className="w-10 shrink-0 pt-0.5 text-right text-[14px] font-medium leading-none md:w-[2.75rem] md:text-[11px]"
            style={{ color: style.accent }}
          >
            {block.time}
          </div>
          <div className="flex w-3 shrink-0 justify-center pt-1 md:w-4">
            <span
              className="h-2 w-2 shrink-0 rounded-full opacity-90 transition-colors duration-150"
              style={{ backgroundColor: style.dot }}
            />
          </div>
          <div className="min-w-0 flex-1 pr-6 pt-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-[14px] font-medium leading-snug text-[#2F4156] md:text-[13px]" style={{ fontWeight: 500 }}>
                {block.activity}
              </p>
              <span
                className="rounded-full px-2 py-0.5 text-[12px] font-medium uppercase tracking-wide transition-colors duration-150 md:text-[9px]"
                style={{
                  backgroundColor: style.chipBg,
                  color: style.chipText,
                }}
              >
                {style.short}
              </span>
            </div>
            {block.note ? (
              <p className="mt-1 text-[14px] font-normal leading-snug text-[#567C8D] md:text-[10px]" style={{ fontWeight: 400 }}>
                {block.note}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        draft && (
          <div className="flex flex-col gap-3 rounded-lg border border-[#567C8D] bg-white/60 py-3 pl-2 pr-3 ring-1 ring-[#567C8D]/90 transition-[border-color,box-shadow] duration-150">
            <div className="flex flex-wrap gap-3 md:flex-nowrap">
              <label className="flex min-w-[6.5rem] flex-col gap-0.5">
                <span className="text-[9px] font-normal uppercase tracking-wide text-[#9BAFC0]">Time</span>
                <input
                  type="time"
                  value={draft.time.length >= 5 ? draft.time.slice(0, 5) : draft.time}
                  onChange={(e) => setDraft((d) => (d ? { ...d, time: e.target.value } : d))}
                  className="rounded-md border border-[#EEF3F7] bg-white px-2 py-2 text-[16px] text-[#2F4156] md:py-1.5 min-[640px]:text-[12px]"
                  style={{ fontWeight: 400 }}
                />
              </label>
              <label className="min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[9px] font-normal uppercase tracking-wide text-[#9BAFC0]">Activity</span>
                <input
                  type="text"
                  value={draft.activity}
                  onChange={(e) => setDraft((d) => (d ? { ...d, activity: e.target.value } : d))}
                  className="w-full rounded-md border border-[#EEF3F7] bg-white px-2 py-2 text-[16px] text-[#2F4156] md:py-1.5 min-[640px]:text-[13px]"
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
                className="rounded-md border border-[#EEF3F7] bg-white px-2 py-2.5 text-[16px] text-[#2F4156] md:py-1.5 min-[640px]:text-[13px]"
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
                className="resize-y rounded-md border border-[#EEF3F7] bg-white px-2 py-2 text-[16px] leading-relaxed text-[#2F4156] md:py-1.5 min-[640px]:text-[12px]"
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
        <span className="text-[14px] font-normal text-[#9BAFC0] md:text-[11px]" style={{ fontWeight: 400 }}>
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
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[18px] leading-none transition-opacity md:h-6 md:w-6 md:text-[14px]",
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
          className="mt-1 line-clamp-2 text-[14px] font-normal leading-tight text-[#9BAFC0]/85 md:line-clamp-1 md:text-[9px]"
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
  selectedDay,
  initialDemoBlocks,
  googleExportEnabled,
  onExportToGoogleCalendar,
  googleExportMessage,
  googleExportError,
}: {
  protocolTasks: TaskDTO[];
  onRemoveFromProtocol: (id: string) => void;
  pending: boolean;
  selectedDay: Date;
  /** Per calendar day: sample routine only for “today”; empty for other days until user adds blocks. */
  initialDemoBlocks: DemoProtocolBlock[];
  googleExportEnabled: boolean;
  onExportToGoogleCalendar?: () => void;
  googleExportMessage?: string | null;
  googleExportError?: string | null;
}) {
  const [demoBlocks, setDemoBlocks] = useState<DemoProtocolBlock[]>(() => [...initialDemoBlocks]);
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

  type MergedEntry =
    | { kind: "demo"; key: string; sortMin: number; block: DemoProtocolBlock }
    | { kind: "task"; key: string; sortMin: number; task: TaskDTO };

  const mergedTimeline = useMemo(() => {
    const entries: MergedEntry[] = [];
    for (const block of sortedDemoBlocks) {
      entries.push({
        kind: "demo",
        key: `demo-${block.id}`,
        sortMin: protocolTimeToMinutes(block.time),
        block,
      });
    }
    for (const task of protocolTasks) {
      entries.push({
        kind: "task",
        key: `task-${task.id}`,
        sortMin: taskDeadlineToSortMinutes(task.deadline),
        task,
      });
    }
    entries.sort((a, b) => {
      if (a.sortMin !== b.sortMin) return a.sortMin - b.sortMin;
      return a.key.localeCompare(b.key);
    });
    return entries;
  }, [sortedDemoBlocks, protocolTasks]);

  const viewingActualToday = isSameDay(selectedDay, new Date());
  const protocolTitle = viewingActualToday
    ? "Today's protocol"
    : `Protocol — ${selectedDay.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}`;

  return (
    <aside className="flex w-full min-w-0 flex-col border-t border-[#EEF3F7] pt-6 mt-6 md:mt-0 md:flex-[2] md:basis-0 md:border-t-0 md:pt-0 md:pl-8 md:sticky md:top-4 md:self-start">
      <p className={COLUMN_EYEBROW_CLASS}>Your protocol</p>
      <div className="mb-4 flex items-center gap-2.5">
        <ProtocolPaneIcon />
        <h2 className={cn(SECTION_HEADING_CLASS, "mb-0 leading-tight")}>{protocolTitle}</h2>
      </div>

      <ul className="m-0 list-none space-y-0 p-0">
        {mergedTimeline.map((entry) => {
          if (entry.kind === "demo") {
            const block = entry.block;
            return (
              <DemoProtocolTimelineBlock
                key={entry.key}
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
            );
          }
          const task = entry.task;
          const lane = priorityToProtocolLane(task.priority);
          return (
            <ProtocolRow
              key={entry.key}
              timeLabel={formatProtocolTime24(task.deadline)}
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
                  className="h-auto min-h-[44px] px-3 py-2 text-[11px] font-normal text-[#9BAFC0] hover:bg-transparent hover:text-[#567C8D] md:min-h-0 md:px-2 md:py-0 md:text-[10px]"
                  style={{ fontWeight: 400 }}
                >
                  Remove
                </Button>
              }
            />
          );
        })}
      </ul>

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={addBlock}
          className="text-[12px] font-medium text-[#3A8D84] underline-offset-2 transition-opacity duration-150 hover:opacity-80"
          style={{ fontWeight: 500 }}
        >
          + Add to your protocol
        </button>
        {googleExportEnabled && onExportToGoogleCalendar ? (
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onExportToGoogleCalendar}
              className="h-auto min-h-[44px] w-full max-w-xs rounded-[8px] border-[#C8D9E6] text-[13px] font-medium text-[#2F4156] shadow-none hover:bg-[#F8FAFC]"
            >
              Add this day to Google Calendar
            </Button>
            {googleExportError ? (
              <p className="text-[12px] leading-snug text-[#E24B4A]" style={{ fontWeight: 400 }}>
                {googleExportError}
              </p>
            ) : null}
            {googleExportMessage ? (
              <p className="text-[12px] leading-snug text-[#567C8D]" style={{ fontWeight: 400 }}>
                {googleExportMessage}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

type Filter = "all" | "active" | "done";

type TaskSortBy = "deadline" | "priority" | "created";

export function TaskBoard({
  initialTasks,
  session,
}: {
  initialTasks: TaskDTO[];
  session: Session | null;
}) {
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
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [notesExpandedId, setNotesExpandedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [planText, setPlanText] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [feeling, setFeeling] = useState<FeelingOption | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));
  const [googleExportBanner, setGoogleExportBanner] = useState<{
    dayKey: string;
    msg: string | null;
    err: string | null;
  } | null>(null);

  const selectedDayKey = useMemo(() => {
    const d = startOfDay(selectedDay);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [selectedDay]);

  const initialDemoBlocksForDay = useMemo(
    () => (isSameDay(selectedDay, new Date()) ? [...INITIAL_DEMO_PROTOCOL] : []),
    [selectedDay],
  );

  const googleExportMsg =
    googleExportBanner?.dayKey === selectedDayKey ? googleExportBanner.msg : null;
  const googleExportErr =
    googleExportBanner?.dayKey === selectedDayKey ? googleExportBanner.err : null;
  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null);
  const [detailsPriority, setDetailsPriority] = useState("medium");
  const [detailsCategory, setDetailsCategory] = useState("");
  const [detailsDeadlineLocal, setDetailsDeadlineLocal] = useState("");
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsFocusField, setDetailsFocusField] = useState<"deadline" | "priority" | "category" | null>(null);
  const detailsDeadlineInputRef = useRef<HTMLInputElement>(null);
  const detailsPrioritySelectRef = useRef<HTMLSelectElement>(null);
  const detailsCategorySelectRef = useRef<HTMLSelectElement>(null);

  const appendVoiceTranscript = useCallback((text: string) => {
    if (!text) return;
    setInput((prev) => {
      const p = prev.trimEnd();
      return p ? `${p} ${text}` : text;
    });
  }, []);

  const {
    listening: voiceListening,
    supported: voiceSupported,
    voiceError,
    toggle: toggleVoiceInput,
    clearVoiceError,
  } = useTaskVoiceInput(appendVoiceTranscript);

  const tasks = initialTasks;

  const weekDays = useMemo(() => weekDaysMondayFirst(selectedDay), [selectedDay]);
  const weekStripRef = useRef<HTMLDivElement>(null);
  const skipNextWeekStripScroll = useRef(true);

  useLayoutEffect(() => {
    const root = weekStripRef.current;
    if (!root) return;
    if (skipNextWeekStripScroll.current) {
      skipNextWeekStripScroll.current = false;
      return;
    }
    const el = root.querySelector<HTMLElement>('[aria-pressed="true"]');
    el?.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
  }, [selectedDay]);

  useLayoutEffect(() => {
    if (!detailsTaskId || detailsFocusField === null) return;
    const field = detailsFocusField;
    const id = requestAnimationFrame(() => {
      if (field === "deadline") detailsDeadlineInputRef.current?.focus();
      else if (field === "priority") detailsPrioritySelectRef.current?.focus();
      else detailsCategorySelectRef.current?.focus();
      setDetailsFocusField(null);
    });
    return () => cancelAnimationFrame(id);
  }, [detailsTaskId, detailsFocusField]);

  const visible = useMemo(() => {
    if (filter === "active") return tasks.filter((t) => !t.done);
    if (filter === "done") return tasks.filter((t) => t.done);
    return tasks;
  }, [tasks, filter]);

  const visibleForSelectedDay = useMemo(
    () => visible.filter((t) => taskOnCalendarDay(t, selectedDay)),
    [visible, selectedDay],
  );

  const sortedVisible = useMemo(() => {
    const list = [...visibleForSelectedDay];
    if (sortBy === "deadline") list.sort(compareDeadlineThenCreated);
    else if (sortBy === "priority") list.sort(comparePriorityThenDeadline);
    else list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [visibleForSelectedDay, sortBy]);

  const activeCount = tasks.filter((t) => !t.done).length;
  const hasAnyTasks = tasks.length > 0;
  /** Every task in the app is done — full “all done” moment. */
  const allTasksComplete = hasAnyTasks && activeCount === 0;
  /** Everything in the current list (this day + filter) is done, but work may exist on other days. */
  const allVisibleTasksComplete =
    sortedVisible.length > 0 && sortedVisible.every((t) => t.done);

  const protocolTasksAll = useMemo(
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

  const protocolTasks = useMemo(
    () => protocolTasksAll.filter((t) => taskOnCalendarDay(t, selectedDay)),
    [protocolTasksAll, selectedDay],
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
      if (approved) {
        const t = tasks.find((x) => x.id === id);
        if (t?.deadline) {
          setSelectedDay(startOfDay(new Date(t.deadline)));
        }
      }
      await setProtocolApproved(
        id,
        approved,
        approved ? startOfDay(selectedDay).toISOString() : null,
      );
      router.refresh();
    });
  }

  function exportThisDayToGoogleCalendar() {
    const dayKey = selectedDayKey;
    const dayIso = startOfDay(selectedDay).toISOString();
    setGoogleExportBanner({ dayKey, msg: null, err: null });
    startTransition(async () => {
      const tz =
        typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
      const res = await exportProtocolDayToGoogleCalendar(dayIso, tz);
      if (res.ok) {
        setGoogleExportBanner({
          dayKey,
          msg: `Created ${res.created} event${res.created === 1 ? "" : "s"} in Google Calendar.`,
          err: null,
        });
      } else {
        setGoogleExportBanner({ dayKey, msg: null, err: res.error });
      }
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
      setInsightsOpen(true);
    });
  }

  function beginTitleEdit(task: TaskDTO) {
    if (task.done) return;
    setEditingTitleId(task.id);
    setTitleDraft(task.title);
    setTitleEditError(null);
    setNotesExpandedId(null);
    setDetailsTaskId(null);
  }

  function cancelTitleEdit() {
    setEditingTitleId(null);
    setTitleEditError(null);
  }

  function saveTitle(taskId: string) {
    setTitleEditError(null);
    setIsSavingTitle(true);
    startTransition(async () => {
      try {
        const res = await updateTaskTitle(taskId, titleDraft);
        if (res.ok) {
          setEditingTitleId(null);
          router.refresh();
        } else {
          setTitleEditError(res.error);
        }
      } finally {
        setIsSavingTitle(false);
      }
    });
  }

  function toggleNotesPanel(task: TaskDTO) {
    if (notesExpandedId === task.id) {
      setNotesExpandedId(null);
    } else {
      setNotesExpandedId(task.id);
      setNotesDraft(task.notes ?? "");
      setDetailsTaskId(null);
    }
  }

  function openTaskDetailsSection(task: TaskDTO, section: "deadline" | "priority" | "category") {
    if (task.done) return;
    setDetailsTaskId(task.id);
    setDetailsPriority(task.priority.toLowerCase());
    setDetailsCategory(task.category?.toLowerCase() ?? "");
    setDetailsDeadlineLocal(isoToDatetimeLocalValue(task.deadline));
    setDetailsError(null);
    setNotesExpandedId(null);
    setEditingTitleId(null);
    setDetailsFocusField(section);
  }

  function saveDetailsForTask(taskId: string) {
    setDetailsError(null);
    startTransition(async () => {
      const catRaw = detailsCategory.trim().toLowerCase();
      const cat = catRaw === "" ? null : catRaw;
      const res = await updateTaskMeta(taskId, {
        priority: detailsPriority,
        category: cat,
        deadlineIso: datetimeLocalValueToIso(detailsDeadlineLocal),
      });
      if (res.ok) {
        setDetailsTaskId(null);
        router.refresh();
      } else {
        setDetailsError(res.error);
      }
    });
  }

  function saveNotesForTask(taskId: string) {
    startTransition(async () => {
      await updateTaskNotes(taskId, notesDraft);
      setNotesExpandedId(null);
      router.refresh();
    });
  }

  const showAllDoneCelebration =
    filter !== "done" && (allTasksComplete || allVisibleTasksComplete);

  function focusNewTaskInput() {
    const el = document.getElementById("task-input");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => (el as HTMLTextAreaElement | null)?.focus(), 280);
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] overflow-x-clip px-3 pb-24 pt-2 md:px-6 md:pb-10 md:pt-3">
      <section className="py-0.5 -mx-1 px-1 md:mx-0 md:px-0" aria-label="Week calendar">
        <div className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-2">
          <div className="flex min-w-0 flex-1 items-stretch gap-1 md:gap-2">
            <button
              type="button"
              aria-label="Previous week"
              onClick={() => setSelectedDay(startOfDay(addDays(selectedDay, -7)))}
              className="flex h-auto min-h-[44px] w-9 shrink-0 items-center justify-center rounded-lg border border-[#EEF3F7] bg-white text-[#567C8D] transition hover:bg-[#F8FAFC] hover:text-[#2F4156] md:min-h-0 md:w-8"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
            </button>
            <div
              ref={weekStripRef}
              className="flex min-w-0 flex-1 gap-2 overflow-x-auto overscroll-x-contain pb-2 pt-0.5 [-webkit-overflow-scrolling:touch] md:justify-between md:overflow-x-visible md:pb-0.5 md:pt-0"
            >
              {weekDays.map((d, i) => {
                const isToday = isSameDay(d, new Date());
                const isSelected = isSameDay(d, selectedDay);
                const label = `${WEEKDAY_SHORT[i]} ${d.getDate()}`;
                return (
                  <button
                    key={`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
                    type="button"
                    onClick={() => setSelectedDay(startOfDay(d))}
                    aria-pressed={isSelected}
                    aria-label={`View tasks for ${label}`}
                    className="flex min-h-[44px] min-w-[2.75rem] shrink-0 snap-center flex-col items-center justify-center gap-0.5 text-center md:min-h-0 md:min-w-0 md:flex-1 md:snap-none md:gap-1"
                  >
                    <span
                      className="text-[9px] font-normal uppercase tracking-wide text-[#A9B8C9]"
                      style={{ fontWeight: 400 }}
                    >
                      {WEEKDAY_SHORT[i]}
                    </span>
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center text-[14px] font-medium leading-none transition-colors md:h-7 md:w-7 md:text-[13px]",
                        isSelected
                          ? "rounded-full bg-[#2F4156] text-white"
                          : isToday
                            ? "rounded-full bg-[#567C8D] text-white"
                            : "rounded-full text-[#5F7082] hover:bg-[#F5EFEB]",
                      )}
                      style={{ fontWeight: 500 }}
                    >
                      {d.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-label="Next week"
              onClick={() => setSelectedDay(startOfDay(addDays(selectedDay, 7)))}
              className="flex h-auto min-h-[44px] w-9 shrink-0 items-center justify-center rounded-lg border border-[#EEF3F7] bg-white text-[#567C8D] transition hover:bg-[#F8FAFC] hover:text-[#2F4156] md:min-h-0 md:w-8"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} aria-hidden />
            </button>
          </div>
          <Button
            type="button"
            variant={isSameDay(selectedDay, new Date()) ? "secondary" : "default"}
            onClick={() => setSelectedDay(startOfDay(new Date()))}
            className={cn(
              "h-auto min-h-[44px] w-full shrink-0 rounded-full px-4 py-2.5 text-[14px] font-semibold shadow-none md:min-h-0 md:w-auto md:self-center md:px-4 md:py-1.5 md:text-[13px]",
              isSameDay(selectedDay, new Date())
                ? "border border-[#EEF3F7] bg-[#F5EFEB] text-[#567C8D] hover:bg-[#F5EFEB]"
                : "border-0 bg-[#2F4156] text-white hover:bg-[#2F4156]/95",
            )}
            style={{ fontWeight: 600 }}
          >
            Today
          </Button>
        </div>
      </section>

      <SectionDivider />

      <div className="mt-6 flex min-w-0 flex-col gap-6 md:mt-8 md:flex-row md:items-start md:gap-8 lg:gap-10">
        <div className="flex min-h-0 w-full min-w-0 flex-col gap-6 md:flex-[3] md:basis-0 md:border-r md:border-[#EEF3F7] md:pr-6 lg:pr-8">
          <section className="flex flex-col gap-6 py-0">
        <FeelingCheckInRow feeling={feeling} onFeelingChange={setFeeling} />
        <p className={COLUMN_EYEBROW_CLASS}>Your tasks</p>
        <form onSubmit={onAdd} className="flex flex-col gap-6">
          <div className="relative">
            <Textarea
              id="task-input"
              name="task"
              rows={2}
              value={input}
              onChange={(e) => {
                clearVoiceError();
                setInput(e.target.value);
              }}
              placeholder="What do you need to do today? Write it like you'd tell a friend..."
              aria-label="New task"
              className="min-h-[72px] resize-y rounded-[12px] border-[#EEF3F7] bg-white py-3 pl-4 pr-14 text-[16px] font-normal leading-relaxed text-[#2F4156] shadow-none placeholder:text-[#9BAFC0] placeholder:opacity-90 focus-visible:border-[#C8D9E6] focus-visible:ring-1 focus-visible:ring-[#C8D9E6] focus-visible:ring-offset-0 disabled:opacity-60 min-[640px]:text-[15px]"
              style={{ fontWeight: 400 }}
              disabled={pending}
            />
            <button
              type="button"
              onClick={() => toggleVoiceInput()}
              disabled={pending || !voiceSupported}
              aria-pressed={voiceListening}
              aria-label={voiceListening ? "Stop voice input" : "Start voice input"}
              title={
                !voiceSupported
                  ? "Voice input is not supported in this browser"
                  : voiceListening
                    ? "Stop dictating"
                    : "Dictate with your voice (tap again when finished)"
              }
              className={cn(
                "absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full border transition",
                !voiceSupported
                  ? "cursor-not-allowed border-[#EEF3F7] bg-[#FAFAFA] text-[#C8D9E6]"
                  : voiceListening
                    ? "border-[#E24B4A]/40 bg-[#FAECE7] text-[#E24B4A] shadow-sm"
                    : "border-[#EEF3F7] bg-white text-[#567C8D] hover:border-[#C8D9E6] hover:bg-[#F8FAFC] hover:text-[#2F4156]",
              )}
            >
              <Mic className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
            </button>
          </div>
          {voiceListening ? (
            <p className="text-[14px] font-medium text-[#567C8D]" style={{ fontWeight: 500 }}>
              Listening… speak your task, then tap the mic again to stop.
            </p>
          ) : null}
          {voiceError ? (
            <p className="text-[14px] font-normal text-[#E24B4A]" style={{ fontWeight: 400 }}>
              {voiceError}
            </p>
          ) : null}
          {error ? (
            <p className="text-[14px] font-normal text-[#E24B4A]" style={{ fontWeight: 400 }}>
              {error}
            </p>
          ) : null}
          <div className="flex w-full min-w-0 flex-col items-stretch gap-2 md:w-auto md:flex-row md:flex-wrap md:items-center">
            <Button
              type="submit"
              disabled={pending || !input.trim()}
              className="h-auto min-h-[44px] w-full rounded-[8px] border-0 bg-[#2F4156] text-[14px] font-medium text-white shadow-none hover:bg-[#2F4156]/95 hover:opacity-100 disabled:opacity-45 md:w-auto md:min-h-0 md:self-start md:text-[14px]"
              style={{ fontWeight: 500, padding: "10px 24px" }}
            >
              {pending ? "Adding…" : "Add task"}
            </Button>
            <Button
              type="button"
              disabled={pending || !hasAnyTasks}
              onClick={onWhatNowAndPlan}
              className="h-auto min-h-[44px] w-full rounded-[8px] border-0 bg-[#567C8D] text-[14px] font-medium text-white shadow-none hover:bg-[#567C8D]/92 disabled:opacity-45 md:w-auto md:min-h-0 md:self-start md:text-[14px]"
              style={{ fontWeight: 500, padding: "10px 24px" }}
            >
              What should I do now?
            </Button>
          </div>
        </form>

        {recoError != null ||
        planError != null ||
        (reco != null && reco.length > 0) ||
        (planText != null && planText.length > 0) ? (
          <div className="overflow-hidden rounded-[12px] border border-[#EEF3F7] bg-white/90 shadow-none">
            <button
              type="button"
              onClick={() => setInsightsOpen((o) => !o)}
              className="flex w-full min-h-[44px] items-center justify-between gap-2 px-3 py-3 text-left text-[14px] transition-colors hover:bg-[#F8FAFC] md:min-h-0 md:py-2.5 md:text-[12px]"
              aria-expanded={insightsOpen}
            >
              <span className="text-[14px] font-medium text-[#567C8D] md:text-[12px]" style={{ fontWeight: 500 }}>
                {insightsOpen ? (
                  "Hide suggestions"
                ) : (
                  <>
                    <span className="md:hidden">Show suggestions</span>
                    <span className="hidden md:inline">Show suggestions (top picks & today’s plan)</span>
                  </>
                )}
              </span>
              {insightsOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-[#567C8D]" aria-hidden />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-[#567C8D]" aria-hidden />
              )}
            </button>
            {insightsOpen ? (
              <div className="space-y-4 border-t border-[#EEF3F7] px-3 pb-3 pt-3" aria-live="polite">
                {recoError ? (
                  <p className="text-[13px] text-[#E24B4A]" style={{ fontWeight: 400 }}>
                    {recoError}
                  </p>
                ) : null}
                {reco && reco.length > 0 ? (
                  <Card className="rounded-[10px] border-0 bg-[#F5EFEB] shadow-none">
                    <CardContent className="p-4 md:p-5">
                      <h3 className="font-[family-name:var(--font-cormorant)] text-[18px] font-normal italic text-[#2F4156]">
                        Top picks for right now
                      </h3>
                      <ol
                        className="mt-3 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-[#2F4156]"
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
                  <Card className="rounded-[10px] border-0 bg-[#ECEEF6] shadow-none">
                    <CardContent className="p-4 md:p-5">
                      <h3 className="font-[family-name:var(--font-cormorant)] text-[18px] font-normal italic text-[#2F4156]">
                        Today’s plan
                      </h3>
                      <p
                        className="mt-3 max-h-[min(40vh,320px)] overflow-y-auto whitespace-pre-line text-[13px] leading-relaxed text-[#2F4156]"
                        style={{ fontWeight: 400 }}
                      >
                        {planText}
                      </p>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
          </section>

          <section className="flex min-h-0 flex-1 flex-col gap-6 py-0">
        {hasAnyTasks && !showAllDoneCelebration ? (
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
                    "h-auto min-h-[44px] rounded-full px-3 py-2 text-[14px] uppercase tracking-[0.6px] shadow-none hover:bg-transparent md:min-h-0 md:px-2.5 md:py-1 md:text-[11px]",
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
              <span className="text-[14px] font-normal uppercase tracking-[0.8px] text-[#9BAFC0] md:text-[10px]" style={{ fontWeight: 400 }}>
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
                    "min-h-[44px] rounded-full px-3 py-2 text-[14px] font-normal transition-colors md:min-h-0 md:px-2 md:py-0.5 md:text-[10px]",
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

        <div className="min-h-0 flex-1 md:max-h-[calc(100dvh-14rem)] md:overflow-y-auto md:pr-1 lg:max-h-[calc(100dvh-16rem)]">
          {!hasAnyTasks ? (
            <div
              className="relative flex min-h-[min(52vh,26rem)] flex-col items-center justify-center overflow-hidden rounded-[16px] border border-[#EEF3F7] bg-white px-6 py-14 text-center shadow-[0_4px_32px_rgba(47,65,86,0.06)] md:min-h-[min(48vh,24rem)] md:py-16"
              role="region"
              aria-label="No tasks yet"
            >
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(245,239,235,0.95),transparent)]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-24 left-1/2 h-56 w-[min(100%,28rem)] -translate-x-1/2 rounded-full bg-[#E8EFFA]/35 blur-3xl"
                aria-hidden
              />
              <div className="relative flex max-w-md flex-col items-center">
                <div
                  className="mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-[#F5EFEB] to-[#ECEEF6] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-[#EEF3F7]"
                  aria-hidden
                >
                  <Sparkles className="h-9 w-9 text-[#567C8D]" strokeWidth={1.35} />
                </div>
                <p className="font-[family-name:var(--font-cormorant)] text-[clamp(1.65rem,4.8vw,2.1rem)] font-bold italic leading-tight text-[#2F4156]">
                  Your day is a blank canvas
                </p>
                <p
                  className="mx-auto mt-4 max-w-sm text-[14px] leading-relaxed text-[#567C8D]"
                  style={{ fontWeight: 400 }}
                >
                  Add your first task above — write it like you&apos;d tell a friend.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={focusNewTaskInput}
                  className="mt-8 h-auto min-h-[44px] rounded-full border-[#C8D9E6] bg-white px-6 py-2.5 text-[13px] font-medium text-[#2F4156] shadow-none hover:bg-[#F8FAFC]"
                  style={{ fontWeight: 500 }}
                >
                  Start with the box above
                </Button>
              </div>
            </div>
          ) : showAllDoneCelebration ? (
            <div
              className="relative flex min-h-[min(58vh,32rem)] flex-col items-center justify-center overflow-hidden rounded-[16px] border border-[#EEF3F7] bg-white px-6 py-16 text-center shadow-[0_4px_36px_rgba(47,65,86,0.07)] md:min-h-[min(52vh,30rem)] md:py-20"
              role="status"
              aria-live="polite"
              aria-label="All active tasks completed"
            >
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-5%,rgba(232,239,250,0.75),transparent)]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#F5EFEB]/90 blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-[#E4F4EC]/45 blur-3xl"
                aria-hidden
              />
              <div className="relative flex max-w-lg flex-col items-center">
                <div
                  className="mb-6 flex h-[5rem] w-[5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8EFFA] via-[#F5EFEB] to-[#ECEEF6] shadow-[0_8px_28px_rgba(86,124,141,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-[#EEF3F7]"
                  aria-hidden
                >
                  <PartyPopper className="h-11 w-11 text-[#567C8D]" strokeWidth={1.35} />
                </div>
                <p className="font-[family-name:var(--font-cormorant)] text-[clamp(1.85rem,5.5vw,2.35rem)] font-bold italic leading-[1.15] text-[#2F4156]">
                  All done <span aria-hidden>🎉</span>
                </p>
                <p
                  className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[#567C8D]"
                  style={{ fontWeight: 400 }}
                >
                  You cleared the list for this view. Enjoy the space — or line up what&apos;s next when
                  you&apos;re ready.
                </p>
                <div className="mt-10 flex w-full max-w-sm flex-col items-stretch gap-3 md:flex-row md:justify-center md:gap-3">
                  <Button
                    type="button"
                    onClick={focusNewTaskInput}
                    className="h-auto min-h-[48px] w-full rounded-[10px] border-0 bg-[#2F4156] text-[14px] font-medium text-white shadow-none hover:bg-[#2F4156]/95 md:min-h-0 md:w-auto md:px-8"
                    style={{ fontWeight: 500 }}
                  >
                    Add a task
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFilter("done")}
                    className="h-auto min-h-[48px] w-full rounded-[10px] border-[#C8D9E6] bg-white/80 text-[14px] font-medium text-[#567C8D] shadow-none hover:bg-[#F8FAFC] md:min-h-0 md:w-auto md:px-6"
                    style={{ fontWeight: 500 }}
                  >
                    Review completed
                  </Button>
                </div>
              </div>
            </div>
          ) : sortedVisible.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[#E3EBF2] bg-gradient-to-b from-[#FFFCFA] to-[#F8FAFC] px-6 py-12 text-center shadow-none md:px-10">
              <p className="font-[family-name:var(--font-cormorant)] text-[22px] font-semibold italic leading-snug text-[#567C8D]">
                Nothing in this view
              </p>
              <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-[#9BAFC0]" style={{ fontWeight: 400 }}>
                {visible.length === 0
                  ? "Try another filter, or switch back to All."
                  : `No tasks for ${selectedDay.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} — pick another day above, or change a deadline.`}
              </p>
            </div>
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

                      <div className="flex min-w-0 flex-1 flex-col gap-3 px-4 py-5 md:flex-row md:items-start md:justify-between md:gap-4 md:px-4 md:py-4 md:pr-3">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <div className="mt-0.5 flex shrink-0 items-start pt-0.5">
                            <Checkbox
                              checked={task.done}
                              onCheckedChange={(v) => onToggleDone(task.id, v === true)}
                              aria-label={`Mark done: ${task.title}`}
                              className="h-[26px] w-[26px] rounded-full border-[1.5px] border-[#C8D9E6] bg-white text-white shadow-none ring-offset-0 focus-visible:ring-[#C8D9E6] data-[state=checked]:border-[#3A8D84] data-[state=checked]:bg-[#3A8D84] data-[state=checked]:text-white data-[state=unchecked]:bg-white md:h-[22px] md:w-[22px] [&_svg]:h-2.5 [&_svg]:w-2.5"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            {editingTitleId === task.id ? (
                              <div className="flex flex-col gap-2">
                                <input
                                  type="text"
                                  value={titleDraft}
                                  onChange={(e) => setTitleDraft(e.target.value)}
                                  disabled={isSavingTitle}
                                  className="w-full rounded-[8px] border border-[#EEF3F7] bg-white px-3 py-2 text-[16px] font-medium leading-snug text-[#2F4156] focus-visible:border-[#C8D9E6] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C8D9E6] min-[640px]:text-[15px]"
                                  style={{ fontWeight: 500 }}
                                  aria-label="Edit task title"
                                />
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={isSavingTitle}
                                    onClick={() => saveTitle(task.id)}
                                    className="h-auto rounded-[8px] bg-[#2F4156] px-3 py-1.5 text-[12px] text-white"
                                    style={{ fontWeight: 500 }}
                                  >
                                    {isSavingTitle ? "Saving…" : "Save"}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={isSavingTitle}
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
                                onClick={() => beginTitleEdit(task)}
                                className="w-full cursor-pointer text-left text-[15px] font-medium leading-snug text-[#2F4156] hover:underline"
                                style={{ fontWeight: 500 }}
                              >
                                {task.title}
                              </button>
                            )}
                            <p
                              className="mt-1 line-clamp-2 text-[14px] italic leading-relaxed text-[#9BAFC0] md:text-[13px]"
                              style={{ fontWeight: 400 }}
                            >
                              {task.rawInput}
                            </p>
                            <div className="mt-2">
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => toggleNotesPanel(task)}
                                className="text-[14px] font-normal text-[#567C8D] underline decoration-[#C8D9E6] underline-offset-2 hover:text-[#2F4156] md:text-[12px]"
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
                                    className="resize-y rounded-[10px] border-[#EEF3F7] text-[16px] text-[#2F4156] min-[640px]:text-[13px]"
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
                                !task.done ? (
                                  <button
                                    type="button"
                                    disabled={pending}
                                    onClick={() => openTaskDetailsSection(task, "deadline")}
                                    className={cn(
                                      "inline-flex min-h-[36px] max-w-full shrink-0 items-center rounded-full border-0 px-2.5 py-1 text-[11px] font-normal transition hover:brightness-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8D9E6] focus-visible:ring-offset-1 disabled:opacity-50",
                                      overdue && !task.done
                                        ? "bg-[#FAECE7] text-[#E24B4A] ring-1 ring-[#F0C4C4]"
                                        : "bg-[#F5EFEB] text-[#567C8D]",
                                    )}
                                    style={{ fontWeight: 400 }}
                                    aria-label={`Edit deadline, currently ${deadlineLabel}`}
                                  >
                                    {deadlineLabel}
                                  </button>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "rounded-full border-0 px-2.5 py-1 text-[11px] font-normal",
                                      overdue && !task.done
                                        ? "bg-[#FAECE7] text-[#E24B4A] ring-1 ring-[#F0C4C4]"
                                        : "bg-[#F5EFEB] text-[#567C8D]",
                                    )}
                                    style={{ fontWeight: 400 }}
                                  >
                                    {deadlineLabel}
                                  </Badge>
                                )
                              ) : !task.done ? (
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => openTaskDetailsSection(task, "deadline")}
                                  className="inline-flex min-h-[36px] shrink-0 items-center rounded-full border-0 bg-[#F5EFEB] px-2.5 py-1 text-[11px] font-normal text-[#9BAFC0] transition hover:brightness-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8D9E6] focus-visible:ring-offset-1 disabled:opacity-50"
                                  style={{ fontWeight: 400 }}
                                  aria-label="Set deadline"
                                >
                                  No deadline
                                </button>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="rounded-full border-0 bg-[#F5EFEB] px-2.5 py-1 text-[11px] font-normal text-[#9BAFC0]"
                                  style={{ fontWeight: 400 }}
                                >
                                  No deadline
                                </Badge>
                              )}
                              {!task.done ? (
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => openTaskDetailsSection(task, "priority")}
                                  className={cn(
                                    "inline-flex min-h-[36px] shrink-0 items-center rounded-full border-0 px-2.5 py-1 text-[11px] font-medium transition hover:brightness-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8D9E6] focus-visible:ring-offset-1 disabled:opacity-50",
                                    priorityPillClass(task.priority),
                                  )}
                                  style={{ fontWeight: 500 }}
                                  aria-label={`Edit priority, currently ${priorityShortLabel(task.priority)}`}
                                >
                                  {priorityShortLabel(task.priority)}
                                </button>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "rounded-full border-0 px-2.5 py-1 text-[11px] font-medium",
                                    priorityPillClass(task.priority),
                                  )}
                                  style={{ fontWeight: 500 }}
                                >
                                  {priorityShortLabel(task.priority)}
                                </Badge>
                              )}
                              {cat ? (
                                !task.done ? (
                                  <button
                                    type="button"
                                    disabled={pending}
                                    onClick={() => openTaskDetailsSection(task, "category")}
                                    className="inline-flex min-h-[36px] max-w-full shrink-0 items-center rounded-full border-0 px-2.5 py-1 text-[11px] font-medium transition hover:brightness-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8D9E6] focus-visible:ring-offset-1 disabled:opacity-50"
                                    style={{
                                      fontWeight: 500,
                                      backgroundColor: cat.bg,
                                      color: cat.text,
                                    }}
                                    aria-label={`Edit category, currently ${cat.label}`}
                                  >
                                    {cat.label}
                                  </button>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="rounded-full border-0 px-2.5 py-1 text-[11px] font-medium"
                                    style={{
                                      fontWeight: 500,
                                      backgroundColor: cat.bg,
                                      color: cat.text,
                                    }}
                                  >
                                    {cat.label}
                                  </Badge>
                                )
                              ) : !task.done ? (
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => openTaskDetailsSection(task, "category")}
                                  className="inline-flex min-h-[36px] shrink-0 items-center rounded-full border border-dashed border-[#D4DDE8] bg-[#FAFCFF] px-2.5 py-1 text-[11px] font-normal text-[#9BAFC0] transition hover:border-[#C8D9E6] hover:text-[#567C8D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8D9E6] focus-visible:ring-offset-1 disabled:opacity-50"
                                  style={{ fontWeight: 400 }}
                                  aria-label="Set category"
                                >
                                  No category
                                </button>
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
                            {!task.done && detailsTaskId === task.id ? (
                              <div className="mt-3 space-y-3 rounded-[10px] border border-[#EEF3F7] bg-[#FAFCFF] px-3 py-3">
                                <div>
                                  <span
                                    className="text-[10px] font-medium uppercase tracking-wide text-[#9BAFC0]"
                                    style={{ fontWeight: 500 }}
                                  >
                                    Deadline
                                  </span>
                                  <input
                                    ref={detailsDeadlineInputRef}
                                    type="datetime-local"
                                    value={detailsDeadlineLocal}
                                    onChange={(e) => setDetailsDeadlineLocal(e.target.value)}
                                    disabled={pending}
                                    className={`${DETAILS_SELECT_CLASS} mt-1 block`}
                                  />
                                  <button
                                    type="button"
                                    disabled={pending}
                                    onClick={() => setDetailsDeadlineLocal("")}
                                    className="mt-1.5 text-[11px] font-normal text-[#567C8D] underline"
                                    style={{ fontWeight: 400 }}
                                  >
                                    Clear deadline
                                  </button>
                                </div>
                                <div>
                                  <span
                                    className="text-[10px] font-medium uppercase tracking-wide text-[#9BAFC0]"
                                    style={{ fontWeight: 500 }}
                                  >
                                    Priority
                                  </span>
                                  <select
                                    ref={detailsPrioritySelectRef}
                                    value={detailsPriority}
                                    onChange={(e) => setDetailsPriority(e.target.value)}
                                    disabled={pending}
                                    className={`${DETAILS_SELECT_CLASS} mt-1 block`}
                                    aria-label="Priority"
                                  >
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                  </select>
                                </div>
                                <div>
                                  <span
                                    className="text-[10px] font-medium uppercase tracking-wide text-[#9BAFC0]"
                                    style={{ fontWeight: 500 }}
                                  >
                                    Category
                                  </span>
                                  <select
                                    ref={detailsCategorySelectRef}
                                    value={detailsCategory}
                                    onChange={(e) => setDetailsCategory(e.target.value)}
                                    disabled={pending}
                                    className={`${DETAILS_SELECT_CLASS} mt-1 block`}
                                    aria-label="Category"
                                  >
                                    <option value="">None</option>
                                    <option value="work">Work</option>
                                    <option value="personal">Personal</option>
                                    <option value="learning">Learning</option>
                                  </select>
                                </div>
                                {detailsError ? (
                                  <p className="text-[12px] text-[#E24B4A]" style={{ fontWeight: 400 }}>
                                    {detailsError}
                                  </p>
                                ) : null}
                                <div className="flex flex-wrap gap-2 pt-0.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={pending}
                                    onClick={() => saveDetailsForTask(task.id)}
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
                                    onClick={() => {
                                      setDetailsTaskId(null);
                                      setDetailsError(null);
                                    }}
                                    className="h-auto px-3 py-1.5 text-[12px] text-[#567C8D]"
                                    style={{ fontWeight: 500 }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeTask(task.id)}
                          className="h-auto min-h-[44px] shrink-0 self-end px-3 py-2 text-[13px] font-normal text-[#9BAFC0] hover:bg-transparent hover:text-[#567C8D] md:min-h-0 md:self-start md:px-1 md:py-0 md:pt-0.5 md:text-[12px]"
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
          key={selectedDayKey}
          protocolTasks={protocolTasks}
          pending={pending}
          selectedDay={selectedDay}
          initialDemoBlocks={initialDemoBlocksForDay}
          googleExportEnabled={Boolean(session?.user)}
          onExportToGoogleCalendar={exportThisDayToGoogleCalendar}
          googleExportMessage={googleExportMsg}
          googleExportError={googleExportErr}
          onRemoveFromProtocol={(id) => toggleProtocolApproved(id, false)}
        />
      </div>
    </div>
  );
}
