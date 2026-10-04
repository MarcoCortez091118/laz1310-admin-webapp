import { z } from "zod";

const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().default(""),
  VITE_FIREBASE_API_KEY: z.string().min(1).default("mock-api-key"),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1).default("laz1310-mock.firebaseapp.com"),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1).default("laz1310-mock"),
  VITE_FIREBASE_APP_ID: z.string().min(1).default("1:000000000000:web:mockappid"),
  VITE_FIREBASE_APPCHECK_SITE_KEY: z.string().min(1).default("mock-site-key"),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function readEnv(source: ImportMetaEnv | Record<string, string | undefined> = import.meta.env): AppEnv {
  const normalized = {
    VITE_API_BASE_URL: source.VITE_API_BASE_URL || "",
    VITE_FIREBASE_API_KEY: source.VITE_FIREBASE_API_KEY || "mock-api-key",
    VITE_FIREBASE_AUTH_DOMAIN: source.VITE_FIREBASE_AUTH_DOMAIN || "laz1310-mock.firebaseapp.com",
    VITE_FIREBASE_PROJECT_ID: source.VITE_FIREBASE_PROJECT_ID || "laz1310-mock",
    VITE_FIREBASE_APP_ID: source.VITE_FIREBASE_APP_ID || "1:000000000000:web:mockappid",
    VITE_FIREBASE_APPCHECK_SITE_KEY: source.VITE_FIREBASE_APPCHECK_SITE_KEY || "mock-site-key",
  };
  const parsed = EnvSchema.safeParse(normalized);
  if (!parsed.success) {
    return {
      VITE_API_BASE_URL: "",
      VITE_FIREBASE_API_KEY: "mock-api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "laz1310-mock.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "laz1310-mock",
      VITE_FIREBASE_APP_ID: "1:000000000000:web:mockappid",
      VITE_FIREBASE_APPCHECK_SITE_KEY: "mock-site-key",
    };
  }
  return parsed.data;
}

export const env = readEnv();
