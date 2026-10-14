import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Paper,
  Pagination,
  Stack,
  TextField,
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
} from "lucide-react";
import { useMemo, useState } from "react";
import { useStaff } from "../auth/StaffGate";
import { CampaignComposer } from "./CampaignComposer";
import { statusLabel, type CampaignStatus, type NotificationCampaign } from "./model";
import { useNotificationCampaignQuery, useNotificationCampaignsQuery } from "./queries";
import "./notifications.css";
import { paginateItems } from "../../app/pagination";

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
    <Card variant="outlined" sx={{ borderRadius: 3, minWidth: 0 }}>
      <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
          <Box sx={{ color: "primary.main", display: "flex", flexShrink: 0 }}>{icon}</Box>
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
        minWidth: 0,
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
      <CardContent sx={{ p: 1.5, width: "100%", minWidth: 0, "&:last-child": { pb: 1.5 } }}>
        <Stack spacing={.6} minWidth={0}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} minWidth={0}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography fontWeight={800} noWrap>{campaign.title}</Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: .25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", overflowWrap: "anywhere" }}
              >
                {campaign.body}
              </Typography>
            </Box>
            <Chip label={statusLabel(campaign.status)} size="small" sx={{ bgcolor: tone.bg, color: tone.fg, fontWeight: 700, flexShrink: 0 }} />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
            <Typography variant="caption" color="text.secondary" noWrap>
              {campaign.category} · {campaign.audience.type === "all_opted_in" ? "Opted-in" : "1 user"}
            </Typography>
            {campaign.inboxCount > 0 && <Chip size="small" variant="outlined"
              icon={<Inbox size={12}/>} label={campaign.inboxCount} />}
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={.5}>
            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {formatDate(campaign.createdAt)}
            </Typography>

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
  const [page, setPage] = useState(1);
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

  const campaignPage = paginateItems(filtered, page, 8);

  const draftCount = campaigns.filter((campaign) => campaign.status === "draft").length;
  const inflightCount = campaigns.filter((campaign) => campaign.status === "queued" || campaign.status === "sending").length;
  const sentCount = campaigns.filter((campaign) => campaign.status === "sent").length;
  const issueCount = campaigns.filter((campaign) => campaign.status === "failed" || campaign.status === "partially_failed").length;

  if (campaignsQuery.isPending) {
    return <Box className="modern-page notifications-page" sx={{ minHeight: 360, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  }

  if (campaignsQuery.error) {
    return (
      <Box className="modern-page notifications-page">
        <Alert severity="error" action={<Button color="inherit" onClick={() => void campaignsQuery.refetch()}>Retry</Button>}>
          {campaignsQuery.error instanceof Error ? campaignsQuery.error.message : "Unable to load notification campaigns."}
        </Alert>
      </Box>
    );
  }

  return (
    <Stack className="modern-page notifications-page" spacing={2.25}>
      <Stack className="notifications-page-header" direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "flex-end" }} spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="primary.main" fontWeight={800}>Engagement / Operational</Typography>
          <Typography variant="h4" fontWeight={850}>Notifications</Typography>
          <Typography color="text.secondary" sx={{ mt: .5, maxWidth: 780 }}>
            Compose and dispatch campaigns through the durable notification outbox. Notifications are operational records and do not participate in content Draft/Publish releases.
          </Typography>
        </Box>
        <Button onClick={() => setSelection("new")} startIcon={<Plus size={17} />} variant="contained" sx={{ flexShrink: 0 }}>
          New notification
        </Button>
      </Stack>

      <Box className="notifications-metrics">
        <Metric icon={<Megaphone size={18} />} label="Drafts" value={draftCount} detail="Editable campaigns loaded" />
        <Metric icon={<Clock3 size={18} />} label="In flight" value={inflightCount} detail="Queued or sending" />
        <Metric icon={<CheckCircle2 size={18} />} label="Sent" value={sentCount} detail="Completed without failures" />
        <Metric icon={<TriangleAlert size={18} />} label="Needs attention" value={issueCount} detail="Failed or partially failed" />
      </Box>

      <Alert severity="info" icon={<ShieldCheck size={20} />}>
        Editors may create and update drafts. Only verified admins can queue delivery. The API remains authoritative for notification enablement, quotas, recipient preferences and device eligibility.
      </Alert>

      <Box className="notifications-workbench">
        <Box className="notifications-campaign-pane">
          <Paper className="notifications-list-controls" variant="outlined" sx={{ p: 1.5 }}>
            <Stack spacing={1.25}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search title, message, or campaign ID"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> }}
              />
              <TextField select size="small" label="Campaign status" value={status}
                onChange={event => {
                  setStatus(event.target.value as StatusFilter);
                  setPage(1);
                }}
                fullWidth
              >
                <MenuItem value="all">All campaigns</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="queued">Queued</MenuItem>
                <MenuItem value="sending">Sending</MenuItem>
                <MenuItem value="sent">Sent</MenuItem>
                <MenuItem value="issues">Needs attention</MenuItem>
              </TextField>
            </Stack>
          </Paper>

          {campaignPage.items.map((campaign) => (
            <CampaignCard
              campaign={campaign}
              key={campaign.id}
              selected={selectedId === campaign.id}
              onClick={() => setSelection(campaign.id)}
            />
          ))}

          {campaignPage.pages > 1 && <Stack alignItems="center" gap={.75}>
            <Typography variant="caption" color="text.secondary">
              Showing {campaignPage.items.length} of {campaignPage.total} loaded campaigns
            </Typography>
            <Pagination count={campaignPage.pages} page={campaignPage.page}
              onChange={(_, next) => setPage(next)} size="small" color="primary" />
          </Stack>}
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
        </Box>

        <Box className="notifications-detail-pane">
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
            <Paper variant="outlined" sx={{ borderRadius: 3, minHeight: 320, display: "grid", placeItems: "center", p: 4, textAlign: "center" }}>
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
