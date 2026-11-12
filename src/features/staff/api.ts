import { apiRequest } from "../../api/client";

export type StaffRole = "admin" | "editor";
export type StaffAction = "view" | "edit" | "publish" | "delete";

export interface StaffMember {
  uid: string;
  email: string;
  displayName: string;
  role: StaffRole;
  permissions: string[];
  enabled: boolean;
  revision: number;
  createdAt: string;
  updatedAt?: string;
}

export interface StaffInvitation {
  email: string;
  role: StaffRole;
  permissions: string[];
  createdAt: string;
  expiresAt: string;
  status: "pending";
  delivery?: "sent" | "manual" | "failed";
}

export interface CapabilityModule {
  id: string;
  label: string;
  actions: StaffAction[];
}

export interface StaffCatalog {
  modules: CapabilityModule[];
  roles: StaffRole[];
}

export interface StaffDirectory {
  members: StaffMember[];
  invitations: StaffInvitation[];
}

export interface InvitationInput {
  email: string;
  role: StaffRole;
  permissions: string[];
}

export interface InvitationResult extends StaffInvitation {
  delivery: "sent" | "manual" | "failed";
  inviteUrl: string;
}

export interface StaffChanges {
  role: StaffRole;
  permissions: string[];
  enabled: boolean;
}

export async function staffCatalog(signal?: AbortSignal) {
  return (await apiRequest<StaffCatalog>("/api/v1/admin/staff/catalog", {}, { signal })).data;
}

export async function staffDirectory(signal?: AbortSignal) {
  return (await apiRequest<StaffDirectory>("/api/v1/admin/staff", {}, { signal })).data;
}

export async function inviteStaff(payload: InvitationInput) {
  return (await apiRequest<InvitationResult>("/api/v1/admin/staff/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })).data;
}

export async function saveStaff(uid: string, revision: number, payload: StaffChanges) {
  return (await apiRequest<StaffMember>(
    `/api/v1/admin/staff/${encodeURIComponent(uid)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { ifMatch: `"${revision}"` },
  )).data;
}

export async function acceptStaffInvitation() {
  return (await apiRequest<StaffMember>("/api/v1/admin/staff/accept", {
    method: "POST",
  })).data;
}
