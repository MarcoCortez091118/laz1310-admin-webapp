import { getToken } from "firebase/app-check";
import { env } from "../lib/env";
import { appCheck, auth } from "../lib/firebase";
import { toApiError } from "./errors";

export interface ApiRequestOptions {
  ifMatch?: string;
  signal?: AbortSignal;
  authenticated?: boolean;
}

export interface ApiResult<T> {
  data: T;
  etag?: string;
  requestId?: string;
  retryAfter?: string;
}

export class AppCheckTokenUnavailableError extends Error {
  constructor() {
    super("Firebase App Check token unavailable; administrative request blocked.");
    this.name = "AppCheckTokenUnavailableError";
  }
}

function apiUrl(path: string): string {
  const base = env.VITE_API_BASE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

async function securityHeaders(authenticated: boolean): Promise<Headers> {
  const headers = new Headers({ Accept: "application/json" });

  if (!authenticated) {
    return headers;
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("Authenticated API request attempted without a Firebase user");
  }

  const idToken = await user.getIdToken();

  let appCheckToken: Awaited<ReturnType<typeof getToken>>;
  try {
    appCheckToken = await getToken(appCheck(), false);
  } catch {
    throw new AppCheckTokenUnavailableError();
  }

  if (!appCheckToken.token.trim()) {
    throw new AppCheckTokenUnavailableError();
  }

  headers.set("Authorization", `Bearer ${idToken}`);
  headers.set("X-Firebase-AppCheck", appCheckToken.token);
  return headers;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  const headers = await securityHeaders(options.authenticated ?? true);

  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  if (options.ifMatch) {
    headers.set("If-Match", options.ifMatch);
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    signal: options.signal,
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  const data = (await response.json()) as T;
  return {
    data,
    etag: response.headers.get("ETag") ?? undefined,
    requestId: response.headers.get("X-Request-ID") ?? undefined,
    retryAfter: response.headers.get("Retry-After") ?? undefined,
  };
}
