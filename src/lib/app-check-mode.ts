export type ResolvedAppCheckMode = "enterprise" | "debug";

export interface AppCheckDebugTarget {
  FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
}

const APPROVED_DEBUG_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "laz1310-adminwebapp.ai.studio",
]);

export function isApprovedAppCheckDebugHost(hostname: string): boolean {
  return APPROVED_DEBUG_HOSTS.has(hostname.trim().toLowerCase());
}

export function resolveAppCheckMode(hostname: string): ResolvedAppCheckMode {
  return isApprovedAppCheckDebugHost(hostname) ? "debug" : "enterprise";
}

export function configureAppCheckForHost(
  hostname: string,
  target: AppCheckDebugTarget,
): ResolvedAppCheckMode {
  const mode = resolveAppCheckMode(hostname);

  if (mode === "debug") {
    // Firebase generates and persists a browser-local debug token. The token
    // must be registered manually in Firebase App Check. It is intentionally
    // never embedded in Vite environment variables or committed to Git.
    target.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  return mode;
}
