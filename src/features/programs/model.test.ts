import { describe, expect, it, vi } from "vitest";
import type { Station } from "../../api/types";
import {
  createProgram,
  createScheduleEntry,
  findScheduleConflicts,
  removeProgram,
  type Program,
  upsertProgram,
  validateProgram,
  validateSchedule,
} from "./model";

vi.stubGlobal("crypto", {
  randomUUID: () => "00000000-0000-4000-8000-000000000001",
});

function station(): Station {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "la-z-detroit",
    name: "LA Z Detroit",
    timezone: "America/Detroit",
    locale: "es-US",
    isActive: true,
    streams: [],
    shows: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        slug: "existing-show",
        name: "Existing Show",
        description: null,
        hostName: null,
        imageUrl: null,
        isActive: true,
      },
    ],
    schedule: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        showId: "22222222-2222-4222-8222-222222222222",
        weekday: 0,
        startsAt: "10:00:00",
        endsAt: "12:00:00",
        isActive: true,
      },
    ],
  };
}

function program(id = "44444444-4444-4444-8444-444444444444"): Program {
  return {
    id,
    slug: "morning-show",
    name: "Morning Show",
    description: "Music and community news",
    hostName: "LA Z Team",
    imageUrl: "https://cdn.example.com/morning.webp",
    isActive: true,
  };
}

