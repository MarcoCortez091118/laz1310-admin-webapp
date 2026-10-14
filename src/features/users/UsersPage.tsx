import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { BellRing, CheckCircle2, Search, Smartphone, UserRound, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useStaff } from "../auth/StaffGate";
import { paginateItems } from "../../app/pagination";
import {
  findAdminUserByEmail,
  findAdminUserById,
  listAdminUsers,
  type AdminUserSummary,
} from "../notifications/users";

import { UsersTable } from "./UsersTable";
import { UserDetailsDialog } from "./UserDetailsDialog";

const usersQueryKey = ["admin", "users-directory"] as const;

export function UsersPage() {
  const staff = useStaff();
  const isAdmin = staff.roles.includes("admin");
  const [email, setEmail] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(() => {
    const queryId = new URLSearchParams(window.location.search).get("userId");
    return queryId && /^[a-f0-9-]{36}$/i.test(queryId) ? queryId : null;
  });
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

  const userById = useQuery({
    queryKey: [...usersQueryKey, "userId", selectedUserId],
    queryFn: ({ signal }) => findAdminUserById(selectedUserId ?? "", signal),
    enabled: isAdmin && Boolean(selectedUserId),
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

  const visibleUsers = (
    normalizedEmail.includes("@")
      ? (exactSearch.data?.data.items ?? [])
      : allUsers.filter((user) =>
          !normalizedEmail ||
          (user.displayName ?? "").toLowerCase().includes(normalizedEmail) ||
          (user.email ?? "").toLowerCase().includes(normalizedEmail))
  ).filter((user) =>
    statusFilter === "all" ||
    (statusFilter === "verified" && user.emailVerified) ||
    (statusFilter === "unverified" && !user.emailVerified) ||
    (statusFilter === "push" && user.notificationStatus?.pushEligible)
  );
  const pagedUsers = paginateItems(visibleUsers, page, 10);
  const selectedUser = selectedUserId
    ? (allUsers.find((user) => user.id === selectedUserId)
      ?? exactSearch.data?.data.items.find((user) => user.id === selectedUserId)
      ?? userById.data?.data.items.find((user) => user.id === selectedUserId)
      ?? null)
    : null;
  const pushReady = allUsers.filter((user) => user.notificationStatus?.pushEligible).length;
  const verified = allUsers.filter((user) => user.emailVerified).length;

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
            Real LA Z business accounts created through authenticated Mobile sessions. Push readiness is derived from registered devices, native FCM eligibility and notification preferences; tokens are never exposed here.
          </Typography>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3,minmax(0,1fr))" }, gap: 1.5 }}>
          {[
            ["Loaded users", allUsers.length, <UsersRound size={20} />],
            ["Email verified", verified, <CheckCircle2 size={20} />],
            ["Push ready", pushReady, <BellRing size={20} />],
          ].map(([label, value, icon]) => (
            <Card key={String(label)} variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                    <Typography variant="h4" fontWeight={850} mt={0.5}>{value as number}</Typography>
                  </Box>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "action.hover", color: "primary.main", display: "grid", placeItems: "center" }}>
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
                onChange={(event) => { setEmail(event.target.value); setPage(1); }}
                label="Search users / exact email"
                placeholder="listener@example.com"
                helperText={normalizedEmail.includes("@") ? "Exact email lookup through FastAPI." : "Name search filters loaded users. Load more to expand results."}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search size={17} /></InputAdornment> }}
              />
              <TextField select size="small" label="Status" value={statusFilter} sx={{ minWidth: 160 }}
                onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="verified">Verified</MenuItem>
                <MenuItem value="unverified">Unverified</MenuItem>
                <MenuItem value="push">Push ready</MenuItem>
              </TextField>
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

        {users.error ? <Alert severity="error">{users.error instanceof Error ? users.error.message : "Unable to load users."}</Alert> : null}
        {exactSearch.error ? <Alert severity="error">{exactSearch.error instanceof Error ? exactSearch.error.message : "Unable to search user."}</Alert> : null}
        {userById.error ? <Alert severity="error">Unable to open linked user profile.</Alert> : null}

        <UsersTable items={pagedUsers.items} onOpen={(user) => setSelectedUserId(user.id)} />
        {pagedUsers.pages > 1 && <Stack direction="row" gap={2} flexWrap="wrap"
          justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Showing {pagedUsers.items.length} of {pagedUsers.total} loaded users
          </Typography>
          <Pagination size="small" count={pagedUsers.pages} page={pagedUsers.page}
            onChange={(_,next) => setPage(next)} color="primary"/>
        </Stack>}

        {!users.isLoading && !users.error && !exactSearch.error && visibleUsers.length === 0 ? (
          <Alert severity="info" icon={<Smartphone size={20} />}>
            {normalizedEmail ? "No matching user is in the current loaded set or exact email lookup." : "No authenticated LA Z users exist in this API environment yet."}
          </Alert>
        ) : null}

        {!normalizedEmail.includes("@") && users.hasNextPage ? (
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
      <UserDetailsDialog
        key={selectedUser?.id ?? "none"}
        user={selectedUser}
        open={Boolean(selectedUser)}
        onClose={() => {
          setSelectedUserId(null);
          if (window.location.search.includes("userId=")) {
            const destination = new URL(window.location.href);
            destination.searchParams.delete("userId");
            window.history.replaceState(null, "", destination.toString());
          }
        }}
      />
    </Box>
  );
}
