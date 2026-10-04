import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  Inbox,
  Megaphone,
  Plus,
  Search,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useStaff } from "../auth/StaffGate";
import { CampaignComposer } from "./CampaignComposer";
import { statusLabel, type CampaignStatus, type NotificationCampaign } from "./model";
import { useNotificationCampaignQuery, useNotificationCampaignsQuery } from "./queries";

type Selection = "new" | string | null;
type StatusFilter = "all" | CampaignStatus | "issues";

const statusColors: Record<CampaignStatus, { bg: string; fg: string }> = {
  draft: { bg: "#f2f4f7", fg: "#475467" },
  queued: { bg: "#fff4e5", fg: "#9a6700" },
  sending: { bg: "#e8f1ff", fg: "#175cd3" },
  sent: { bg: "#eaf8ef", fg: "#067647" },
  partially_failed: { bg: "#fff4e5", fg: "#b54708" },
  failed: { bg: "#fdecec", fg: "#b42318" },
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
        </Stack>
        <Typography variant="h4" fontWeight={850} sx={{ mt: 1 }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{detail}</Typography>
      </CardContent>
    </Card>
  );
}

function CampaignCard({ campaign, selected, onClick }: { campaign: NotificationCampaign; selected: boolean; onClick: () => void }) {
  const tone = statusColors[campaign.status];
  return (
    <Card
      component="button"
      onClick={onClick}
      variant="outlined"
      sx={{
        width: "100%",
        p: 0,
        textAlign: "left",
        cursor: "pointer",
        borderRadius: 3,
        color: "text.primary",
        bgcolor: "background.paper",
        borderColor: selected ? "primary.main" : "divider",
        boxShadow: selected ? "0 0 0 1px #D30A12" : "none",
        "&:hover": { borderColor: "primary.light" },
      }}
    >
      <CardContent sx={{ p: 2, width: "100%", "&:last-child": { pb: 2 } }}>
        <Stack spacing={1.15}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={800} noWrap>{campaign.title}</Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: .25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
              >
                {campaign.body}
              </Typography>
            </Box>
            <Chip label={statusLabel(campaign.status)} size="small" sx={{ bgcolor: tone.bg, color: tone.fg, fontWeight: 700, flexShrink: 0 }} />
          </Stack>

          <Stack direction="row" spacing={.75} flexWrap="wrap" useFlexGap>
            <Chip icon={<BellRing size={13} />} label={campaign.category} size="small" variant="outlined" />
            <Chip label={campaign.target.value} size="small" variant="outlined" />
            <Chip
              icon={<UsersRound size={13} />}
              label={campaign.audience.type === "all_opted_in" ? "Opted-in audience" : "1 user"}
              size="small"
              variant="outlined"
            />
          </Stack>

          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Typography variant="caption" color="text.secondary">Rev {campaign.revision} · {formatDate(campaign.createdAt)}</Typography>
            {campaign.inboxCount > 0 ? (
              <Typography variant="caption" color="text.secondary"><Inbox size={12} style={{ verticalAlign: "-2px" }} /> {campaign.inboxCount}</Typography>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function NotificationsPage() {
  const staff = useStaff();
  const isAdmin = staff.roles.includes("admin");
  const campaignsQuery = useNotificationCampaignsQuery();
  const [selection, setSelection] = useState<Selection>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const selectedId = selection && selection !== "new" ? selection : null;
  const detail = useNotificationCampaignQuery(selectedId);

  const campaigns = useMemo(
    () => campaignsQuery.data?.pages.flatMap((page) => page.data.items) ?? [],
    [campaignsQuery.data],
  );
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      const matchesStatus = status === "all"
        || (status === "issues" ? campaign.status === "failed" || campaign.status === "partially_failed" : campaign.status === status);
      const matchesSearch = !needle
        || campaign.title.toLowerCase().includes(needle)
        || campaign.body.toLowerCase().includes(needle)
        || campaign.id.toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [campaigns, search, status]);

  const draftCount = campaigns.filter((campaign) => campaign.status === "draft").length;
  const inflightCount = campaigns.filter((campaign) => campaign.status === "queued" || campaign.status === "sending").length;
  const sentCount = campaigns.filter((campaign) => campaign.status === "sent").length;
  const issueCount = campaigns.filter((campaign) => campaign.status === "failed" || campaign.status === "partially_failed").length;

  if (campaignsQuery.isPending) {
    return <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  }

  if (campaignsQuery.error) {
    return (
      <Alert severity="error" action={<Button color="inherit" onClick={() => void campaignsQuery.refetch()}>Retry</Button>}>
        {campaignsQuery.error instanceof Error ? campaignsQuery.error.message : "Unable to load notification campaigns."}
      </Alert>
    );
  }

  return (
    <Stack spacing={2.25}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "flex-end" }} spacing={2}>
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={800}>Engagement / Operational</Typography>
          <Typography variant="h4" fontWeight={850}>Notifications</Typography>
          <Typography color="text.secondary" sx={{ mt: .5, maxWidth: 780 }}>
            Compose and dispatch campaigns through the durable notification outbox. Notifications are operational records and do not participate in content Draft/Publish releases.
          </Typography>
        </Box>
        <Button onClick={() => setSelection("new")} startIcon={<Plus size={17} />} variant="contained">New notification</Button>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,1fr)", lg: "repeat(4,1fr)" }, gap: 1.5 }}>
        <Metric icon={<Megaphone size={18} />} label="Drafts" value={draftCount} detail="Editable campaigns loaded" />
        <Metric icon={<Clock3 size={18} />} label="In flight" value={inflightCount} detail="Queued or sending" />
        <Metric icon={<CheckCircle2 size={18} />} label="Sent" value={sentCount} detail="Completed without failures" />
        <Metric icon={<TriangleAlert size={18} />} label="Needs attention" value={issueCount} detail="Failed or partially failed" />
      </Box>

      <Alert severity="info" icon={<ShieldCheck size={20} />}>
        Editors may create and update drafts. Only verified admins can queue delivery. The API remains authoritative for notification enablement, quotas, recipient preferences and device eligibility.
      </Alert>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "430px minmax(0,1fr)" }, gap: 2, alignItems: "start" }}>
        <Stack spacing={1.25}>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 1.5 }}>
            <Stack spacing={1.25}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search title, message, or campaign ID"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> }}
              />
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={status}
                onChange={(_event, value: StatusFilter | null) => value && setStatus(value)}
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="draft">Draft</ToggleButton>
                <ToggleButton value="queued">Queued</ToggleButton>
                <ToggleButton value="sending">Sending</ToggleButton>
                <ToggleButton value="sent">Sent</ToggleButton>
                <ToggleButton value="issues">Issues</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Paper>

          {filtered.map((campaign) => (
            <CampaignCard
              campaign={campaign}
              key={campaign.id}
              selected={selectedId === campaign.id}
              onClick={() => setSelection(campaign.id)}
            />
          ))}

          {!filtered.length ? (
            <Paper variant="outlined" sx={{ borderRadius: 3, p: 4, textAlign: "center" }}>
              <Megaphone size={28} />
              <Typography fontWeight={800} sx={{ mt: 1 }}>No campaigns found</Typography>
              <Typography variant="body2" color="text.secondary">Adjust filters or create a new draft.</Typography>
            </Paper>
          ) : null}

          {campaignsQuery.hasNextPage ? (
            <Button disabled={campaignsQuery.isFetchingNextPage} onClick={() => void campaignsQuery.fetchNextPage()} variant="outlined">
              {campaignsQuery.isFetchingNextPage ? "Loading…" : "Load next page"}
            </Button>
          ) : null}
        </Stack>

        <Box sx={{ minWidth: 0 }}>
          {selection === "new" ? (
            <CampaignComposer campaign={null} isAdmin={isAdmin} onSaved={setSelection} onReload={() => undefined} />
          ) : selectedId ? (
            detail.isPending ? (
              <Paper variant="outlined" sx={{ minHeight: 360, borderRadius: 3, display: "grid", placeItems: "center" }}><CircularProgress /></Paper>
            ) : detail.error || !detail.data ? (
              <Alert severity="error" action={<Button color="inherit" onClick={() => void detail.refetch()}>Retry</Button>}>
                {detail.error instanceof Error ? detail.error.message : "Unable to load campaign detail."}
              </Alert>
            ) : (
              <CampaignComposer
                campaign={detail.data.data}
                etag={detail.data.etag}
                isAdmin={isAdmin}
                key={`${detail.data.data.id}-${detail.data.data.revision}-${detail.data.data.status}`}
                onSaved={setSelection}
                onReload={() => void detail.refetch()}
              />
            )
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 3, minHeight: 420, display: "grid", placeItems: "center", p: 4, textAlign: "center" }}>
              <Box>
                <BellRing size={38} />
                <Typography variant="h5" fontWeight={800} sx={{ mt: 1.5 }}>Select a campaign</Typography>
                <Typography color="text.secondary" sx={{ mt: .75, maxWidth: 460 }}>
                  Review delivery results, edit a draft, or compose a new notification using Notifications V1.
                </Typography>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
    </Stack>
  );
}
