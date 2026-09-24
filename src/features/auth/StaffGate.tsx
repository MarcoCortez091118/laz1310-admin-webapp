import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  type PropsWithChildren,
  useContext,
} from "react";
import { apiRequest } from "../../api/client";
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
    const forbidden =
      staff.error instanceof ApiError &&
      (staff.error.kind === "forbidden" || staff.error.kind === "unauthenticated");

    return (
      <main className="centered-state">
        <section className="state-card">
          <p className="eyebrow">{forbidden ? "Access denied" : "Admin API unavailable"}</p>
          <h1>{forbidden ? "This account is not authorized." : "Unable to verify staff access."}</h1>
          <p className="muted">
            {forbidden
              ? "FastAPI requires a verified Firebase account with the editor or admin role."
              : "Retry after the API or authentication dependency is available."}
          </p>
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
