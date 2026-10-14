import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarRange,
  CloudSun,
  FileClock,
  FileText,
  Globe,
  Image,
  LayoutDashboard,
  Activity,
  Palette,
  Radio,
  ScrollText,
  Settings,
  Sparkles,
  UsersRound,
} from "lucide-react";

export type AdminWorkspace = "website" | "app";

export type NavigationPath =
  | "/" | "/website" | "/website/news" | "/website/banners"
  | "/website/shows" | "/website/ticket-promotions"
  | "/pages" | "/banners" | "/radio" | "/programs" | "/media"
  | "/dynamics" | "/notifications" | "/users" | "/weather"
  | "/releases" | "/audit" | "/branding" | "/configuration" | "/monitoring";

export interface NavigationItem {
  readonly label: string;
  readonly to: NavigationPath;
  readonly icon: LucideIcon;
  readonly adminOnly: boolean;
}

export interface NavigationGroup {
  readonly label: string;
  readonly items: readonly NavigationItem[];
}

/**
 * The pathname is the only source of truth for the active workspace.
 * This also handles deep links, browser history, refresh and copied URLs.
 */
export function workspaceFromPath(pathname: string): AdminWorkspace {
  return pathname === "/website" || pathname.startsWith("/website/") ? "website" : "app";
}

export function workspaceDashboard(workspace: AdminWorkspace): "/" | "/website" {
  return workspace === "website" ? "/website" : "/";
}

/**
 * Website and native-app editorial state are separate bounded contexts.
 * Keeping this taxonomy in one place avoids accidental cross-platform menus.
 */
export const workspaceNavigation: Record<AdminWorkspace, readonly NavigationGroup[]> = {
  website: [
    {
      label: "General",
      items: [
        { label: "Dashboard", to: "/website", icon: LayoutDashboard, adminOnly: false },
      ],
    },
    {
      label: "Website",
      items: [
        { label: "News / Blog", to: "/website/news", icon: Globe, adminOnly: false },
        { label: "Website Banners", to: "/website/banners", icon: Image, adminOnly: false },
        { label: "Website Shows", to: "/website/shows", icon: Radio, adminOnly: false },
        { label: "Ticket Promotions", to: "/website/ticket-promotions", icon: Image, adminOnly: false },
      ],
    },
  ],
  app: [
    {
      label: "General",
      items: [
        { label: "Dashboard", to: "/", icon: LayoutDashboard, adminOnly: false },
      ],
    },
    {
      label: "Content",
      items: [
        { label: "Pages", to: "/pages", icon: FileText, adminOnly: false },
        { label: "Banners", to: "/banners", icon: Image, adminOnly: false },
        { label: "Radio", to: "/radio", icon: Radio, adminOnly: false },
        { label: "Programs", to: "/programs", icon: CalendarRange, adminOnly: false },
        { label: "Media", to: "/media", icon: Image, adminOnly: false },
      ],
    },
    {
      label: "Engagement",
      items: [
        { label: "Dynamics", to: "/dynamics", icon: Sparkles, adminOnly: false },
        { label: "Notifications", to: "/notifications", icon: Bell, adminOnly: false },
        { label: "Users", to: "/users", icon: UsersRound, adminOnly: true },
      ],
    },
    {
      label: "Operations",
      items: [
        { label: "Weather", to: "/weather", icon: CloudSun, adminOnly: false },
        { label: "Monitoring", to: "/monitoring", icon: Activity, adminOnly: true },
        { label: "Releases", to: "/releases", icon: FileClock, adminOnly: true },
        { label: "Audit", to: "/audit", icon: ScrollText, adminOnly: true },
      ],
    },
    {
      label: "System",
      items: [
        { label: "Branding", to: "/branding", icon: Palette, adminOnly: true },
        { label: "App Configuration", to: "/configuration", icon: Settings, adminOnly: true },
      ],
    },
  ],
};

export function visibleNavigationGroups(
  workspace: AdminWorkspace,
  isAdmin: boolean,
  search = "",
): NavigationGroup[] {
  const query = search.trim().toLocaleLowerCase();
  return workspaceNavigation[workspace]
    .map(group => ({
      label: group.label,
      items: group.items.filter(item =>
        (!item.adminOnly || isAdmin) &&
        (!query || item.label.toLocaleLowerCase().includes(query)),
      ),
    }))
    .filter(group => group.items.length > 0);
}
