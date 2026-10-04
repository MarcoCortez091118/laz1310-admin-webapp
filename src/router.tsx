import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { AdminShell } from "./app/AdminShell";
import { AuthGate } from "./features/auth/AuthGate";
import { LoginPage } from "./features/auth/LoginPage";
import { StaffGate } from "./features/auth/StaffGate";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { PlaceholderPage } from "./features/dashboard/PlaceholderPage";
import { MediaLibraryPage } from "./features/media/MediaLibraryPage";
import { PagesPage } from "./features/pages/PagesPage";
import { ProgramsPage } from "./features/programs/ProgramsPage";

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
      <StaffGate>
        <AdminShell />
      </StaffGate>
    </AuthGate>
  ),
});

const overviewRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/",
  component: DashboardPage,
});

const pagesRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/pages",
  component: PagesPage,
});

const radioRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/radio",
  component: () => (
    <PlaceholderPage
      dependency="Station / Stream contracts"
      title="Radio"
    />
  ),
});

const programsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/programs",
  component: ProgramsPage,
});

const dynamicsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/dynamics",
  component: () => (
    <PlaceholderPage
      dependency="Dynamics + participation contracts"
      title="Dynamics"
    />
  ),
});

const mediaRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/media",
  component: MediaLibraryPage,
});

const releasesRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/releases",
  component: () => (
    <PlaceholderPage
      dependency="Release history; detail contract still required"
      title="Releases"
    />
  ),
});

const weatherRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/weather",
  component: () => (
    <PlaceholderPage
      dependency="Public weather + future operational contract"
      title="Weather"
    />
  ),
});

const notificationsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/notifications",
  component: () => (
    <PlaceholderPage
      dependency="Notification campaign administration contracts"
      title="Notifications"
    />
  ),
});

const auditRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/audit",
  component: () => (
    <PlaceholderPage dependency="Admin audit contract" title="Audit" />
  ),
});

const configurationRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/configuration",
  component: () => (
    <PlaceholderPage
      dependency="Admin configuration contract"
      title="App Configuration"
    />
  ),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  adminRoute.addChildren([
    overviewRoute,
    pagesRoute,
    radioRoute,
    programsRoute,
    dynamicsRoute,
    mediaRoute,
    releasesRoute,
    weatherRoute,
    notificationsRoute,
    auditRoute,
    configurationRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
