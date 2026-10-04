import { z } from "zod";

const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),
  VITE_FIREBASE_APPCHECK_SITE_KEY: z.string().min(1),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function readEnv(source: ImportMetaEnv = import.meta.env): AppEnv {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error("Invalid Admin WebApp environment configuration");
  }
  return parsed.data;
}

export const env = readEnv();
