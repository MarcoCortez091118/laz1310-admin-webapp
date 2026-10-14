import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { signOut } from "firebase/auth";
import {
  Bell,
  Moon,
  Sun,
  ChevronDown,
  Globe,
  LogOut,
  Menu as MenuIcon,
  Search,
} from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import {
  visibleNavigationGroups,
  workspaceDashboard,
  workspaceFromPath,
  type AdminWorkspace,
} from "./navigation";
import { useStaff } from "../features/auth/StaffGate";
import { useDraftQuery, usePublicStateQuery } from "../features/content/queries";
import { auth } from "../lib/firebase";
import { useAppearance } from "./appearance";

const DRAWER_WIDTH = 256;


function shortRelease(value: string | null | undefined): string {
  return value ? value.slice(0, 8) : "Unpublished";
}

function AppReleaseStatus() {
  const draft = useDraftQuery();
  const publicState = usePublicStateQuery();
  return (
    <Stack direction="row" spacing={1} alignItems="center" className="topbar-state-chips">
      <Chip
        label={`Draft ${draft.data?.data.revision ?? "…"}`}
        size="small"
        sx={{ bgcolor: "action.hover", color: "text.primary" }}
      />
      <Chip
        label={`Published ${shortRelease(publicState.data?.data.releaseId)}`}
        size="small"
        variant="outlined"
      />
    </Stack>
  );
}

export function AdminShell() {
  const staff = useStaff();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: state => state.location.pathname });
  const workspace = workspaceFromPath(pathname);
  const theme = useTheme();
  const { mode, toggle } = useAppearance();
  const desktop = useMediaQuery(theme.breakpoints.up("lg"));
  const admin = staff.roles.includes("admin");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navigationSearch, setNavigationSearch] = useState("");
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);

  const visibleGroups = visibleNavigationGroups(workspace, admin, navigationSearch);

  // Also reset sidebar search on browser Back/Forward and direct link navigation.
  useEffect(() => {
    setNavigationSearch("");
  }, [workspace]);

  function changeWorkspace(next: AdminWorkspace) {
    if (next === workspace) return;
    setNavigationSearch("");
    closeMobileNavigation();
    void navigate({ to: workspaceDashboard(next) });
  }

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

      <Box sx={{ px: 2, pt: 2, pb: 0.75 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="admin-workspace-label">Manage platform</InputLabel>
          <Select
            labelId="admin-workspace-label"
            id="admin-workspace-select"
            label="Manage platform"
            value={workspace}
            onChange={event => {
              const next = event.target.value;
              if (next === "website" || next === "app") changeWorkspace(next);
            }}
            sx={{ borderRadius: 2, fontWeight: 750, bgcolor: "action.hover" }}
          >
            <MenuItem value="website">Website</MenuItem>
            <MenuItem value="app">App Android / iOS</MenuItem>
          </Select>
        </FormControl>
        <Typography fontSize={11} color="text.secondary" mt={1} px={0.5}>
          {workspace === "website" ? "Official website content" : "Android / iOS app content"}
        </Typography>
      </Box>

      <Box component="nav" aria-label={workspace === "website" ? "Website navigation" : "Android/iOS app navigation"} className="modern-navigation">
        {visibleGroups.map((group) => (
          <Box key={group.label} className="modern-nav-group">
            <Typography className="modern-nav-label">{group.label}</Typography>
            <Stack spacing={0.5}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    activeOptions={{ exact: true }}
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
          width: { xs: "calc(100% - 24px)", lg: `calc(100% - ${DRAWER_WIDTH + 32}px)` },
          left: { xs: 12, lg: DRAWER_WIDTH + 16 },
          top: 12,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: "0 10px 35px rgba(0,0,0,.11)",
          backdropFilter: "blur(14px)",
          zIndex: (value) => value.zIndex.drawer - 1,
        }}
      >
        <Toolbar className="modern-topbar" sx={{ minHeight: "62px !important", gap: 1.5 }}>
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

          <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <IconButton
              aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={mode === "dark"}
              onClick={toggle}
              color="inherit"
              size="small"
            >
              {mode === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </IconButton>
          </Tooltip>

          {workspace === "app" ? (
            <>
              <AppReleaseStatus />
              <Tooltip title="App notifications">
                <Link to="/notifications" style={{ display: "inline-flex" }}>
                  <IconButton aria-label="App notifications" color="inherit">
                    <Bell size={19} />
                  </IconButton>
                </Link>
              </Tooltip>
            </>
          ) : (
            <Chip
              icon={<Globe size={15} aria-hidden />}
              label="Website"
              size="small"
              variant="outlined"
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            />
          )}

          <Box>
            <Box
              aria-controls={accountAnchor ? "admin-account-menu" : undefined}
              aria-haspopup="true"
              className="modern-account-trigger"
              component="button"
              onClick={openAccountMenu}
              type="button"
            >
              <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.dark", fontSize: 13, fontWeight: 800 }}>
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
        <Toolbar sx={{ minHeight: "86px !important" }} />
        <Outlet />
      </Box>
    </Box>
  );
}
