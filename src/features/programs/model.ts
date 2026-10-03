import type { Station } from "../../api/types";

export type Program = Station["shows"][number];
export type ScheduleEntry = Station["schedule"][number];

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function minutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function interval(entry: ScheduleEntry): [number, number][] {
  const week = 7 * 24 * 60;
  const start = entry.weekday * 1440 + minutes(entry.startsAt);
  let end = entry.weekday * 1440 + minutes(entry.endsAt);
  if (end <= start) end += 1440;

  if (end <= week) return [[start, end]];
  return [
    [start, week],
    [0, end - week],
  ];
}

export function validateProgram(program: Program): string[] {
  const issues: string[] = [];
  if (!program.name.trim()) issues.push("Program name is required.");
  if (!SLUG.test(program.slug.trim())) {
    issues.push("Slug must use lowercase letters, numbers, and single hyphens.");
  }
  if (program.imageUrl && !program.imageUrl.startsWith("https://")) {
    issues.push("Program artwork must use a public HTTPS URL.");
  }
  return issues;
}

export function validateSchedule(station: Station): string[] {
  const activeShowIds = new Set(
    station.shows.filter((show) => show.isActive).map((show) => show.id),
  );

  const intervals = station.schedule
    .filter((entry) => entry.isActive && activeShowIds.has(entry.showId))
    .flatMap((entry) => interval(entry).map(([start, end]) => ({ start, end, entry })))
    .sort((left, right) => left.start - right.start);

  const issues: string[] = [];
  for (let index = 1; index < intervals.length; index += 1) {
    const previous = intervals[index - 1];
    const current = intervals[index];
    if (current.start < previous.end) {
      issues.push("Active program schedules cannot overlap.");
      break;
    }
  }
  return issues;
}

export function schedulesForProgram(station: Station, programId: string): ScheduleEntry[] {
  return station.schedule
    .filter((entry) => entry.showId === programId)
    .slice()
    .sort((left, right) =>
      left.weekday === right.weekday
        ? left.startsAt.localeCompare(right.startsAt)
        : left.weekday - right.weekday,
    );
}

export function upsertProgram(
  station: Station,
  program: Program,
  schedule: ScheduleEntry[],
): Station {
  const programs = station.shows.some((item) => item.id === program.id)
    ? station.shows.map((item) => (item.id === program.id ? program : item))
    : [...station.shows, program];

  const next: Station = {
    ...station,
    shows: programs,
    schedule: [
      ...station.schedule.filter((entry) => entry.showId !== program.id),
      ...schedule.map((entry) => ({ ...entry, showId: program.id })),
    ],
  };

  const issues = [...validateProgram(program), ...validateSchedule(next)];
  if (issues.length) throw new Error(issues[0]);
  return next;
}

export function removeProgram(station: Station, programId: string): Station {
  return {
    ...station,
    shows: station.shows.filter((show) => show.id !== programId),
    schedule: station.schedule.filter((entry) => entry.showId !== programId),
  };
}

export function createProgram(): Program {
  return {
    id: crypto.randomUUID(),
    slug: "",
    name: "",
    description: null,
    hostName: null,
    imageUrl: null,
    isActive: true,
  };
}

export function createScheduleEntry(programId: string): ScheduleEntry {
  return {
    id: crypto.randomUUID(),
    showId: programId,
    weekday: 0,
    startsAt: "07:00:00",
    endsAt: "10:00:00",
    isActive: true,
  };
}

export function displayTime(value: string): string {
  return value.slice(0, 5);
}

export function apiTime(value: string): string {
  return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
}
