import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link, Outlet } from "@tanstack/react-router";
import { signOut } from "firebase/auth";
import {
  Bell,
  CalendarRange,
  ChevronDown,
  CloudSun,
  FileClock,
  FileText,
  Image,
  LayoutDashboard,
  Palette,
  LogOut,
  Menu as MenuIcon,
  Radio,
  ScrollText,
  Search,
  Settings,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useMemo, useState, type MouseEvent } from "react";
import { useStaff } from "../features/auth/StaffGate";
import { useDraftQuery, usePublicStateQuery } from "../features/content/queries";
import { auth } from "../lib/firebase";

const DRAWER_WIDTH = 272;

const navigationGroups = [
  {
    label: "General",
    items: [
      { label: "Overview", to: "/", icon: LayoutDashboard, adminOnly: false },
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
] as const;

function shortRelease(value: string | null | undefined): string {
  return value ? value.slice(0, 8) : "Unpublished";
}

export function AdminShell() {
  const staff = useStaff();
  const draft = useDraftQuery();
  const publicState = usePublicStateQuery();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("lg"));
  const admin = staff.roles.includes("admin");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navigationSearch, setNavigationSearch] = useState("");
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);

  const visibleGroups = useMemo(() => {
    const query = navigationSearch.trim().toLowerCase();
    return navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            (!item.adminOnly || admin) &&
            (!query || item.label.toLowerCase().includes(query)),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [admin, navigationSearch]);

  function closeMobileNavigation() {
    if (!desktop) setMobileOpen(false);
  }

  function openAccountMenu(event: MouseEvent<HTMLElement>) {
    setAccountAnchor(event.currentTarget);
  }

  const drawer = (
    <Box className="modern-sidebar" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box className="modern-brand">
        <Box className="modern-brand-mark">Z</Box>
        <Box>
          <Typography component="div" fontWeight={800} fontSize={17} lineHeight={1.1}>
            LA Z 1310
          </Typography>
          <Typography color="text.secondary" fontSize={11.5} mt={0.4}>
            Digital Platform Admin
          </Typography>
        </Box>
      </Box>

      <Divider />

      <Box component="nav" aria-label="Administration" className="modern-navigation">
        {visibleGroups.map((group) => (
          <Box key={group.label} className="modern-nav-group">
            <Typography className="modern-nav-label">{group.label}</Typography>
            <Stack spacing={0.5}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    activeProps={{ className: "mui-nav-link active" }}
                    className="mui-nav-link"
                    key={item.to}
                    onClick={closeMobileNavigation}
                    to={item.to}
                  >
                    <Box className="mui-nav-item">
                      <Icon aria-hidden size={18} strokeWidth={1.8} />
                      <span>{item.label}</span>
                    </Box>
                  </Link>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Box>

      <Box className="modern-sidebar-account">
        <Divider sx={{ mb: 1.5 }} />
        <Box className="modern-sidebar-user">
          <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: 14, fontWeight: 800 }}>
            {admin ? "A" : "E"}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontSize={13.5} fontWeight={700} noWrap>
              {admin ? "Administrator" : "Editor"}
            </Typography>
            <Typography color="text.secondary" fontSize={11} noWrap title={staff.uid}>
              {staff.uid.slice(0, 12)}…
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box className="modern-admin-shell">
      <AppBar
        color="inherit"
        elevation={0}
        position="fixed"
        sx={{
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { lg: `${DRAWER_WIDTH}px` },
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(14px)",
          zIndex: (value) => value.zIndex.drawer - 1,
        }}
      >
        <Toolbar className="modern-topbar" sx={{ minHeight: "72px !important", gap: 1.5 }}>
          {!desktop ? (
            <IconButton aria-label="Open navigation" onClick={() => setMobileOpen(true)} edge="start">
              <MenuIcon size={21} />
            </IconButton>
          ) : null}

          <TextField
            aria-label="Filter administration navigation"
            className="modern-search"
            onChange={(event) => setNavigationSearch(event.target.value)}
            placeholder="Search administration…"
            value={navigationSearch}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={17} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={1} alignItems="center" className="topbar-state-chips">
            <Chip
              label={`Draft ${draft.data?.data.revision ?? "…"}`}
              size="small"
              sx={{ bgcolor: "#FFF1F2", color: "#B42318" }}
            />
            <Chip
              label={`Published ${shortRelease(publicState.data?.data.releaseId)}`}
              size="small"
              variant="outlined"
            />
          </Stack>

          <Tooltip title="Notifications">
            <Link to="/notifications" style={{ display: "inline-flex" }}>
              <IconButton aria-label="Notifications" color="inherit">
                <Bell size={19} />
              </IconButton>
            </Link>
          </Tooltip>

          <Box>
            <Box
              aria-controls={accountAnchor ? "admin-account-menu" : undefined}
              aria-haspopup="true"
              className="modern-account-trigger"
              component="button"
              onClick={openAccountMenu}
              type="button"
            >
              <Avatar sx={{ width: 34, height: 34, bgcolor: "#2F0908", fontSize: 13, fontWeight: 800 }}>
                {admin ? "A" : "E"}
              </Avatar>
              <Box className="modern-account-copy">
                <strong>{admin ? "Admin" : "Editor"}</strong>
                <span>LA Z 1310</span>
              </Box>
              <ChevronDown size={15} />
            </Box>
            <Menu
              anchorEl={accountAnchor}
              id="admin-account-menu"
              onClose={() => setAccountAnchor(null)}
              open={Boolean(accountAnchor)}
              slotProps={{ paper: { sx: { mt: 1, minWidth: 220 } } }}
            >
              <Box sx={{ px: 2, py: 1.2 }}>
                <Typography fontSize={12} color="text.secondary">Signed in</Typography>
                <Typography fontSize={12.5} fontWeight={700} sx={{ wordBreak: "break-all" }}>
                  {staff.uid}
                </Typography>
              </Box>
              <Divider />
              <MenuItem
                onClick={() => {
                  setAccountAnchor(null);
                  void signOut(auth);
                }}
              >
                <LogOut size={17} style={{ marginRight: 10 }} />
                Sign out
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        open={desktop || mobileOpen}
        onClose={() => setMobileOpen(false)}
        variant={desktop ? "permanent" : "temporary"}
        ModalProps={{ keepMounted: true }}
        slotProps={{
          paper: {
            sx: {
              width: DRAWER_WIDTH,
              borderRight: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            },
          },
        }}
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        className="modern-workspace"
        sx={{
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { lg: `${DRAWER_WIDTH}px` },
          minHeight: "100vh",
        }}
      >
        <Toolbar sx={{ minHeight: "72px !important" }} />
        <Outlet />
      </Box>
    </Box>
  );
}
