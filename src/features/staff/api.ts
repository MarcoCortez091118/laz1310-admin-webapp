import { apiRequest } from "../../api/client";

export const STAFF_MODULES = [
  ["website.news", "Actividades y noticias", "Website"],
  ["website.banners", "Banners", "Website"],
  ["website.campaigns", "Premios y campañas", "Website"],
  ["website.shows", "Programas web", "Website"],
  ["website.tickets", "Boletos web", "Website"],
  ["website.media", "Medios web", "Website"],
  ["app.pages", "Páginas App", "App"],
  ["app.banners", "Banners App", "App"],
  ["app.radio", "Radio", "App"],
  ["app.programs", "Programación", "App"],
  ["app.media", "Medios App", "App"],
  ["app.dynamics", "Premios App", "App"],
  ["app.notifications", "Notificaciones", "App"],
  ["app.users", "Oyentes registrados", "App"],
  ["app.weather", "Clima", "App"],
  ["app.branding", "Identidad", "App"],
  ["app.configuration", "Configuración", "App"],
  ["app.releases", "Publicaciones", "App"],
  ["app.audit", "Auditoría", "App"],
  ["app.monitoring", "Monitoreo", "App"],
] as const;

export const STAFF_ACTIONS = ["view", "create", "edit", "publish", "delete"] as const;
export type StaffRole = "admin" | "editor";
export type StaffPermissions = Record<string, string[]>;

export interface Member {
  uid: string;
  email: string;
  name: string;
  role: StaffRole;
  permissions: StaffPermissions;
  status: "active" | "disabled";
  version: number;
  createdAt: string;
  updatedAt?: string;
}
export interface Invitation {
  email: string;
  name: string;
  role: StaffRole;
  permissions: StaffPermissions;
  status: "pending" | "accepted";
  version: number;
  createdAt: string;
}

export async function listStaff() {
  return (await apiRequest<{ members: Member[]; invitations: Invitation[] }>("/api/v1/admin/staff")).data;
}
export async function inviteStaff(payload: {
  email: string; name: string; role: StaffRole; permissions: StaffPermissions;
}) {
  return (await apiRequest<Invitation>("/api/v1/admin/staff/invitations", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  })).data;
}
export async function updateStaff(member: Member, permissions: StaffPermissions, status: Member["status"]) {
  return (await apiRequest<Member>(`/api/v1/admin/staff/${encodeURIComponent(member.uid)}`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permissions, status }),
  }, { ifMatch: `"${member.version}"` })).data;
}
export function initialPermissions(role: StaffRole): StaffPermissions {
  return {
    "website.news": role === "admin" ? [...STAFF_ACTIONS] : ["view", "create", "edit"],
  };
}
