import { initializeApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";
import { getAuth, type Auth } from "firebase/auth";
import {
  configureAppCheckForHost,
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
    const hostname = window.location.hostname;
    const mode = configureAppCheckForHost(
      hostname,
      globalThis as AppCheckDebugTarget,
    );

    if (mode === "debug") {
      console.info(
        "Firebase App Check debug attestation is active for this approved test host. Register the browser debug token in Firebase Console before using the Admin API.",
      );
    }

    appCheckInstance = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(env.VITE_FIREBASE_APPCHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  }

  return appCheckInstance;
}
