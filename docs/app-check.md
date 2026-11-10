# Firebase App Check — WebAdmin

The Admin WebApp signs in with Firebase Auth and sends App Check to FastAPI
on all authenticated administrative requests:

```http
Authorization: Bearer <firebase-id-token>
X-Firebase-AppCheck: <firebase-app-check-token>
```

The client is fail-closed: missing Auth or App Check prevents API requests.
App Check is initialized **before** Firebase Auth to support Firebase
Authentication App Check enforcement as well.

## Hosted production and previews: reCAPTCHA Enterprise

Every non-localhost hostname uses `ReCaptchaEnterpriseProvider`; no hosted
deployment generates or requires a manually registered debug token. This
includes `laz1310-adminwebapp.ai.studio` and `admin.laz1310.com`.

Prerequisites for the exact deployed domain:

1. In the same Google Cloud/Firebase project, create a reCAPTCHA Enterprise
   **Website score-based** key (not a challenge key) and allow the deployment
   hostname in the key's domain configuration.
2. Register the Firebase **Web App** in Firebase Console > App Check with
   the reCAPTCHA Enterprise key. Confirm the App ID matches
   `VITE_FIREBASE_APP_ID`, and `VITE_FIREBASE_PROJECT_ID` matches FastAPI.
3. Configure production `VITE_FIREBASE_APPCHECK_SITE_KEY` to the public
   reCAPTCHA Enterprise site key. This is a public client identifier, not
   an Admin SDK secret. Ensure Firebase Authentication authorized domains
   allow the admin host and FastAPI CORS includes the exact HTTPS origin.
4. Deploy the reviewed version and confirm a browser can sign in without
   using Firebase App Check debug tokens. On `/api/v1/admin/me`, verify a
   valid App Check token + Firebase Auth ID token are sent and admin/editor
   roles are enforced by FastAPI. Verify token auto-refresh after expiry.
5. Monitor Firebase App Check metrics for WebApp and Android/iOS/Website
   clients sharing the Firebase project. Enable Firebase Auth/Firestore/
   Storage enforcement **only after every legitimate client** can attest.
   Turning enforcement on too early may lock out both administrators and
   end-user registrations. Revert the corresponding Firebase Console
   enforcement toggle if production users are blocked.

## Local development only: debug

`localhost` and `127.0.0.1` are the only debug-approved hostnames.
A local browser may display a generated App Check debug token; register it
temporarily under Firebase Console > App Check > Manage debug tokens for
local tests. Never commit, distribute or embed this token in Vite variables.
Revoke debug tokens when the development session/environment is retired.

## Operator acceptance and failure recovery

- Fail closed on an invalid or missing token; never add an API bypass or
  remove the `X-Firebase-AppCheck` requirement to fix a configuration issue.
- Check that the browser is not blocked by a content/security policy that
  prevents reCAPTCHA Enterprise attestation.
- Verify wrong-role accounts receive 403 and unverified users are rejected.
- If an Enterprise host fails, check its domain allowlist, App Check Web
  registration, public site key, project IDs and browser/network access.
- Rollback code through the regular reviewed deployment. If Firebase
  product-specific enforcement itself causes outages, disable enforcement
  for the affected product from Firebase Console while diagnosing.
