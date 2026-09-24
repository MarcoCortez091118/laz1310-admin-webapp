import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { AdminShell } from "./app/AdminShell";
import { AuthGate } from "./features/auth/AuthGate";
import { LoginPage } from "./features/auth/LoginPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { PlaceholderPage } from "./features/dashboard/PlaceholderPage";

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "admin",
  component: () => (
    <AuthGate>
      <AdminShell />
    </AuthGate>
  ),
});

const overviewRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/",
  component: DashboardPage,
});

function placeholder(path: string, title: string, dependency: string) {
  return createRoute({
    getParentRoute: () => adminRoute,
    path,
    component: () => <PlaceholderPage dependency={dependency} title={title} />,
  });
}

const routeTree = rootRoute.addChildren([
  loginRoute,
  adminRoute.addChildren([
    overviewRoute,
    placeholder("/pages", "Pages", "Draft Page contracts"),
    placeholder("/radio", "Radio", "Station / Stream / Show / Schedule contracts"),
    placeholder("/dynamics", "Dynamics", "Dynamics + participation contracts"),
    placeholder("/media", "Media", "Admin media upload/list contracts"),
    placeholder("/releases", "Releases", "Release history; detail contract still required"),
    placeholder("/weather", "Weather", "Public weather + future operational contract"),
    placeholder("/notifications", "Notifications", "Blocked until backend LAZ-28 is implemented"),
    placeholder("/audit", "Audit", "Admin audit contract"),
    placeholder("/configuration", "App Configuration", "Admin configuration contract"),
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
