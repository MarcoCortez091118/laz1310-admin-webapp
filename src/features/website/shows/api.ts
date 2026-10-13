import { apiRequest, type ApiResult } from "../../../api/client";

export interface ShowContent {
  title: string;
  schedule: string;
  imageUrl: string;
  position: number;
  linkUrl: string | null;
}
export interface ShowDraft {
  id: string;
  revision: number;
  content: ShowContent;
  state: "active" | "trashed";
  origin: "new" | "legacy";
  legacyFingerprint: string | null;
  trashedAt: string | null;
  updatedAt: string;
  updatedBy: string;
}
export interface ShowPublic {
  id: string;
  revision: number;
  draftRevision: number;
  releaseId: string;
  content: ShowContent;
  status: "published" | "unpublished" | "trashed";
  publishedAt: string;
  publishedBy: string;
}
export interface ShowRelease extends ShowPublic {
  action: "publish" | "unpublish" | "trash";
  previousReleaseId: string | null;
}
export interface LegacyShow {
  id: string;
  content: ShowContent;
  fingerprint: string;
  objectPath: string;
}
export interface ShowAsset {
  id: string; url: string; width: number; height: number;
  alt: string; sizeBytes: number; contentType: string;
}
const ROOT = "/api/v1/admin/website/shows";
const mediaRoot = "/api/v1/admin/website/show-media";
const show = (id: string) => ROOT + "/" + encodeURIComponent(id);
const conditional = (revision: number) => ({ ifMatch: `"${revision}"` });

export const showKeys = {
  list: (state: string) => ["website", "shows", state] as const,
  legacy: ["website", "shows", "legacy"] as const,
  publication: (id: string) => ["website", "shows", id, "publication"] as const,
};
export const listShows = (state: "active" | "trashed"): Promise<ApiResult<{items: ShowDraft[]}>> =>
  apiRequest(`${ROOT}?state=${state}`);
export const legacyShows = (): Promise<ApiResult<{items: LegacyShow[]; warnings: string[]}>> =>
  apiRequest(ROOT + "/legacy");
export const showPublication = (id: string): Promise<ApiResult<ShowPublic>> =>
  apiRequest(show(id) + "/publication");
export const showHistory = (id: string): Promise<ApiResult<{items: ShowRelease[]}>> =>
  apiRequest(show(id) + "/releases");
export const saveShow = (id: string, revision: number, content: ShowContent): Promise<ApiResult<ShowDraft>> =>
  apiRequest(show(id) + "/draft", {
    method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify(content),
  }, conditional(revision));
export const importShow = (legacy: LegacyShow): Promise<ApiResult<ShowDraft>> =>
  apiRequest(show(legacy.id) + "/import", {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({fingerprint: legacy.fingerprint}),
  }, conditional(0));
export const showAction = (id: string, action: "publish" | "unpublish" | "trash" | "restore", revision: number):
  Promise<ApiResult<ShowDraft | ShowRelease>> =>
  apiRequest(show(id) + "/" + action, {method: "POST"}, conditional(revision));
export const purgeShow = (id: string, revision: number): Promise<ApiResult<unknown>> =>
  apiRequest(show(id), {method: "DELETE"}, conditional(revision));
export const listShowMedia = (): Promise<ApiResult<ShowAsset[]>> =>
  apiRequest(mediaRoot + "?limit=100");
export const uploadShowMedia = (file: File, alt: string): Promise<ApiResult<ShowAsset>> => {
  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
    return Promise.reject(new Error("Only JPEG, PNG or WebP images are accepted."));
  }
  if (!file.size || file.size > 5 * 1024 * 1024) {
    return Promise.reject(new Error("The image must be smaller than 5 MiB."));
  }
  return apiRequest(mediaRoot + "/" + crypto.randomUUID() + "?alt=" +
    encodeURIComponent(alt.trim() || "Website Show"), {
      method: "PUT", headers: {"Content-Type": file.type}, body: file,
    });
};
