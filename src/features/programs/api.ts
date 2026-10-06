import { apiRequest, type ApiResult } from "../../api/client";
import type { Draft, PublicState, Station } from "../../api/types";
import type { Program, ScheduleEntry } from "./model";

export type ProgramPublicationState = "draft" | "live" | "changes_pending";

export interface ProgramPublicationStatus {
  stationId: string;
  programId: string;
  status: ProgramPublicationState;
  releaseId: string | null;
  publishedAt: string | null;
}

export interface ProgramTrashItem {
  id: string;
  stationId: string;
  programId: string;
  snapshot: Program;
  schedule: ScheduleEntry[];
  snapshotDigest: string;
  deletedAt: string;
  deletedBy: string;
  sourceDraftRevision: number;
  resultingDraftRevision: number;
  restoredAt: string | null;
  restoredBy: string | null;
  published: boolean;
}

export interface PublishedProgramOutsideDraft {
  stationId: string;
  stationName: string;
  program: Program;
  schedule: ScheduleEntry[];
  releaseId: string;
  publishedAt: string;
}

export interface ProgramTrashDeleteReceipt {
  id: string;
  deleted: true;
}

export const programsQueryKeys = {
  status: ["admin", "programs", "status"] as const,
  trash: ["admin", "programs", "trash"] as const,
  publishedOutsideDraft: ["admin", "programs", "published-outside-draft"] as const,
};

export function listPublishedStations(signal?: AbortSignal): Promise<ApiResult<Station[]>> {
  return apiRequest<Station[]>(
    "/api/v1/stations",
    { method: "GET" },
    { authenticated: false, signal },
  );
}

export function putStation(
  station: Station,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<Draft>> {
  if (!station.id) {
    throw new Error("Station ID is required before updating programs.");
  }

  return apiRequest<Draft>(
    `/api/v1/admin/stations/${encodeURIComponent(station.id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(station),
    },
    { ifMatch: etag, signal },
  );
}

export function getProgramPublicationStatus(
  signal?: AbortSignal,
): Promise<ApiResult<ProgramPublicationStatus[]>> {
  return apiRequest<ProgramPublicationStatus[]>(
    "/api/v1/admin/programs/status",
    { method: "GET" },
    { signal },
  );
}

export function publishProgram(
  stationId: string,
  programId: string,
  note: string,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<PublicState>> {
  return apiRequest<PublicState>(
    `/api/v1/admin/programs/${encodeURIComponent(stationId)}/${encodeURIComponent(programId)}/publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    },
    { ifMatch: etag, signal },
  );
}

export function trashProgram(
  stationId: string,
  programId: string,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<Draft>> {
  return apiRequest<Draft>(
    `/api/v1/admin/programs/${encodeURIComponent(stationId)}/${encodeURIComponent(programId)}`,
    { method: "DELETE" },
    { ifMatch: etag, signal },
  );
}

export function getProgramTrash(
  limit = 100,
  after?: string,
  signal?: AbortSignal,
): Promise<ApiResult<ProgramTrashItem[]>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);
  return apiRequest<ProgramTrashItem[]>(
    `/api/v1/admin/programs/trash?${params.toString()}`,
    { method: "GET" },
    { signal },
  );
}

export function getPublishedProgramsOutsideDraft(
  signal?: AbortSignal,
): Promise<ApiResult<PublishedProgramOutsideDraft[]>> {
  return apiRequest<PublishedProgramOutsideDraft[]>(
    "/api/v1/admin/programs/published-outside-draft",
    { method: "GET" },
    { signal },
  );
}

export function restoreProgram(
  trashId: string,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<Draft>> {
  return apiRequest<Draft>(
    `/api/v1/admin/programs/trash/${encodeURIComponent(trashId)}/restore`,
    { method: "POST" },
    { ifMatch: etag, signal },
  );
}

export function deleteProgramTrash(
  trashId: string,
  signal?: AbortSignal,
): Promise<ApiResult<ProgramTrashDeleteReceipt>> {
  return apiRequest<ProgramTrashDeleteReceipt>(
    `/api/v1/admin/programs/trash/${encodeURIComponent(trashId)}`,
    { method: "DELETE" },
    { signal },
  );
}
