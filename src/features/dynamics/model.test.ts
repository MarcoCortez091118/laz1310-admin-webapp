import { describe, expect, it } from "vitest";
import type { Dynamic } from "../../api/types";
import {
  defaultDynamicForm,
  dynamicFromForm,
  dynamicToForm,
  isoToZonedInput,
  lifecycle,
  validateDynamicForm,
  zonedInputToIso,
} from "./model";

function fixture(): Dynamic {
  return {
    id: "88a17268-ce3e-42ea-bf3c-5c8eed7d1d6f",
    slug: "gana-boletos",
    title: "Gana boletos con LA Z",
    artworkLabel: "PROMOCIÓN",
    context: "LA Z 1310",
    description: "Participa para ganar boletos.",
    instructions: "Completa tus datos.",
    imageUrl: "https://images.example.com/campaign.webp",
    startsAt: "2026-09-20T04:00:00.000Z",
    endsAt: "2026-09-30T03:59:59.000Z",
    timezone: "America/Detroit",
    featured: true,
    status: "active",
    participation: {
      type: "form",
      url: null,
      requiresAuth: false,
      fields: [
        { key: "email", type: "email", label: "Correo", required: true },
        { key: "answer", type: "textarea", label: "Respuesta", required: true },
      ],
    },
    termsUrl: "https://example.com/terms",
    privacyUrl: "https://example.com/privacy",
    consentVersion: "1",
  };
}

describe("Dynamics model", () => {
  it("converts campaign wall-clock values using the campaign timezone", () => {
    expect(zonedInputToIso("2026-09-20T00:00", "America/Detroit")).toBe(
      "2026-09-20T04:00:00.000Z",
    );
    expect(isoToZonedInput("2026-09-20T04:00:00.000Z", "America/Detroit")).toBe(
      "2026-09-20T00:00",
    );
  });

  it("round-trips an API Dynamic through the editor model", () => {
    const source = fixture();
    const form = dynamicToForm(source);
    const payload = dynamicFromForm(form);
    expect(payload.id).toBe(source.id);
    expect(payload.slug).toBe(source.slug);
    expect(payload.startsAt).toBe(source.startsAt);
    expect(payload.participation?.fields?.[0]?.key).toBe("email");
  });

  it("enforces anonymous contact and unique featured campaign rules", () => {
    const form = dynamicToForm(fixture());
    form.id = "c57b45f9-54ab-4a80-ad73-acde285151c5";
    form.slug = "otra-campana";
    form.featured = true;
    expect(validateDynamicForm(form, [fixture()], undefined)).toMatch(/already featured/i);

    form.featured = false;
    form.fields = [{ rowId: "1", key: "name", type: "text", label: "Nombre", required: true }];
    expect(validateDynamicForm(form, [], undefined)).toMatch(/required email or phone/i);
  });

  it("builds a valid account-linked form with zero additional fields", () => {
    const form = defaultDynamicForm();
    form.slug = "campana-prueba";
    form.title = "Campaña de prueba";
    form.description = "Descripción";
    form.instructions = "Instrucciones";
    form.imageUrl = "https://example.com/image.webp";
    form.termsUrl = "https://example.com/terms";
    form.privacyUrl = "https://example.com/privacy";

    expect(form.requiresAuth).toBe(true);
    expect(form.fields).toEqual([]);
    expect(validateDynamicForm(form, [])).toBeNull();
  });

  it("derives lifecycle from editorial status and campaign window", () => {
    const dynamic = fixture();
    expect(lifecycle(dynamic, new Date("2026-09-19T00:00:00Z"))).toBe("scheduled");
    expect(lifecycle(dynamic, new Date("2026-09-25T00:00:00Z"))).toBe("live");
    expect(lifecycle(dynamic, new Date("2026-10-01T00:00:00Z"))).toBe("ended");
    expect(lifecycle({ ...dynamic, status: "closed" }, new Date("2026-09-25T00:00:00Z"))).toBe("closed");
  });
});
