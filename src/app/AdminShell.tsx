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

const navigation = [
  ["Overview", "/", LayoutDashboard],
  ["Pages", "/pages", FileText],
  ["Radio", "/radio", Radio],
  ["Dynamics", "/dynamics", Sparkles],
  ["Media", "/media", Image],
  ["Releases", "/releases", FileClock],
  ["Weather", "/weather", CloudSun],
  ["Notifications", "/notifications", Bell],
  ["Audit", "/audit", ScrollText],
  ["App Configuration", "/configuration", Settings],
] as const;

export function AdminShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <header className="brand-lockup">
          <span className="brand-mark">Z</span>
          <div>
            <strong>LA Z 1310</strong>
            <span>Admin</span>
          </div>
        </header>

        <nav aria-label="Administration">
          {navigation.map(([label, to, Icon]) => (
            <Link activeProps={{ className: "active" }} key={to} to={to}>
              <Icon aria-hidden size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <footer className="sidebar-footer">
          <Activity size={16} />
          <span>FastAPI control plane</span>
        </footer>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div>
            <span className="status-dot" />
            Draft workspace
          </div>
          <strong>Published state: loading from API</strong>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
