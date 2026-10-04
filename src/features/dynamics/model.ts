import type { Dynamic } from "../../api/types";

export type DynamicFormField = NonNullable<Dynamic["participation"]["fields"]>[number];

export const FIELD_TYPES: DynamicFormField["type"][] = ["text", "email", "phone", "textarea"];
export const DEFAULT_TIMEZONE = "America/Detroit";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;
const CONSENT_VERSION_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function isPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function partsFor(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = partsFor(date, timeZone);
  const representedUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return representedUtc - date.getTime();
}

export function zonedLocalToIso(localValue: string, timeZone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localValue);
  if (!match || !isValidTimezone(timeZone)) return "";
  const [, y, m, d, hh, mm] = match;
  const guess = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), 0));
  let offset = zoneOffsetMs(guess, timeZone);
  let instant = new Date(guess.getTime() - offset);
  const refinedOffset = zoneOffsetMs(instant, timeZone);
  if (refinedOffset !== offset) {
    offset = refinedOffset;
    instant = new Date(guess.getTime() - offset);
  }
  return instant.toISOString();
}

export function isoToZonedLocal(iso: string, timeZone: string): string {
  if (!iso || !isValidTimezone(timeZone)) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = partsFor(date, timeZone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function createFormField(type: DynamicFormField["type"] = "text"): DynamicFormField {
  return {
    key: type === "email" ? "email" : type === "phone" ? "phone" : `field_${crypto.randomUUID().slice(0, 8)}`,
    type,
    label: type === "email" ? "Email" : type === "phone" ? "Phone" : "New field",
    required: type === "email" || type === "phone",
  } as DynamicFormField;
}

export function createDynamic(): Dynamic {
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    id: crypto.randomUUID(),
    slug: "",
    title: "",
    artworkLabel: "PROMOCIÓN",
    context: "LA Z 1310",
    description: "",
    instructions: "",
    imageUrl: "",
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    timezone: DEFAULT_TIMEZONE,
    featured: false,
    status: "active",
    participation: {
      type: "form",
      url: null,
      requiresAuth: false,
      fields: [createFormField("email")],
    },
    termsUrl: "",
    privacyUrl: "",
    consentVersion: "1",
  } as Dynamic;
}

export function normalizeDynamic(dynamic: Dynamic): Dynamic {
  const participation = dynamic.participation.type === "external_url"
    ? {
        type: "external_url" as const,
        url: dynamic.participation.url?.trim() || null,
        requiresAuth: false,
        fields: [],
      }
    : {
        type: "form" as const,
        url: null,
        requiresAuth: dynamic.participation.requiresAuth ?? false,
        fields: (dynamic.participation.fields ?? []).map((field) => ({
          ...field,
          key: field.key.trim().toLowerCase(),
          label: field.label.trim(),
          required: field.required ?? false,
        })),
      };

  return {
    ...dynamic,
    slug: dynamic.slug.trim().toLowerCase(),
    title: dynamic.title.trim(),
    artworkLabel: (dynamic.artworkLabel ?? "PROMOCIÓN").trim(),
    context: (dynamic.context ?? "LA Z 1310").trim(),
    description: dynamic.description.trim(),
    instructions: dynamic.instructions.trim(),
    imageUrl: dynamic.imageUrl.trim(),
    timezone: dynamic.timezone.trim(),
    featured: dynamic.featured ?? false,
    status: dynamic.status ?? "active",
    participation,
    termsUrl: dynamic.termsUrl.trim(),
    privacyUrl: dynamic.privacyUrl.trim(),
    consentVersion: (dynamic.consentVersion ?? "1").trim(),
  } as Dynamic;
}

export function validateDynamic(dynamic: Dynamic): string[] {
  const value = normalizeDynamic(dynamic);
  const issues: string[] = [];
  if (!value.title || value.title.length > 160) issues.push("Title must contain 1 to 160 characters.");
  if (!SLUG_PATTERN.test(value.slug) || value.slug.length > 100) issues.push("Slug must use lowercase letters, numbers, and single hyphens.");
  if (!value.description || value.description.length > 5000) issues.push("Description must contain 1 to 5000 characters.");
  if (!value.instructions || value.instructions.length > 5000) issues.push("Instructions must contain 1 to 5000 characters.");
  if (!isPublicHttpsUrl(value.imageUrl)) issues.push("Artwork must use a public HTTPS URL.");
  if (!isPublicHttpsUrl(value.termsUrl)) issues.push("Terms URL must use public HTTPS.");
  if (!isPublicHttpsUrl(value.privacyUrl)) issues.push("Privacy URL must use public HTTPS.");
  if (!isValidTimezone(value.timezone)) issues.push("Timezone must be a valid IANA timezone.");
  if (!CONSENT_VERSION_PATTERN.test(value.consentVersion ?? "")) issues.push("Consent version contains unsupported characters.");

  const start = new Date(value.startsAt);
  const end = new Date(value.endsAt);
  const duration = end.getTime() - start.getTime();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || duration <= 0) {
    issues.push("End date must be after the start date.");
  } else if (duration > 366 * 24 * 60 * 60 * 1000) {
    issues.push("Campaign duration cannot exceed 366 days.");
  }

  if ((value.artworkLabel ?? "").length < 1 || (value.artworkLabel ?? "").length > 80) {
    issues.push("Artwork label must contain 1 to 80 characters.");
  }
  if ((value.context ?? "").length < 1 || (value.context ?? "").length > 100) {
    issues.push("Context must contain 1 to 100 characters.");
  }

  const participation = value.participation;
  if (participation.type === "external_url") {
    if (!participation.url || !isPublicHttpsUrl(participation.url)) {
      issues.push("External participation requires a public HTTPS URL.");
    }
  } else {
    const fields = participation.fields ?? [];
    if (!fields.length) issues.push("Form participation requires at least one field.");
    if (fields.length > 12) issues.push("Form participation supports at most 12 fields.");
    const keys = new Set<string>();
    for (const field of fields) {
      if (!FIELD_KEY_PATTERN.test(field.key)) issues.push(`Field key “${field.key}” is invalid.`);
      if (keys.has(field.key)) issues.push(`Field key “${field.key}” is duplicated.`);
      keys.add(field.key);
      if (!field.label || field.label.length > 100) issues.push(`Field “${field.key}” needs a label of 1 to 100 characters.`);
    }
    if (!participation.requiresAuth && !fields.some((field) => field.required && (field.type === "email" || field.type === "phone"))) {
      issues.push("Anonymous forms require a required email or phone field.");
    }
  }

  return [...new Set(issues)];
}

export type DynamicWindowState = "upcoming" | "open" | "ended" | "closed";

export function dynamicWindowState(dynamic: Dynamic, now = new Date()): DynamicWindowState {
  if ((dynamic.status ?? "active") === "closed") return "closed";
  const start = new Date(dynamic.startsAt).getTime();
  const end = new Date(dynamic.endsAt).getTime();
  if (now.getTime() < start) return "upcoming";
  if (now.getTime() >= end) return "ended";
  return "open";
}
