/** Website article advertising is displayed in a square slot (1:1) by the public site. */
export const WEBSITE_AD_ASPECT_RATIO = "1:1";
export const WEBSITE_AD_RECOMMENDED_PX = 1080;

export function safeAdvertisingImageUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    ) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export type AdvertisingImageShape = "square" | "will-crop" | "unknown";

export function advertisingImageShape(width: number, height: number): AdvertisingImageShape {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "unknown";
  }
  return width === height ? "square" : "will-crop";
}
