# Firebase App Check

The Admin WebApp authenticates with Firebase Auth and sends a Firebase App Check token to FastAPI on every authenticated administrative request.

## Security contract

Authenticated requests must contain both headers:

```http
Authorization: Bearer <firebase-id-token>
X-Firebase-AppCheck: <firebase-app-check-token>
```

The client is fail-closed. If Firebase App Check cannot issue a token, the request to FastAPI is not sent.

## Enterprise mode

`enterprise` is the default and the only mode intended for production:

```env
VITE_FIREBASE_APPCHECK_MODE=enterprise
VITE_FIREBASE_APPCHECK_SITE_KEY=<recaptcha-enterprise-site-key>
```

The site key must belong to the Firebase project's registered Fraud Defense / reCAPTCHA Enterprise provider and must authorize the deployed hostname.

## Debug mode for the AI Studio test deployment

The temporary test deployment may use Firebase's official App Check debug provider while the reCAPTCHA Enterprise provider issue is being isolated:

```env
VITE_FIREBASE_APPCHECK_MODE=debug
```

Debug mode is runtime-restricted to:

- `laz1310-adminwebapp.ai.studio`
- `localhost`
- `127.0.0.1`

Any other hostname fails before App Check initialization. No debug token is committed or embedded in Vite configuration.

After deploying with debug mode:

1. Open the browser console on the test deployment.
2. Copy the `AppCheck debug token` printed by Firebase.
3. In Firebase Console, open **App Check → Apps → LA Z 1310 Admin WebApp → Manage debug tokens**.
4. Register that browser-local token.
5. Reload the test deployment and sign in again.
6. Verify `/api/v1/admin/me` includes `X-Firebase-AppCheck` and returns the staff identity.

The generated token is stored locally by Firebase for the same browser/machine. Treat registered debug tokens as credentials: never commit or share them, and revoke them after testing.

## Returning to production

Before deploying a production hostname such as `admin.laz1310.com`, set:

```env
VITE_FIREBASE_APPCHECK_MODE=enterprise
```

Debug mode is intentionally blocked on production/arbitrary hosts even if the environment variable is misconfigured.
