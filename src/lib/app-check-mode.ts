export type AppCheckMode = "enterprise" | "debug";

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

export function configureAppCheckDebugMode(
  mode: AppCheckMode,
  hostname: string,
  target: AppCheckDebugTarget,
): void {
  if (mode !== "debug") {
    return;
  }

  if (!isApprovedAppCheckDebugHost(hostname)) {
    throw new Error(
      "Firebase App Check debug mode is restricted to approved non-production hosts.",
    );
  }

  // Firebase generates and persists a browser-local debug token. The token must
  // be registered manually in Firebase App Check and is never committed or
  // embedded as a Vite secret.
  target.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}
