import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Stack, Tab, Tabs, Typography,
} from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import { History, ShieldCheck, Smartphone, UserRound, X } from "lucide-react";
import { useState } from "react";
import type { AdminUserSummary } from "../notifications/users";
import { getUserParticipationHistory } from "./api";

function dateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? "—" : time.toLocaleString();
}

export function UserDetailsDialog({
  user, open, onClose,
}: {
  user: AdminUserSummary | null;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState(0);
  const history = useInfiniteQuery({
    queryKey: ["admin", "users", user?.id, "participation-history"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      getUserParticipationHistory(user?.id ?? "", 20, pageParam, signal),
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: open && tab === 1 && Boolean(user?.id),
    retry: false,
    staleTime: 30_000,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const entries = history.data?.pages.flatMap((page) => page.data.items) ?? [];
  const name = user?.displayName || user?.email || "LA Z listener";
  function close() { setTab(0); onClose(); }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md"
      aria-labelledby="user-details-title"
      slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: "90vh" } } }}>
      <DialogTitle id="user-details-title">
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: "#2F0908" }}><UserRound size={19} /></Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} noWrap>{name}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{user?.email ?? "No email"}</Typography>
          </Box>
          <Button onClick={close} aria-label="Close user details" size="small"><X size={18}/></Button>
        </Stack>
      </DialogTitle>
      <Tabs value={tab} onChange={(_e, value: number) => setTab(value)} aria-label="Account details tabs" sx={{ px: 2 }}>
        <Tab label="Account overview" />
        <Tab label="Dynamics participations" />
      </Tabs>
      <DialogContent dividers>
        {!user ? null : tab === 0 ? (
          <Stack spacing={2}>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
              <Chip size="small" color={user.emailVerified ? "success" : "default"}
                label={user.emailVerified ? "Verified email" : "Unverified email"} />
              <Chip size="small" color={user.profileCompleted ? "success" : "default"}
                label={user.profileCompleted ? "Complete profile" : "Incomplete profile"} />
              <Chip size="small" label={user.notificationStatus?.pushEligible ? "FCM push ready" : "No eligible FCM device"}
                color={user.notificationStatus?.pushEligible ? "success" : "default"} />
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              {[
                ["Business account ID", user.id],
                ["Language", user.locale ?? "Not set"],
                ["Timezone", user.timezone ?? "Not set"],
                ["Account created", dateTime(user.createdAt)],
                ["Last session", dateTime(user.lastSeenAt)],
              ].map(([label, value]) => (
                <Box key={label}>
                  <Typography color="text.secondary" variant="caption">{label}</Typography>
                  <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{value}</Typography>
                </Box>
              ))}
            </Box>
            <Divider/>
            <Stack direction="row" alignItems="center" spacing={1}><Smartphone size={17}/>
              <Typography fontWeight={750}>Registered devices and notifications</Typography>
            </Stack>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
              <Chip size="small" label={`Devices: ${user.notificationStatus?.registeredDeviceCount ?? 0}`} />
              <Chip size="small" label={`Enabled: ${user.notificationStatus?.notificationsEnabledDeviceCount ?? 0}`} />
              <Chip size="small" label={`Push eligible: ${user.notificationStatus?.pushEligibleDeviceCount ?? 0}`} />
              {Object.entries(user.notificationStatus?.preferences ?? {}).map(([key, on]) =>
                <Chip key={key} size="small" variant="outlined" color={on ? "success" : "default"}
                  label={`${key}: ${on ? "ON" : "OFF"}`} />
              )}
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Alert severity="info" icon={<ShieldCheck size={19}/>}>
              Only account-linked native Dynamics participations retained by FastAPI are shown.
              Anonymous and external URL entries cannot be attributed to this account.
              Private answers are not exposed in this account timeline.
            </Alert>
            {history.isPending ? (
              <Stack alignItems="center" py={3}><CircularProgress size={24}/></Stack>
            ) : history.error ? (
              <Alert severity="error" action={<Button onClick={() => void history.refetch()} color="inherit">Retry</Button>}>
                Unable to load participation history. Verify the corresponding FastAPI release is deployed.
                {" "}{history.error instanceof Error ? history.error.message : ""}
              </Alert>
            ) : entries.length ? (
              <Stack spacing={1}>
                {entries.map((entry) => (
                  <Box key={entry.id} sx={{ p: 1.75, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography fontWeight={800}>{entry.dynamicTitle || "Campaign"}</Typography>
                        <Typography variant="caption" color="text.secondary">{dateTime(entry.submittedAt)}</Typography>
                      </Box>
                      <Chip color="success" size="small" label={entry.status === "accepted" ? "Participation accepted" : entry.status} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                      Participation ID: {entry.id}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Stack alignItems="center" textAlign="center" py={3} spacing={1}>
                <History size={28}/>
                <Typography fontWeight={800}>No retained registered participations</Typography>
                <Typography color="text.secondary" variant="body2">
                  This does not rule out anonymous, external or expired submissions.
                </Typography>
              </Stack>
            )}
            {history.hasNextPage ? (
              <Button variant="outlined" disabled={history.isFetchingNextPage}
                onClick={() => void history.fetchNextPage()}>
                {history.isFetchingNextPage ? "Loading…" : "Load older participations"}
              </Button>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={close}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
