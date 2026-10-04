import type { Draft, PublicState } from "../../api/types";

export type ReleaseHistoryItem = {
  id: string;
  sourceRevision: number;
  publishedAt: string;
  publishedBy: string;
  note: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseReleaseHistory(value: unknown): ReleaseHistoryItem[] {
  if (!Array.isArray(value)) throw new Error("Invalid release history response.");
  return value.map((item) => {
    if (!isRecord(item)) throw new Error("Invalid release history entry.");
    const id = item.id;
    const sourceRevision = item.sourceRevision;
    const publishedAt = item.publishedAt;
    const publishedBy = item.publishedBy;
    const note = item.note;
    if (
      typeof id !== "string" ||
      typeof sourceRevision !== "number" ||
      !Number.isSafeInteger(sourceRevision) ||
      sourceRevision < 0 ||
      typeof publishedAt !== "string" ||
      typeof publishedBy !== "string" ||
      typeof note !== "string"
    ) {
      throw new Error("Invalid release history entry.");
    }
    return { id, sourceRevision, publishedAt, publishedBy, note };
  });
}

export function publicationStatus(
  draft: Draft | undefined,
  publicState: PublicState | undefined,
  releases: ReleaseHistoryItem[],
): "unpublished" | "current" | "changes" | "unknown" {
  if (!draft || !publicState) return "unknown";
  if (!publicState.releaseId) return "unpublished";
  const active = releases.find((release) => release.id === publicState.releaseId);
  if (!active) return "unknown";
  return active.sourceRevision === draft.revision ? "current" : "changes";
}

export function formatReleaseDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
