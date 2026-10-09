import type { Dynamic, DynamicFormField } from "../../api/types";

export const FIELD_TYPES = ["text", "email", "phone", "textarea"] as const;
export type DynamicFieldType = (typeof FIELD_TYPES)[number];

export interface DynamicFieldState {
  rowId: string;
  key: string;
  type: DynamicFieldType;
  label: string;
  required: boolean;
}

export interface DynamicFormState {
  id: string;
  slug: string;
  title: string;
  artworkLabel: string;
  context: string;
  description: string;
  instructions: string;
  imageUrl: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  featured: boolean;
  status: "active" | "closed";
  participationType: "form" | "external_url";
  participationUrl: string;
  requiresAuth: boolean;
  fields: DynamicFieldState[];
  termsUrl: string;
  privacyUrl: string;
  consentVersion: string;
}

export type DynamicLifecycle = "live" | "scheduled" | "ended" | "closed";

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      const random = Math.floor(Math.random() * 16);
      const value = character === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
}

function dateParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function isoToZonedInput(iso: string | undefined, timeZone: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = dateParts(date, timeZone);
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}T${parts.hour.toString().padStart(2, "0")}:${parts.minute.toString().padStart(2, "0")}`;
}

export function zonedInputToIso(value: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, 0);

  // Resolve the IANA zone offset iteratively so editors work in the campaign timezone,
  // not the timezone of the browser running the control plane.
  let candidate = wallClockUtc;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = dateParts(new Date(candidate), timeZone);
    const renderedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const difference = wallClockUtc - renderedAsUtc;
    if (difference === 0) break;
    candidate += difference;
  }

  const resolved = new Date(candidate);
  return Number.isNaN(resolved.getTime()) ? null : resolved.toISOString();
}

export function lifecycle(dynamic: Dynamic, now = new Date()): DynamicLifecycle {
  if (dynamic.status === "closed") return "closed";
  const starts = new Date(dynamic.startsAt ?? 0).getTime();
  const ends = new Date(dynamic.endsAt ?? 0).getTime();
  if (now.getTime() < starts) return "scheduled";
  if (now.getTime() >= ends) return "ended";
  return "live";
}

export function defaultDynamicForm(): DynamicFormState {
  const timeZone = "America/Detroit";
  const start = new Date();
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    id: uuid(),
    slug: "",
    title: "",
    artworkLabel: "PROMOCIÓN",
    context: "LA Z 1310",
    description: "",
    instructions: "",
    imageUrl: "",
    startsAt: isoToZonedInput(start.toISOString(), timeZone),
    endsAt: isoToZonedInput(end.toISOString(), timeZone),
    timezone: timeZone,
    featured: false,
    status: "active",
    participationType: "form",
    participationUrl: "",
    requiresAuth: true,
    fields: [],
    termsUrl: "",
    privacyUrl: "",
    consentVersion: "1",
  };
}

export function dynamicToForm(dynamic: Dynamic): DynamicFormState {
  const timeZone = dynamic.timezone ?? "America/Detroit";
  const participation = dynamic.participation;
  return {
    id: dynamic.id ?? uuid(),
    slug: dynamic.slug ?? "",
    title: dynamic.title ?? "",
    artworkLabel: dynamic.artworkLabel ?? "PROMOCIÓN",
    context: dynamic.context ?? "LA Z 1310",
    description: dynamic.description ?? "",
    instructions: dynamic.instructions ?? "",
    imageUrl: dynamic.imageUrl ?? "",
    startsAt: isoToZonedInput(dynamic.startsAt, timeZone),
    endsAt: isoToZonedInput(dynamic.endsAt, timeZone),
    timezone: timeZone,
    featured: dynamic.featured ?? false,
    status: dynamic.status ?? "active",
    participationType: participation?.type ?? "form",
    participationUrl: participation?.url ?? "",
    requiresAuth: participation?.requiresAuth ?? false,
    fields: (participation?.fields ?? []).map((field: DynamicFormField) => ({
      rowId: uuid(),
      key: field.key,
      type: field.type,
      label: field.label,
      required: field.required ?? false,
    })),
    termsUrl: dynamic.termsUrl ?? "",
    privacyUrl: dynamic.privacyUrl ?? "",
    consentVersion: dynamic.consentVersion ?? "1",
  };
}

function validHttps(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateDynamicForm(
  form: DynamicFormState,
  existing: Dynamic[],
  originalId?: string,
): string | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug) || form.slug.length > 100) {
    return "Slug must use lowercase letters, numbers and hyphens only (max 100).";
  }
  if (existing.some((item) => item.slug === form.slug && item.id !== originalId)) {
    return "Another campaign already uses this slug.";
  }
  if (!form.title.trim() || form.title.length > 160) return "Title is required (max 160).";
  if (!form.description.trim() || form.description.length > 5000) return "Description is required (max 5000).";
  if (!form.instructions.trim() || form.instructions.length > 5000) return "Instructions are required (max 5000).";
  if (!validHttps(form.imageUrl)) return "Image URL must be a public HTTPS URL.";
  if (!validHttps(form.termsUrl) || !validHttps(form.privacyUrl)) {
    return "Terms and privacy URLs must use public HTTPS URLs.";
  }
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(form.consentVersion)) return "Consent version is invalid.";
  try {
    new Intl.DateTimeFormat("en", { timeZone: form.timezone }).format();
  } catch {
    return "Timezone must be a valid IANA timezone (for example America/Detroit).";
  }
  const startsAt = zonedInputToIso(form.startsAt, form.timezone);
  const endsAt = zonedInputToIso(form.endsAt, form.timezone);
  if (!startsAt || !endsAt) return "Start and end dates are required.";
  const duration = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  if (duration <= 0 || duration > 366 * 24 * 60 * 60 * 1000) {
    return "Campaign duration must be positive and no longer than 366 days.";
  }
  if (form.featured && existing.some((item) => item.featured && item.id !== originalId)) {
    return "Another campaign is already featured. Unfeature it before featuring this campaign.";
  }

  if (form.participationType === "external_url") {
    if (!validHttps(form.participationUrl)) return "External participation requires a public HTTPS URL.";
  } else {
    if (!form.requiresAuth && !form.fields.length) {
      return "Anonymous forms require at least one field.";
    }
    if (form.fields.length > 12) return "A form can contain at most 12 fields.";
    const keys = new Set<string>();
    for (const field of form.fields) {
      if (!/^[a-z][a-z0-9_]{0,39}$/.test(field.key)) return `Invalid field key: ${field.key || "(empty)"}.`;
      if (keys.has(field.key)) return `Field key ${field.key} is duplicated.`;
      keys.add(field.key);
      if (!field.label.trim() || field.label.length > 100) return `Field ${field.key} needs a label (max 100).`;
    }
    if (
      !form.requiresAuth &&
      !form.fields.some((field) => field.required && (field.type === "email" || field.type === "phone"))
    ) {
      return "Anonymous forms require a required email or phone field.";
    }
  }
  return null;
}

export function dynamicFromForm(form: DynamicFormState): Dynamic {
  const startsAt = zonedInputToIso(form.startsAt, form.timezone);
  const endsAt = zonedInputToIso(form.endsAt, form.timezone);
  if (!startsAt || !endsAt) throw new Error("Invalid campaign dates");

  const participation = form.participationType === "external_url"
    ? {
        type: "external_url" as const,
        url: form.participationUrl,
        requiresAuth: false,
        fields: [],
      }
    : {
        type: "form" as const,
        url: null,
        requiresAuth: form.requiresAuth,
        fields: form.fields.map(({ key, type, label, required }) => ({ key, type, label, required })),
      };

  return {
    id: form.id,
    slug: form.slug.trim(),
    title: form.title.trim(),
    artworkLabel: form.artworkLabel.trim(),
    context: form.context.trim(),
    description: form.description.trim(),
    instructions: form.instructions.trim(),
    imageUrl: form.imageUrl.trim(),
    startsAt,
    endsAt,
    timezone: form.timezone.trim(),
    featured: form.featured,
    status: form.status,
    participation,
    termsUrl: form.termsUrl.trim(),
    privacyUrl: form.privacyUrl.trim(),
    consentVersion: form.consentVersion.trim(),
  };
}

export function newField(): DynamicFieldState {
  return { rowId: uuid(), key: "", type: "text", label: "", required: false };
}
