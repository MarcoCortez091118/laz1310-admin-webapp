import { signInWithEmailAndPassword } from "firebase/auth";
import { type FormEvent, useState } from "react";
import { auth } from "../../lib/firebase";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(undefined);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      window.location.assign("/");
    } catch {
      setMessage("Sign-in failed. Verify the account and configured Firebase provider.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div>
          <p className="eyebrow">LA Z 1310</p>
          <h1>Admin Control Plane</h1>
          <p className="muted">Authorized editorial and platform staff only.</p>
        </div>
        <form onSubmit={submit} className="form-stack">
          <label>
            Email
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {message ? <p className="error-copy">{message}</p> : null}
          <button disabled={submitting} type="submit">
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
