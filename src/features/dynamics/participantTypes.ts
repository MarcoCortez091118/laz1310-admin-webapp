import type { AdminParticipation } from "../../api/types";

export type AccountParticipation = AdminParticipation & {
  account?: {
    userId?: string | null;
    displayName?: string | null;
    email?: string | null;
    emailVerified?: boolean;
  } | null;
};
