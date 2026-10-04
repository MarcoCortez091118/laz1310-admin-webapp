export type NotificationCategory = "general" | "radio" | "programs" | "dynamics";
export type CampaignStatus =
  | "draft"
  | "queued"
  | "sending"
  | "sent"
  | "partially_failed"
  | "failed";

export interface NotificationTarget {
  kind: "route";
  value: string;
}

export type NotificationAudience =
  | { type: "all_opted_in" }
  | { type: "user"; userId: string };

export interface CampaignInput {
  title: string;
  body: string;
  category: NotificationCategory;
  target: NotificationTarget;
  audience: NotificationAudience;
}

export interface NotificationCampaign extends CampaignInput {
  id: string;
  revision: number;
  status: CampaignStatus;
  targetedCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  inboxCount: number;
  createdAt: string;
  createdBy: string;
  queuedAt: string | null;
  sentAt: string | null;
}

export interface CampaignPage {
  items: NotificationCampaign[];
  nextCursor: string | null;
}

export const CATEGORIES: { value: NotificationCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "radio", label: "Radio" },
  { value: "programs", label: "Programs" },
  { value: "dynamics", label: "Dynamics" },
];

export const CAMPAIGN_STATUSES: CampaignStatus[] = [
  "draft",
  "queued",
  "sending",
  "sent",
  "partially_failed",
  "failed",
];

const DYNAMIC_ROUTE = /^\/dynamics\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function defaultCampaignInput(): CampaignInput {
  return {
    title: "",
    body: "",
    category: "general",
    target: { kind: "route", value: "/home" },
    audience: { type: "all_opted_in" },
  };
}

export function campaignToInput(campaign: NotificationCampaign): CampaignInput {
  return {
    title: campaign.title,
    body: campaign.body,
    category: campaign.category,
    target: campaign.target,
    audience: campaign.audience,
  };
}

export function isSupportedTarget(value: string): boolean {
  return value === "/home" || value === "/radio" || value === "/dynamics" || DYNAMIC_ROUTE.test(value);
}

export function contentBytes(input: CampaignInput): number {
  return new TextEncoder().encode(
    JSON.stringify({
      title: input.title,
      body: input.body,
      target: input.target,
    }),
  ).length;
}

export function validateCampaignInput(input: CampaignInput): string | null {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || title.length > 120) return "Title must contain 1–120 characters.";
  if (!body || body.length > 1000) return "Body must contain 1–1000 characters.";
  const plainText = `${title}${body}`;
  if (/[<>\u0000-\u001f\u007f]/u.test(plainText)) {
    return "Title and body must be plain text without markup or control characters.";
  }
  if (!isSupportedTarget(input.target.value)) return "Select a supported in-app destination.";
  if (input.audience.type === "user" && !UUID.test(input.audience.userId.trim())) {
    return "User audience requires the internal User UUID.";
  }
  if (contentBytes(input) > 2500) return "Notification content exceeds the 2500-byte UTF-8 budget.";
  return null;
}

export function statusLabel(status: CampaignStatus): string {
  switch (status) {
    case "partially_failed":
      return "Partially failed";
    default:
      return status[0].toUpperCase() + status.slice(1);
  }
}

export function isTerminal(status: CampaignStatus): boolean {
  return status === "sent" || status === "partially_failed" || status === "failed";
}
