import { describe, expect, it, vi } from "vitest";
import type { Station } from "../../api/types";
import {
  createProgram,
  createScheduleEntry,
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

    expect(validateSchedule(next)).toEqual(["Active program schedules cannot overlap."]);
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
