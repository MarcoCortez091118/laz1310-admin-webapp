export const MEDIA_ACCEPT = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
export const MAX_ALT_LENGTH = 500;

export type SupportedMediaType = (typeof MEDIA_ACCEPT)[number];

export function isSupportedMediaType(value: string): value is SupportedMediaType {
  return MEDIA_ACCEPT.includes(value as SupportedMediaType);
}

export function validateMediaFile(file: Pick<File, "size" | "type">): string | null {
  if (!isSupportedMediaType(file.type)) {
    return "Choose a JPEG, PNG, or WebP image.";
  }
  if (file.size < 1 || file.size > MAX_MEDIA_BYTES) {
    return "Images must be between 1 byte and 5 MiB.";
  }
  return null;
}

export function validateAltText(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return "Image description is required.";
  if (normalized.length > MAX_ALT_LENGTH) {
    return `Image description must be ${MAX_ALT_LENGTH} characters or fewer.`;
  }
  return null;
}

export function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const kib = value / 1024;
  if (kib < 1024) return `${kib.toFixed(kib >= 10 ? 0 : 1)} KiB`;
  const mib = kib / 1024;
  return `${mib.toFixed(mib >= 10 ? 0 : 1)} MiB`;
}
