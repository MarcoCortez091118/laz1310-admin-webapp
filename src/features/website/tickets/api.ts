import { apiRequest, type ApiResult } from "../../../api/client";

export interface PromotionContent {
  webUrl: string;
  mobileUrl: string;
  actionType: "enlace" | "formulario";
  linkUrl: string | null;
  eventName: string;
  position: number;
}
export interface PromotionDraft {
  id: string;
  revision: number;
  content: PromotionContent;
  state: "active" | "trashed";
  origin: "new" | "legacy";
  trashedAt: string | null;
  updatedAt: string;
  updatedBy: string;
}
export interface PromotionPublic {
  id: string; revision: number; draftRevision: number; releaseId: string;
  content: PromotionContent; status: "published" | "unpublished" | "trashed";
  publishedAt: string; publishedBy: string;
}
export interface LegacyPromotion { id: string; fingerprint: string; content: PromotionContent }
export interface PromotionAsset {
  id: string; url: string; alt: string; width: number; height: number;
  sizeBytes: number; contentType: string;
}
const ROOT = "/api/v1/admin/website/ticket-promotions";
const MEDIA = "/api/v1/admin/website/ticket-promotion-media";
const entry = (id: string) => ROOT + "/" + encodeURIComponent(id);
const conditional = (revision: number) => ({ ifMatch: `"${revision}"` });

export const promotionKeys = {
  list: (state: string) => ["website", "ticket-promotions", state] as const,
  legacy: ["website", "ticket-promotions", "legacy"] as const,
  publication: (id: string) => ["website", "ticket-promotions", id, "publication"] as const,
};
export const listPromotions = (state: "active" | "trashed"): Promise<ApiResult<{items: PromotionDraft[]}>> =>
  apiRequest(`${ROOT}?state=${state}`);
export const legacyPromotions = (): Promise<ApiResult<{items: LegacyPromotion[]; warnings: string[]}>> =>
  apiRequest(ROOT + "/legacy");
export const promotionPublication = (id: string): Promise<ApiResult<PromotionPublic>> =>
  apiRequest(entry(id) + "/publication");
export const savePromotion = (
  id: string, revision: number, content: PromotionContent,
): Promise<ApiResult<PromotionDraft>> =>
  apiRequest(entry(id) + "/draft", {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(content),
  }, conditional(revision));
export const importPromotion = (legacy: LegacyPromotion): Promise<ApiResult<PromotionDraft>> =>
  apiRequest(entry(legacy.id) + "/import", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fingerprint: legacy.fingerprint }),
  }, conditional(0));
export const promotionAction = (
  id: string, action: "publish" | "unpublish" | "trash" | "restore", revision: number,
): Promise<ApiResult<unknown>> =>
  apiRequest(entry(id) + "/" + action, { method: "POST" }, conditional(revision));
export const purgePromotion = (id: string, revision: number): Promise<ApiResult<{deleted: boolean}>> =>
  apiRequest(entry(id), { method: "DELETE" }, conditional(revision));
export const listPromotionMedia = (): Promise<ApiResult<PromotionAsset[]>> =>
  apiRequest(MEDIA + "?limit=100");
export const uploadPromotionMedia = (file: File, alt: string): Promise<ApiResult<PromotionAsset>> => {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return Promise.reject(new Error("Only JPEG, PNG and WebP files are accepted."));
  }
  if (!file.size || file.size > 5 * 1024 * 1024) {
    return Promise.reject(new Error("Image must not exceed 5 MiB."));
  }
  return apiRequest(MEDIA + "/" + crypto.randomUUID() + "?alt=" +
    encodeURIComponent(alt.trim() || "Website Ticket Promotion"), {
      method: "PUT", headers: { "Content-Type": file.type }, body: file,
    });
};