describe("program model", () => {
  it("upserts program metadata and its schedule in one station value", () => {
    const current = station();
    const entry = {
      ...createScheduleEntry(program().id),
      id: "55555555-5555-4555-8555-555555555555",
      startsAt: "07:00:00",
      endsAt: "09:00:00",
    };

    const next = upsertProgram(current, program(), [entry]);

    expect(next.shows).toHaveLength(2);
    expect(next.schedule).toHaveLength(2);
    expect(next.schedule?.find((item) => item.id === entry.id)?.showId).toBe(program().id);
  });

  it("removes a program and all schedule entries that reference it", () => {
    const current = upsertProgram(station(), program(), [
      {
        ...createScheduleEntry(program().id),
        id: "55555555-5555-4555-8555-555555555555",
        weekday: 2,
      },
    ]);

    const next = removeProgram(current, program().id);

    expect(next.shows?.some((item) => item.id === program().id)).toBe(false);
    expect(next.schedule?.some((item) => item.showId === program().id)).toBe(false);
  });

  it("rejects overlapping active schedules", () => {
    const current = station();
    const overlap = {
      ...createScheduleEntry(program().id),
      id: "55555555-5555-4555-8555-555555555555",
      weekday: 0,
      startsAt: "11:00:00",
      endsAt: "13:00:00",
    };
    const next: Station = {
      ...current,
      shows: [...(current.shows ?? []), program()],
      schedule: [...(current.schedule ?? []), overlap],
    };

    expect(validateSchedule(next)).toHaveLength(1);
    expect(validateSchedule(next)[0]).toContain("Existing Show");
    expect(validateSchedule(next)[0]).toContain("Morning Show");
    expect(validateSchedule(next)[0]).toContain("11:00–13:00");
  });

  it("allows non-overlapping overnight schedules", () => {
    const overnight = {
      ...createScheduleEntry(program().id),
      weekday: 5,
      startsAt: "22:00:00",
      endsAt: "02:00:00",
    };
    const current: Station = {
      ...station(),
      shows: [program()],
      schedule: [overnight],
    };

    expect(validateSchedule(current)).toEqual([]);
  });

  it("allows consecutive programs 06:00–15:00, 15:00–18:00 and 18:00–22:00", () => {
    const base = station();
    const first = { ...base.shows![0], name: "Mañanas" };
    const afternoon = program();
    const evening = { ...program("66666666-6666-4666-8666-666666666666"), slug: "evening", name: "Noches" };
    const next: Station = {
      ...base,
      shows: [first, afternoon, evening],
      schedule: [
        { id: "1", showId: first.id!, weekday: 0, startsAt: "06:00:00", endsAt: "15:00:00", isActive: true },
        { id: "2", showId: afternoon.id, weekday: 0, startsAt: "15:00:00", endsAt: "18:00:00", isActive: true },
        { id: "3", showId: evening.id, weekday: 0, startsAt: "18:00:00", endsAt: "22:00:00", isActive: true },
      ],
    };
    expect(validateSchedule(next)).toEqual([]);
    expect(findScheduleConflicts(next)).toEqual([]);
    expect(upsertProgram(next, afternoon, next.schedule!.filter(item => item.showId === afternoon.id))).toBeTruthy();
  });

  it("identifies the exact conflicting names, day and time, including previously active slots", () => {
    const base = station();
    const conflicting = { ...createScheduleEntry(program().id), id: "9", weekday: 0, startsAt: "11:30:00", endsAt: "13:00:00" };
    const next = {
      ...base,
      shows: [...base.shows!, program()],
      schedule: [...base.schedule!, conflicting],
    };
    const issues = validateSchedule(next);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("Existing Show");
    expect(issues[0]).toContain("Morning Show");
    expect(issues[0]).toContain("Monday 10:00–12:00");
    expect(issues[0]).toContain("Monday 11:30–13:00");
    expect(() => upsertProgram(next, program(), [conflicting])).toThrow(/Conflicto entre/);
  });

  it("allows identical times on different days and ignores inactive slots/programs", () => {
    const base = station();
    const original = { ...base.schedule![0] };
    const other = program();
    const byDay = { ...createScheduleEntry(other.id), id: "9", weekday: 1, startsAt: "10:00:00", endsAt: "12:00:00" };
    const next: Station = { ...base, shows: [...base.shows!, other], schedule: [original, byDay] };
    expect(validateSchedule(next)).toEqual([]);
    const sameDay = { ...byDay, weekday: 0 };
    expect(validateSchedule({ ...next, schedule: [original, { ...sameDay, isActive: false }] })).toEqual([]);
    expect(validateSchedule({
      ...next,
      shows: [...base.shows!, { ...other, isActive: false }],
      schedule: [original, sameDay],
    })).toEqual([]);
  });

  it("detects overnight Sunday to Monday conflicts once, and allows adjacent Monday windows", () => {
    const first = program("77777777-7777-4777-8777-777777777777");
    const second = { ...program("88888888-8888-4888-8888-888888888888"), name: "Night backup", slug: "night-backup" };
    const overnight = {
      id: "sun", showId: first.id, weekday: 6, startsAt: "23:00:00", endsAt: "02:00:00", isActive: true,
    };
    const monday = {
      id: "mon", showId: second.id, weekday: 0, startsAt: "01:00:00", endsAt: "03:00:00", isActive: true,
    };
    const base = station();
    const next: Station = { ...base, shows: [first, second], schedule: [overnight, monday] };
    const conflicts = findScheduleConflicts(next);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].message).toContain("Sunday 23:00–02:00");
    expect(conflicts[0].message).toContain("Monday 01:00–03:00");
    expect(validateSchedule({ ...next, schedule: [overnight, { ...monday, startsAt: "02:00:00" }] })).toEqual([]);
  });

  it("reports duplicate active slots rather than treating them as adjacent", () => {
    const base = station();
    const dupe = { ...base.schedule![0], id: "another-id" };
    expect(findScheduleConflicts({ ...base, schedule: [...base.schedule!, dupe] })).toHaveLength(1);
  });

  it("requires HTTPS artwork", () => {
    expect(validateProgram({ ...program(), imageUrl: "http://example.com/art.jpg" })).toContain(
      "Program artwork must use a public HTTPS URL.",
    );
  });

  it("creates a new program with safe defaults", () => {
    const created = createProgram();
    expect(created.id).toBeTruthy();
    expect(created.isActive).toBe(true);
    expect(created.imageUrl).toBeNull();
  });
});
