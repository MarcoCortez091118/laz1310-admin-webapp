import type { ShowContent } from "./shows/api";
import type { PromotionContent } from "./tickets/api";
import type { WebsiteBanner } from "./banners/api";

/** Shared URL gate for navigation between editor steps; FastAPI validates again. */
export function isPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) &&
      !url.username && !url.password;
  } catch {
    return false;
  }
}

export function showInfoValid(content: ShowContent): boolean {
  return Boolean(content.title.trim()) &&
    Number.isInteger(content.position) && content.position >= 0 &&
    (!content.linkUrl || isPublicHttpsUrl(content.linkUrl));
}

export function showArtworkValid(content: ShowContent): boolean {
  return isPublicHttpsUrl(content.imageUrl);
}

export function bannerInfoValid(content: WebsiteBanner): boolean {
  return Boolean(content.id) && (!content.linkUrl || isPublicHttpsUrl(content.linkUrl));
}

export function bannerArtworkValid(content: WebsiteBanner): boolean {
  return isPublicHttpsUrl(content.url);
}

export function promotionInfoValid(content: PromotionContent): boolean {
  return Boolean(content.eventName.trim()) &&
    Number.isInteger(content.position) && content.position >= 0 &&
    (content.actionType !== "enlace" ||
      Boolean(content.linkUrl && isPublicHttpsUrl(content.linkUrl)));
}

export function promotionArtworkValid(content: PromotionContent): boolean {
  return (isPublicHttpsUrl(content.webUrl) || isPublicHttpsUrl(content.mobileUrl)) &&
    (!content.webUrl || isPublicHttpsUrl(content.webUrl)) &&
    (!content.mobileUrl || isPublicHttpsUrl(content.mobileUrl));
}
