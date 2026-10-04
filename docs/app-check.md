# Firebase App Check

The Admin WebApp authenticates with Firebase Auth and sends a Firebase App Check token to FastAPI on every authenticated administrative request.

## Security contract

Authenticated requests must contain both headers:

```http
Authorization: Bearer <firebase-id-token>
X-Firebase-AppCheck: <firebase-app-check-token>
```

The client is fail-closed. If Firebase Auth or Firebase App Check cannot issue the required token, the administrative request is not sent to FastAPI.

## Deployment-mode selection

App Check attestation is selected from the runtime hostname instead of an environment switch. This avoids stale or missing `VITE_FIREBASE_APPCHECK_MODE` values in hosted previews.

Approved non-production hosts use Firebase's official App Check debug flow automatically:

- `laz1310-adminwebapp.ai.studio`
- `localhost`
- `127.0.0.1`

Every other hostname uses reCAPTCHA Enterprise automatically. This includes future production domains such as `admin.laz1310.com`.

`VITE_FIREBASE_APPCHECK_SITE_KEY` is still required because production/Enterprise deployments use the registered reCAPTCHA Enterprise key.

## First run on the AI Studio test deployment

The first browser that opens the approved test hostname receives a browser-local App Check debug token.

1. Open the browser console on `laz1310-adminwebapp.ai.studio`.
2. Copy the `AppCheck debug token` printed by Firebase.
3. In Firebase Console, open **App Check → Apps → LA Z 1310 Admin WebApp → Manage debug tokens**.
4. Register that browser-local token.
5. Reload the deployment and sign in again.
6. Verify `/api/v1/admin/me` includes both `Authorization` and `X-Firebase-AppCheck` and returns the staff identity.

The generated token is persisted locally by Firebase for that browser/machine. Treat registered debug tokens as credentials: never commit or share them, and revoke them after the test environment is retired.

## Production

No debug-mode environment variable is used in production. A production hostname automatically resolves to Enterprise attestation.

The reCAPTCHA Enterprise key must:

- belong to the same Firebase/Google Cloud project,
- be registered for the Web App in Firebase App Check,
- be a Website / Score key,
- authorize the production hostname.

If App Check fails, StaffGate reports an App Check configuration problem separately from account authorization failures.
