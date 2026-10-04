import { initializeApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";
import { getAuth, type Auth } from "firebase/auth";
import {
  configureAppCheckDebugMode,
  type AppCheckDebugTarget,
} from "./app-check-mode";
import { env } from "./env";

const firebaseApp = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

export const auth: Auth = getAuth(firebaseApp);

let appCheckInstance: AppCheck | undefined;

export function appCheck(): AppCheck {
  if (!appCheckInstance) {
    configureAppCheckDebugMode(
      env.VITE_FIREBASE_APPCHECK_MODE,
      window.location.hostname,
      globalThis as AppCheckDebugTarget,
    );

    appCheckInstance = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(env.VITE_FIREBASE_APPCHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  }

  return appCheckInstance;
}
