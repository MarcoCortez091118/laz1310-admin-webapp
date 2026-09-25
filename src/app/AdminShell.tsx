import { Link, Outlet } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  CloudSun,
  FileClock,
  FileText,
  Image,
  LayoutDashboard,
  Radio,
  ScrollText,
  Settings,
  Sparkles,
} from "lucide-react";
import { useStaff } from "../features/auth/StaffGate";
import { useDraftQuery, usePublicStateQuery } from "../features/content/queries";

const navigation = [
  { label: "Overview", to: "/", icon: LayoutDashboard, adminOnly: false },
  { label: "Pages", to: "/pages", icon: FileText, adminOnly: false },
  { label: "Radio", to: "/radio", icon: Radio, adminOnly: false },
  { label: "Dynamics", to: "/dynamics", icon: Sparkles, adminOnly: false },
  { label: "Media", to: "/media", icon: Image, adminOnly: false },
  { label: "Releases", to: "/releases", icon: FileClock, adminOnly: true },
  { label: "Weather", to: "/weather", icon: CloudSun, adminOnly: false },
  { label: "Notifications", to: "/notifications", icon: Bell, adminOnly: false },
  { label: "Audit", to: "/audit", icon: ScrollText, adminOnly: true },
  { label: "App Configuration", to: "/configuration", icon: Settings, adminOnly: true },
] as const;

export function AdminShell() {
  const staff = useStaff();
  const draft = useDraftQuery();
  const publicState = usePublicStateQuery();
  const admin = staff.roles.includes("admin");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <header className="brand-lockup">
          <span className="brand-mark">Z</span>
          <div>
            <strong>LA Z 1310</strong>
            <span>{admin ? "Administrator" : "Editor"}</span>
          </div>
        </header>

        <nav aria-label="Administration">
          {navigation
            .filter((item) => !item.adminOnly || admin)
            .map((item) => {
              const Icon = item.icon;
              return (
                <Link activeProps={{ className: "active" }} key={item.to} to={item.to}>
                  <Icon aria-hidden size={18} />
                  {item.label}
                </Link>
              );
            })}
        </nav>

        <footer className="sidebar-footer">
          <Activity size={16} />
          <span>{staff.uid}</span>
        </footer>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div>
            <span className="status-dot" />
            <strong>Draft #{draft.data?.data.revision ?? "…"}</strong>
            {draft.data?.etag ? <code>{draft.data.etag}</code> : null}
          </div>
          <span>
            Published:{" "}
            <strong>
              {publicState.data?.data.releaseId
                ? publicState.data.data.releaseId.slice(0, 8)
                : "Unpublished"}
            </strong>
          </span>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
