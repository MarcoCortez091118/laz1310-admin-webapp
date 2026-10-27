import { apiRequest, type ApiResult } from "../../../api/client";

export type PopupPlacement = "home" | "programacion" | "actividades";
export interface PopupImage { url: string; link: string }
export interface PopupContent {
  enabled: boolean;
  delay: number;
  images: PopupImage[];
  placements: PopupPlacement[];
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
}
export interface PopupDraft {
  revision: number;
  content: PopupContent;
  origin: "new" | "legacy";
  legacyFingerprint: string | null;
}
export interface PopupPublication {
  revision: number;
  draftRevision: number;
  releaseId: string;
  content: PopupContent;
}
export interface PopupRelease extends PopupPublication {
  id: string;
  action: "publish" | "rollback";
  previousReleaseId: string | null;
}
export interface PopupLegacy {
  sourceExists: boolean;
  fingerprint: string | null;
  content: PopupContent | null;
}

const ROOT = "/api/v1/admin/website/popup";
const conditional = (revision: number) => ({ ifMatch: `"${revision}"` });

export const popupKeys = {
  draft: ["admin", "website", "popup", "draft"] as const,
  legacy: ["admin", "website", "popup", "legacy"] as const,
  publication: ["admin", "website", "popup", "publication"] as const,
  releases: ["admin", "website", "popup", "releases"] as const,
};
export const getPopupLegacy = (): Promise<ApiResult<PopupLegacy>> =>
  apiRequest(ROOT + "/legacy");
export const getPopupDraft = (): Promise<ApiResult<PopupDraft>> =>
  apiRequest(ROOT + "/draft");
export const getPopupPublication = (): Promise<ApiResult<PopupPublication>> =>
  apiRequest(ROOT + "/publication");
export const getPopupReleases = (): Promise<ApiResult<{ items: PopupRelease[] }>> =>
  apiRequest(ROOT + "/releases?limit=25");

export const importPopupLegacy = (fingerprint: string) =>
  apiRequest<PopupDraft>(ROOT + "/draft/import", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fingerprint }),
  }, conditional(0));
export const savePopupDraft = (content: PopupContent, revision: number) =>
  apiRequest<PopupDraft>(ROOT + "/draft", {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(content),
  }, conditional(revision));
export const publishPopup = (revision: number) =>
  apiRequest<PopupRelease>(ROOT + "/publish", { method: "POST" }, conditional(revision));
export const rollbackPopup = (revision: number, releaseId: string) =>
  apiRequest<PopupRelease>(ROOT + "/rollback", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ releaseId }),
  }, conditional(revision));
