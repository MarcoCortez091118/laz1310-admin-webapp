export type ApiErrorKind =
  | "unauthenticated"
  | "forbidden"
  | "conflict"
  | "payload-too-large"
  | "validation"
  | "rate-limited"
  | "unavailable"
  | "unexpected";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly kind: ApiErrorKind,
    readonly requestId?: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiErrorKind(status: number): ApiErrorKind {
  switch (status) {
    case 401:
      return "unauthenticated";
    case 403:
      return "forbidden";
    case 409:
      return "conflict";
    case 413:
      return "payload-too-large";
    case 422:
      return "validation";
    case 429:
      return "rate-limited";
    case 502:
    case 503:
    case 504:
      return "unavailable";
    default:
      return "unexpected";
  }
}

export async function toApiError(response: Response): Promise<ApiError> {
  let message = response.statusText || "Request failed";
  try {
    const body: unknown = await response.clone().json();
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof body.detail === "string"
    ) {
      message = body.detail;
    }
  } catch {
    // Never expose raw response bodies from an administrative boundary.
  }

  const retryAfter = response.headers.get("Retry-After");
  const parsedRetry = retryAfter ? Number.parseInt(retryAfter, 10) : Number.NaN;

  return new ApiError(
    message,
    response.status,
    apiErrorKind(response.status),
    response.headers.get("X-Request-ID") ?? undefined,
    Number.isFinite(parsedRetry) ? parsedRetry : undefined,
  );
}
