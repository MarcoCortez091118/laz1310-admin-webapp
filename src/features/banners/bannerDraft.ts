import type { Card } from "../../api/types";

/** Pure local staging; persisting to Draft remains a separate explicit mutation. */
export function bannerDraftError(banner: Card): string | null {
  if (!banner.title.trim()) return "Banner title is required.";
  if (!banner.imageUrl?.startsWith("https://")) {
    return "Choose a managed image before applying this banner.";
  }
  if (banner.link?.kind === "external" && !banner.link.target.startsWith("https://")) {
    return "Destination URL must start with https://.";
  }
  return null;
}

export function stageBanner(
  current: Card[],
  editing: { index: number | null; banner: Card },
): Card[] {
  if (editing.index === null) return [...current, editing.banner];
  return current.map((item, index) => index === editing.index ? editing.banner : item);
}
