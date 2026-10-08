import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { BellRing, CheckCircle2, Mail, Search, Smartphone, UserRound, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useStaff } from "../auth/StaffGate";
import {
  findAdminUserByEmail,
  listAdminUsers,
  type AdminUserSummary,
} from "../notifications/users";

const usersQueryKey = ["admin", "users-directory"] as const;

function nameOf(user: AdminUserSummary) {
  return user.displayName || user.email || "Unnamed listener";
}

function initials(user: AdminUserSummary) {
  const value = nameOf(user).trim();
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function UserCard({ user }: { user: AdminUserSummary }) {
  const status = user.notificationStatus;
  const preferenceEntries = status ? Object.entries(status.preferences) : [];

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, minWidth: 0 }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.25 } }}>
        <Stack spacing={1.75} minWidth={0}>
          <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
            <Avatar sx={{ bgcolor: "#2F0908", width: 44, height: 44, fontWeight: 800 }}>
              {initials(user)}
            </Avatar>
            <Box minWidth={0} flex={1}>
              <Typography fontWeight={850} noWrap title={nameOf(user)}>{nameOf(user)}</Typography>
              <Stack direction="row" spacing={0.75} alignItems="center" minWidth={0}>
                <Mail size={13} />
                <Typography variant="caption" color="text.secondary" noWrap title={user.email ?? "No email"}>
                  {user.email ?? "No email"}
                </Typography>
              </Stack>
            </Box>
            <Chip
              size="small"
              color={status?.pushEligible ? "success" : "default"}
              variant={status?.pushEligible ? "filled" : "outlined"}
              label={status?.pushEligible ? "Push ready" : "No push"}
            />
          </Stack>

          <Divider />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3,minmax(0,1fr))" }, gap: 1.25 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Devices</Typography>
              <Typography fontWeight={800}>{status?.registeredDeviceCount ?? 0}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Push enabled</Typography>
              <Typography fontWeight={800}>{status?.notificationsEnabledDeviceCount ?? 0}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">FCM eligible</Typography>
              <Typography fontWeight={800}>{status?.pushEligibleDeviceCount ?? 0}</Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              variant="outlined"
              color={user.emailVerified ? "success" : "default"}
              label={user.emailVerified ? "Email verified" : "Email unverified"}
            />
            <Chip
              size="small"
              variant="outlined"
              color={user.profileCompleted ? "success" : "default"}
              label={user.profileCompleted ? "Profile complete" : "Profile incomplete"}
            />
          </Stack>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
              Notification categories
            </Typography>
            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
              {preferenceEntries.length ? preferenceEntries.map(([category, enabled]) => (
                <Chip
                  key={category}
                  size="small"
                  color={enabled ? "success" : "default"}
                  variant={enabled ? "filled" : "outlined"}
                  label={`${category} ${enabled ? "ON" : "OFF"}`}
                />
              )) : <Chip size="small" variant="outlined" label="Eligibility unavailable" />}
            </Stack>
          </Box>

          <Typography variant="caption" color="text.secondary">
            Last session: {formatDate(user.lastSeenAt)} · Created: {formatDate(user.createdAt)}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function UsersPage() {
  const staff = useStaff();
  const isAdmin = staff.roles.includes("admin");
  const [email, setEmail] = useState("");
  const normalizedEmail = email.trim().toLowerCase();

  const users = useInfiniteQuery({
    queryKey: usersQueryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => listAdminUsers(50, pageParam, signal),
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: isAdmin,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const exactSearch = useQuery({
    queryKey: [...usersQueryKey, "email", normalizedEmail],
    queryFn: ({ signal }) => findAdminUserByEmail(normalizedEmail, signal),
    enabled: isAdmin && normalizedEmail.includes("@") && normalizedEmail.length >= 3,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const allUsers = useMemo(() => {
    const map = new Map<string, AdminUserSummary>();
    users.data?.pages.flatMap((page) => page.data.items).forEach((user) => map.set(user.id, user));
    if (normalizedEmail) {
      exactSearch.data?.data.items.forEach((user) => map.set(user.id, user));
    }
    return [...map.values()];
  }, [exactSearch.data, normalizedEmail, users.data]);

  const visibleUsers = normalizedEmail
    ? (exactSearch.data?.data.items ?? [])
    : allUsers;
  const pushReady = allUsers.filter((user) => user.notificationStatus?.pushEligible).length;
  const verified = allUsers.filter((user) => user.emailVerified).length;
  const directoryFailed = Boolean(users.error || exactSearch.error);

  if (!isAdmin) {
    return (
      <Box className="modern-page">
        <Alert severity="warning">The user directory is restricted to administrators.</Alert>
      </Box>
    );
  }

  return (
    <Box className="modern-page">
      <Stack spacing={2.25}>
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={800} sx={{ letterSpacing: ".12em" }}>
            Audience · Protected
          </Typography>
          <Typography variant="h4" fontWeight={850} sx={{ letterSpacing: "-.035em" }}>Users</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 800 }}>
            LA Z listener accounts created by authenticated Mobile/API sessions. Website staff or legacy web accounts are a separate domain and are intentionally excluded. Push readiness is derived from registered devices, native FCM eligibility and notification preferences; tokens are never exposed here.
          </Typography>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3,minmax(0,1fr))" }, gap: 1.5 }}>
          {[
            ["Loaded users", directoryFailed ? "—" : allUsers.length, <UsersRound size={20} />],
            ["Email verified", directoryFailed ? "—" : verified, <CheckCircle2 size={20} />],
            ["Push ready", directoryFailed ? "—" : pushReady, <BellRing size={20} />],
          ].map(([label, value, icon]) => (
            <Card key={String(label)} variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                    <Typography variant="h4" fontWeight={850} mt={0.5}>{String(value)}</Typography>
                  </Box>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "#FFF1F2", color: "primary.main", display: "grid", placeItems: "center" }}>
                    {icon}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.25 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
              <TextField
                fullWidth
                size="small"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                label="Exact email lookup"
                placeholder="listener@example.com"
                helperText="For privacy, server-side lookup is exact email only; browse the paginated Mobile/API directory below."
                InputProps={{ startAdornment: <InputAdornment position="start"><Search size={17} /></InputAdornment> }}
              />
              <Button
                variant="outlined"
                disabled={users.isFetching}
                onClick={() => void users.refetch()}
                startIcon={users.isFetching ? <CircularProgress size={15} /> : <UserRound size={17} />}
              >
                Refresh
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {users.error ? (
          <Alert severity="error">
            <strong>User directory unavailable.</strong>{" "}
            {users.error instanceof Error ? users.error.message : "Unable to load users."}
          </Alert>
        ) : null}
        {exactSearch.error ? (
          <Alert severity="error">
            <strong>User lookup unavailable.</strong>{" "}
            {exactSearch.error instanceof Error ? exactSearch.error.message : "Unable to search user."}
          </Alert>
        ) : null}

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2,minmax(0,1fr))" }, gap: 1.5 }}>
          {visibleUsers.map((user) => <UserCard key={user.id} user={user} />)}
        </Box>

        {!users.isLoading && !directoryFailed && visibleUsers.length === 0 ? (
          <Alert severity="info" icon={<Smartphone size={20} />}>
            {normalizedEmail ? "No LA Z Mobile/API account matches that exact email." : "No authenticated LA Z Mobile/API listener accounts exist in this environment yet."}
          </Alert>
        ) : null}

        {!normalizedEmail && users.hasNextPage ? (
          <Button
            variant="outlined"
            disabled={users.isFetchingNextPage}
            onClick={() => void users.fetchNextPage()}
            sx={{ alignSelf: "center" }}
          >
            {users.isFetchingNextPage ? "Loading…" : "Load more users"}
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
