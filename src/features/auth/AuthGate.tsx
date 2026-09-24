import { Navigate } from "@tanstack/react-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: User };

export function AuthGate({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        setState(
          user
            ? { status: "authenticated", user }
            : { status: "anonymous", user: null },
        );
      }),
    [],
  );

  if (state.status === "loading") {
    return <main className="centered-state">Checking secure session…</main>;
  }

  if (state.status === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  return children;
}
