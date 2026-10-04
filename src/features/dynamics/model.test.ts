import { describe, expect, it, vi } from "vitest";
import type { Dynamic } from "../../api/types";
import {
  createDynamic,
  dynamicWindowState,
  isoToZonedLocal,
  slugify,
  validateDynamic,
  zonedLocalToIso,
} from "./model";

vi.stubGlobal("crypto", {
  randomUUID: () => "00000000-0000-4000-8000-000000000001",
});

function validDynamic(): Dynamic {
  return {
    ...createDynamic(),
    id: "11111111-1111-4111-8111-111111111111",
    slug: "win-tickets",
    title: "Win tickets",
    description: "Enter for a chance to win.",
    instructions: "Complete the form before the deadline.",
    imageUrl: "https://cdn.example.com/dynamic.webp",
    startsAt: "2026-10-03T12:00:00.000Z",
    endsAt: "2026-10-10T12:00:00.000Z",
    timezone: "America/Detroit",
    termsUrl: "https://example.com/terms",
    privacyUrl: "https://example.com/privacy",
    consentVersion: "1",
    participation: {
      type: "form",
      url: null,
      requiresAuth: false,
      fields: [{ key: "email", type: "email", label: "Email", required: true }],
    },
  } as Dynamic;
}

describe("dynamics model", () => {
  it("generates a route-safe slug", () => {
    expect(slugify("¡Boletos Para El Fantasma! ")).toBe("boletos-para-el-fantasma");
  });

  it("accepts a valid anonymous form when email is required", () => {
    expect(validateDynamic(validDynamic())).toEqual([]);
  });

  it("rejects anonymous forms without a required email or phone", () => {
    const dynamic = validDynamic();
    dynamic.participation = {
      type: "form",
      url: null,
      requiresAuth: false,
      fields: [{ key: "name", type: "text", label: "Name", required: true }],
    };
    expect(validateDynamic(dynamic)).toContain("Anonymous forms require a required email or phone field.");
  });

  it("rejects an external participation URL that is not HTTPS", () => {
    const dynamic = validDynamic();
    dynamic.participation = {
      type: "external_url",
      url: "http://example.com/enter",
      requiresAuth: false,
      fields: [],
    };
    expect(validateDynamic(dynamic)).toContain("External participation requires a public HTTPS URL.");
  });

  it("rejects duplicate form keys", () => {
    const dynamic = validDynamic();
    dynamic.participation = {
      type: "form",
      url: null,
      requiresAuth: true,
      fields: [
        { key: "name", type: "text", label: "Name", required: true },
        { key: "name", type: "textarea", label: "Message", required: false },
      ],
    };
    expect(validateDynamic(dynamic)).toContain("Field key “name” is duplicated.");
  });

  it("converts Detroit editorial time to UTC and back", () => {
    const iso = zonedLocalToIso("2026-12-01T09:00", "America/Detroit");
    expect(iso).toBe("2026-12-01T14:00:00.000Z");
    expect(isoToZonedLocal(iso, "America/Detroit")).toBe("2026-12-01T09:00");
  });

  it("derives the campaign window state independently of publication", () => {
    const dynamic = validDynamic();
    expect(dynamicWindowState(dynamic, new Date("2026-10-02T12:00:00.000Z"))).toBe("upcoming");
    expect(dynamicWindowState(dynamic, new Date("2026-10-05T12:00:00.000Z"))).toBe("open");
    expect(dynamicWindowState(dynamic, new Date("2026-10-11T12:00:00.000Z"))).toBe("ended");
  });
});
