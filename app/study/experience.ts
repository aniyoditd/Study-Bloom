import type { Activity } from "./types";

export const XP_PER_LEVEL = 500;

export const XP_REWARDS: Record<Activity["kind"], { label: string; xp: string }> = {
  flashcard: { label: "Review a flashcard", xp: "5 XP" },
  practice: { label: "Complete practice", xp: "10–25 XP" },
  exam: { label: "Finish a mock exam", xp: "25–75 XP" },
  focus: { label: "Finish a focus session", xp: "10–60 XP" },
  task: { label: "Complete schoolwork", xp: "30 XP" },
  note: { label: "Create a note", xp: "10 XP" },
  upload: { label: "Create a study kit", xp: "25 XP" },
};

export function xpForActivity(kind: Activity["kind"], value: number) {
  if (kind === "flashcard") return 5;
  if (kind === "note") return 10;
  if (kind === "upload") return 25;
  if (kind === "task") return 30;
  if (kind === "focus") return Math.max(10, Math.min(60, Math.round(value)));
  if (kind === "practice") return Math.max(10, Math.min(25, Math.round(value * 1.5)));
  return Math.max(25, Math.min(75, Math.round(value * .75)));
}

export function xpLevel(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const earned = xp % XP_PER_LEVEL;
  return { level, earned, needed: XP_PER_LEVEL - earned, percent: Math.round(earned / XP_PER_LEVEL * 100) };
}
