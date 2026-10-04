import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  type PropsWithChildren,
  useContext,
} from "react";
import {
  apiRequest,
  AppCheckTokenUnavailableError,
} from "../../api/client";
import { ApiError } from "../../api/errors";
import type { StaffResponse } from "../../api/types";

const StaffContext = createContext<StaffResponse | null>(null);

export function StaffGate({ children }: PropsWithChildren) {
  const staff = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: async () => (await apiRequest<StaffResponse>("/api/v1/admin/me")).data,
    retry: false,
  });

  if (staff.isPending) {
    return <main className="centered-state">Verifying administrative access…</main>;
  }

  if (staff.error) {
    const appCheckFailure =
      staff.error instanceof AppCheckTokenUnavailableError ||
      (staff.error instanceof ApiError && staff.error.kind === "app-check");
    const forbidden =
      staff.error instanceof ApiError && staff.error.kind === "forbidden";
    const unauthenticated =
      staff.error instanceof ApiError && staff.error.kind === "unauthenticated";

    const eyebrow = appCheckFailure
      ? "App Check setup required"
      : forbidden
        ? "Access denied"
        : unauthenticated
          ? "Authentication required"
          : "Admin API unavailable";

    const title = appCheckFailure
      ? "This browser cannot attest the Admin WebApp yet."
      : forbidden
        ? "This account is not authorized."
        : unauthenticated
          ? "Your Firebase session is invalid or expired."
          : "Unable to verify staff access.";

    const description = appCheckFailure
      ? "On the approved test deployment, register the App Check debug token shown in the browser console under Firebase Console → App Check → Manage debug tokens, then reload. Production domains use reCAPTCHA Enterprise automatically."
      : forbidden
        ? "FastAPI requires a verified Firebase account with the editor or admin role."
        : unauthenticated
          ? "Sign in again to obtain a fresh Firebase ID token."
          : "Retry after the API or authentication dependency is available.";

    return (
      <main className="centered-state">
        <section className="state-card">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
          {staff.error instanceof ApiError && staff.error.requestId ? (
            <code>Request ID: {staff.error.requestId}</code>
          ) : null}
          <button onClick={() => void staff.refetch()} type="button">
            Retry
          </button>
        </section>
      </main>
    );
  }

  return <StaffContext.Provider value={staff.data}>{children}</StaffContext.Provider>;
}

export function useStaff(): StaffResponse {
  const staff = useContext(StaffContext);
  if (!staff) {
    throw new Error("useStaff must be used inside StaffGate");
  }
  return staff;
}
