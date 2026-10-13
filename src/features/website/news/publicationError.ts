import { ApiError } from "../../../api/errors";

/** Preserve the safe API-provided conflict cause; do not turn all 409s into a blind retry. */
export function websitePublicationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return `Publication was rejected (409): ${error.message}. Check the source article and revision before retrying.`;
    }
    if (error.status === 401 || error.status === 403) {
      return `Website publication authorization failed (${error.status}). ${error.message}`;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Website publishing request failed.";
}
