import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { Clock3, Plus, Search, Sparkles, Trash2, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useStaff } from "../auth/StaffGate";
import { DynamicEditor } from "./DynamicEditor";
import { DynamicsTrashDialog } from "./DynamicsTrashDialog";
import { lifecycle, type DynamicLifecycle } from "./model";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { useDynamicsQuery } from "./queries";
import "./dynamics.css";

type Selection = string | "new" | null;
type DetailTab = "editor" | "participants";
type LifecycleFilter = "all" | DynamicLifecycle;

const FILTERS: LifecycleFilter[] = ["all", "live", "scheduled", "closed", "ended"];

const lifecycleColor: Record<DynamicLifecycle, "success" | "warning" | "default" | "error"> = {
  live: "success",
  scheduled: "warning",
  ended: "default",
  closed: "error",
};

function dateSummary(startsAt: string | undefined, endsAt: string | undefined, timezone: string | undefined) {
  if (!startsAt || !endsAt) return "Window unavailable";
  const format = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone || "America/Detroit",
    timeZoneName: "short",
  });
  return `${format.format(new Date(startsAt))} → ${format.format(new Date(endsAt))}`;
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card variant="outlined" className="dynamics-mui-metric">
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 800 }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{detail}</Typography>
          </Box>
          <Box className="dynamics-mui-metric-icon">{icon}</Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function DynamicsPage() {
  const staff = useStaff();
  const query = useDynamicsQuery();
  const [selection, setSelection] = useState<Selection>(null);
  const [tab, setTab] = useState<DetailTab>("editor");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LifecycleFilter>("all");
  const [trashOpen, setTrashOpen] = useState(false);
  const isAdmin = staff.roles?.includes("admin") ?? false;

  const dynamics = useMemo(() => query.data?.data ?? [], [query.data]);
  const now = useMemo(() => new Date(query.dataUpdatedAt || Date.now()), [query.dataUpdatedAt]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return [...dynamics]
      .filter((dynamic) => {
        const current = lifecycle(dynamic, now);
        const matchLifecycle = filter === "all" || current === filter;
        const matchSearch =
          !needle ||
          (dynamic.title ?? "").toLowerCase().includes(needle) ||
          (dynamic.slug ?? "").toLowerCase().includes(needle) ||
          (dynamic.context ?? "").toLowerCase().includes(needle);
        return matchLifecycle && matchSearch;
      })
      .sort((left, right) => {
        if ((left.featured ?? false) !== (right.featured ?? false)) return left.featured ? -1 : 1;
        return new Date(left.startsAt ?? 0).getTime() - new Date(right.startsAt ?? 0).getTime();
      });
  }, [dynamics, filter, now, search]);

  const selected = useMemo(
    () =>
      selection && selection !== "new"
        ? dynamics.find((dynamic) => dynamic.id === selection) ?? null
        : null,
    [dynamics, selection],
  );

  if (query.isPending) {
    return (
      <Box className="modern-page dynamics-mui-page">
        <Stack spacing={2}>
          <Skeleton variant="text" width={220} height={50} />
          <Box className="dynamics-mui-metrics">
            {[0, 1, 2].map((item) => <Skeleton key={item} variant="rounded" height={126} />)}
          </Box>
          <Skeleton variant="rounded" height={520} />
        </Stack>
      </Box>
    );
  }

  if (query.error || !query.data) {
    return (
      <Box className="modern-page dynamics-mui-page">
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={() => void query.refetch()}>Retry</Button>}
        >
          <strong>Unable to load campaigns.</strong>{" "}
          {query.error instanceof Error ? query.error.message : "Admin API unavailable."}
        </Alert>
      </Box>
    );
  }

  const etag = query.data.etag;
  if (!etag) {
    return (
      <Box className="modern-page dynamics-mui-page">
        <Alert severity="warning">
          <strong>Draft ETag missing.</strong> Campaign writes are disabled because optimistic concurrency cannot be enforced safely.
        </Alert>
      </Box>
    );
  }

  const liveCount = dynamics.filter((item) => lifecycle(item, now) === "live").length;
  const scheduledCount = dynamics.filter((item) => lifecycle(item, now) === "scheduled").length;
  const formCount = dynamics.filter((item) => item.participation?.type === "form").length;

  return (
    <Box className="modern-page dynamics-mui-page">
      <Stack spacing={2.25}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "flex-end" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800, letterSpacing: ".12em" }}>
              Engagement · Draft
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-.035em" }}>Dynamics</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 780 }}>
              Save campaigns to Draft and publish each campaign independently. Global Draft publication remains an Operations / Releases workflow.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ width: { xs: "100%", md: "auto" } }}>
            <Chip label={`ETag ${etag}`} size="small" variant="outlined" sx={{ alignSelf: { xs: "flex-start", sm: "center" } }} />
            <Button variant="outlined" startIcon={<Trash2 size={16} />} onClick={() => setTrashOpen(true)}>
              Trash
            </Button>
            <Button
              variant="outlined"
              startIcon={<Plus size={17} />}
              disabled={dynamics.length >= 100}
              onClick={() => {
                setSelection("new");
                setTab("editor");
              }}
            >
              New campaign
            </Button>
          </Stack>
        </Stack>

        {!isAdmin ? (
          <Alert severity="info">
            Editors can create, edit, restore and move Dynamics to trash. A verified administrator publishes an individual campaign from its editor.
          </Alert>
        ) : null}

        <Box className="dynamics-mui-metrics">
          <MetricCard icon={<Sparkles size={21} />} label="Campaigns" value={dynamics.length} detail="Maximum 100 in Draft catalog" />
          <MetricCard icon={<Clock3 size={21} />} label="Live now" value={liveCount} detail={`${scheduledCount} scheduled`} />
          <MetricCard icon={<UsersRound size={21} />} label="Native forms" value={formCount} detail={`${dynamics.length - formCount} external URL`} />
        </Box>

        <Paper variant="outlined" className="dynamics-mui-toolbar">
          <TextField
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, slug, or context"
            aria-label="Search campaigns"
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search size={17} /></InputAdornment>,
            }}
          />
          <Stack direction="row" spacing={0.75} className="dynamics-mui-filter" role="group" aria-label="Campaign lifecycle filter">
            {FILTERS.map((value) => (
              <Chip
                clickable
                key={value}
                color={filter === value ? "primary" : "default"}
                variant={filter === value ? "filled" : "outlined"}
                label={value[0].toUpperCase() + value.slice(1)}
                onClick={() => setFilter(value)}
              />
            ))}
          </Stack>
        </Paper>

        <Box className="dynamics-mui-layout">
          <Paper variant="outlined" className="dynamics-mui-catalog">
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Campaign catalog</Typography>
                <Typography variant="caption" color="text.secondary">{filtered.length} of {dynamics.length} visible</Typography>
              </Box>
              <Chip size="small" label="Draft" color="warning" variant="outlined" />
            </Stack>

            <Box className="dynamics-mui-campaign-list" aria-label="Dynamics campaigns">
              {filtered.length ? filtered.map((dynamic) => {
                const current = lifecycle(dynamic, now);
                const isSelected = selection === dynamic.id;
                return (
                  <Card
                    key={dynamic.id}
                    variant="outlined"
                    className={`dynamics-mui-campaign ${isSelected ? "selected" : ""}`}
                  >
                    <CardActionArea
                      onClick={() => {
                        setSelection(dynamic.id ?? null);
                        setTab("editor");
                      }}
                    >
                      <Box className="dynamics-mui-campaign-image">
                        <img alt={dynamic.artworkLabel || dynamic.title || "Campaign"} referrerPolicy="no-referrer" src={dynamic.imageUrl} />
                        <Stack direction="row" spacing={0.6} className="dynamics-mui-campaign-badges">
                          <Chip label={current} color={lifecycleColor[current]} size="small" />
                          {dynamic.featured ? <Chip label="Featured" color="primary" size="small" /> : null}
                        </Stack>
                      </Box>
                      <CardContent sx={{ p: 1.75 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>{dynamic.title}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.4 }}>
                          {dynamic.context} · {dynamic.participation?.type === "form" ? "Native form" : "External URL"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                          {dateSummary(dynamic.startsAt, dynamic.endsAt, dynamic.timezone)}
                        </Typography>
                        <Typography component="code" variant="caption" color="text.secondary" display="block" noWrap sx={{ mt: 0.6 }}>
                          {dynamic.slug}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              }) : (
                <Box className="dynamics-mui-empty">
                  <Sparkles size={28} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>No campaigns found</Typography>
                  <Typography variant="body2" color="text.secondary">Adjust the filters or create a new Dynamic.</Typography>
                </Box>
              )}
            </Box>
          </Paper>

          <Box className="dynamics-mui-detail">
            {selection === "new" ? (
              <DynamicEditor
                allDynamics={dynamics}
                dynamic={null}
                etag={etag}
                isAdmin={isAdmin}
                key={`new-${etag}`}
                onDeleted={() => setSelection(null)}
                onSaved={(dynamicId) => setSelection(dynamicId)}
              />
            ) : selected ? (
              <>
                <Paper variant="outlined" sx={{ mb: 1.5, px: 1 }}>
                  <Tabs
                    value={tab}
                    onChange={(_event, value: DetailTab) => setTab(value)}
                    aria-label="Dynamic detail"
                  >
                    <Tab value="editor" label="Campaign" />
                    <Tab value="participants" label={`Participants${isAdmin ? "" : " · Admin"}`} />
                  </Tabs>
                </Paper>
                {tab === "editor" ? (
                  <DynamicEditor
                    allDynamics={dynamics}
                    dynamic={selected}
                    etag={etag}
                    isAdmin={isAdmin}
                    key={`${selected.id}-${etag}`}
                    onDeleted={() => setSelection(null)}
                    onSaved={(dynamicId) => setSelection(dynamicId)}
                  />
                ) : (
                  <ParticipantsPanel
                    active={tab === "participants"}
                    dynamicId={selected.id ?? ""}
                    isAdmin={isAdmin}
                    title={selected.title ?? "Campaign"}
                    participationType={selected.participation?.type ?? "external_url"}
                    participationUrl={selected.participation?.url}
                  />
                )}
              </>
            ) : (
              <Paper variant="outlined" className="dynamics-mui-detail-empty">
                <Box className="dynamics-mui-detail-empty-icon"><Sparkles size={28} /></Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Select a campaign</Typography>
                <Typography color="text.secondary" textAlign="center" sx={{ maxWidth: 500 }}>
                  Choose an existing campaign or create a new one. Save it to Draft first; administrators can publish that campaign independently from its editor.
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
      </Stack>

      <DynamicsTrashDialog
        open={trashOpen}
        etag={etag}
        isAdmin={isAdmin}
        onClose={() => setTrashOpen(false)}
      />
    </Box>
  );
}
