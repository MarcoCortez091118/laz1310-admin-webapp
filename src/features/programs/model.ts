import type { Station } from "../../api/types";

type GeneratedProgram = NonNullable<Station["shows"]>[number];
type GeneratedScheduleEntry = NonNullable<Station["schedule"]>[number];

export type Program = Omit<GeneratedProgram, "id" | "slug" | "name"> & {
  id: string;
  slug: string;
  name: string;
};

export type ScheduleEntry = Omit<GeneratedScheduleEntry, "id"> & {
  id: string;
};

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

function hasProgramIdentity(program: GeneratedProgram): program is Program {
  return Boolean(program.id && program.slug && program.name);
}

function hasScheduleIdentity(entry: GeneratedScheduleEntry): entry is ScheduleEntry {
  return Boolean(entry.id);
}

export function programsForStation(station: Station): Program[] {
  return (station.shows ?? []).filter(hasProgramIdentity);
}

function schedule(station: Station): ScheduleEntry[] {
  return (station.schedule ?? []).filter(hasScheduleIdentity);
}

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
    programsForStation(station)
      .filter((show) => show.isActive ?? true)
      .map((show) => show.id),
  );

  const activeEntries = schedule(station).filter(
    (entry) => (entry.isActive ?? true) && activeShowIds.has(entry.showId),
  );
  if (activeEntries.some((entry) => entry.startsAt === entry.endsAt)) {
    return ["Schedule start and end times must differ."];
  }

  const intervals = activeEntries
    .flatMap((entry) => interval(entry).map(([start, end]) => ({ start, end })))
    .sort((left, right) => left.start - right.start);

  for (let index = 1; index < intervals.length; index += 1) {
    const previous = intervals[index - 1];
    const current = intervals[index];
    if (current.start < previous.end) {
      return ["Active program schedules cannot overlap."];
    }
  }
  return [];
}

export function schedulesForProgram(station: Station, programId: string): ScheduleEntry[] {
  return schedule(station)
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
  programSchedule: ScheduleEntry[],
): Station {
  const currentShows = programsForStation(station);
  const currentSchedule = schedule(station);
  const programs = currentShows.some((item) => item.id === program.id)
    ? currentShows.map((item) => (item.id === program.id ? program : item))
    : [...currentShows, program];

  const next: Station = {
    ...station,
    shows: programs,
    schedule: [
      ...currentSchedule.filter((entry) => entry.showId !== program.id),
      ...programSchedule.map((entry) => ({ ...entry, showId: program.id })),
    ],
  };

  const issues = [...validateProgram(program), ...validateSchedule(next)];
  if (issues.length) throw new Error(issues[0]);
  return next;
}

export function removeProgram(station: Station, programId: string): Station {
  return {
    ...station,
    shows: programsForStation(station).filter((show) => show.id !== programId),
    schedule: schedule(station).filter((entry) => entry.showId !== programId),
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
