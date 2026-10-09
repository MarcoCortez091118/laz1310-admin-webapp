import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarRange,
  FileText,
  Radio,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Station } from "../../api/types";
import { useStaff } from "../auth/StaffGate";
import { useDraftQuery, usePublicStateQuery } from "../content/queries";

function shortId(value: string | null | undefined): string {
  if (!value) return "Unpublished";
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
  loading?: boolean;
}

function MetricCard({ icon: Icon, label, value, detail, loading = false }: MetricCardProps) {
  return (
    <Card className="overview-metric-card">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography color="text.secondary" fontSize={13} fontWeight={650}>
              {label}
            </Typography>
            {loading ? (
              <Skeleton width={70} height={42} />
            ) : (
              <Typography component="div" fontSize={30} fontWeight={800} letterSpacing="-0.035em" mt={0.5}>
                {value}
              </Typography>
            )}
          </Box>
          <Box className="overview-metric-icon">
            <Icon size={19} />
          </Box>
        </Stack>
        <Typography color="text.secondary" fontSize={12} mt={1.2}>
          {detail}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const staff = useStaff();
  const draft = useDraftQuery();
  const publicState = usePublicStateQuery();
  const catalog = draft.data?.data.catalog;
  const loading = draft.isPending || publicState.isPending;
  const failed = draft.error ?? publicState.error;

  const pages = catalog?.pages?.length ?? 0;
  const stations = catalog?.stations?.length ?? 0;
  const programs =
    catalog?.stations?.reduce((total: number, station: Station) => total + (station.shows?.length ?? 0), 0) ?? 0;
  const dynamics = catalog?.dynamics?.length ?? 0;
  const activeStations = catalog?.stations?.filter((station: Station) => station.isActive ?? true).length ?? 0;

  const inventoryData = [
    { name: "Pages", value: pages },
    { name: "Stations", value: stations },
    { name: "Programs", value: programs },
    { name: "Dynamics", value: dynamics },
  ];

  const now = Date.now();
  const campaignState = { Live: 0, Scheduled: 0, Ended: 0, Closed: 0 };
  for (const campaign of catalog?.dynamics ?? []) {
    const starts = new Date(campaign.startsAt).getTime();
    const ends = new Date(campaign.endsAt).getTime();
    if (campaign.status === "closed") campaignState.Closed += 1;
    else if (starts > now) campaignState.Scheduled += 1;
    else if (ends <= now) campaignState.Ended += 1;
    else campaignState.Live += 1;
  }

  const campaignData = Object.entries(campaignState).map(([name, value]) => ({ name, value }));
  const campaignColors = ["#D30A12", "#F79009", "#98A2B3", "#2F0908"];
  const draftRevision = draft.data?.data.revision ?? 0;
  const publishedRevision = publicState.data?.data.revision ?? 0;
  const revisionGap = Math.max(0, draftRevision - publishedRevision);

  return (
    <Box component="section" className="modern-page overview-page">
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography color="primary.main" fontSize={11} fontWeight={800} letterSpacing="0.12em" textTransform="uppercase">
            Control plane
          </Typography>
          <Typography component="h1" variant="h4" mt={0.5}>
            Overview
          </Typography>
          <Typography color="text.secondary" fontSize={14} mt={0.6}>
            Real editorial state from FastAPI for {staff.roles.join(", ")} access.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip color="success" label="FastAPI connected" size="small" variant="outlined" />
          <Chip label={`Draft ${draftRevision || "—"}`} size="small" />
          <Chip label={`Published ${shortId(publicState.data?.data.releaseId)}`} size="small" variant="outlined" />
        </Stack>
      </Stack>

      {failed ? (
        <Alert
          action={
            <Button
              color="inherit"
              onClick={() => {
                void draft.refetch();
                void publicState.refetch();
              }}
              size="small"
              startIcon={<RefreshCw size={15} />}
            >
              Retry
            </Button>
          }
          severity="error"
          sx={{ mb: 3 }}
        >
          {failed instanceof Error ? failed.message : "Unable to load administrative state."}
        </Alert>
      ) : null}

      <Box className="overview-metric-grid">
        <MetricCard
          detail={draft.data?.etag ? `Concurrency ${draft.data.etag}` : "Optimistic concurrency enabled"}
          icon={Activity}
          label="Draft revision"
          loading={loading}
          value={draftRevision || "—"}
        />
        <MetricCard
          detail={`${revisionGap} unpublished revision${revisionGap === 1 ? "" : "s"}`}
          icon={RefreshCw}
          label="Published revision"
          loading={loading}
          value={publishedRevision || "—"}
        />
        <MetricCard detail="Draft catalog" icon={FileText} label="Pages" loading={loading} value={pages} />
        <MetricCard
          detail={`${activeStations} active station${activeStations === 1 ? "" : "s"}`}
          icon={Radio}
          label="Stations"
          loading={loading}
          value={stations}
        />
        <MetricCard detail="Shows across all stations" icon={CalendarRange} label="Programs" loading={loading} value={programs} />
        <MetricCard detail="Draft campaigns" icon={Sparkles} label="Dynamics" loading={loading} value={dynamics} />
      </Box>

      <Box className="overview-chart-grid">
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
              <Box>
                <Typography variant="h6">Content inventory</Typography>
                <Typography color="text.secondary" fontSize={13} mt={0.4}>
                  Current Draft resources grouped by module.
                </Typography>
              </Box>
              <Chip label={`Draft #${draftRevision || "—"}`} size="small" variant="outlined" />
            </Stack>
            <Box sx={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#EEF1F5" strokeDasharray="4 4" vertical={false} />
                  <XAxis axisLine={false} dataKey="name" tick={{ fill: "#667085", fontSize: 12 }} tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "#98A2B3", fontSize: 11 }} tickLine={false} />
                  <ChartTooltip
                    contentStyle={{ border: "1px solid #E6EAF0", borderRadius: 10, boxShadow: "0 8px 24px rgba(16,24,40,.08)" }}
                    cursor={{ fill: "rgba(211, 10, 18, 0.04)" }}
                  />
                  <Bar dataKey="value" fill="#D30A12" radius={[7, 7, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6">Dynamics lifecycle</Typography>
            <Typography color="text.secondary" fontSize={13} mt={0.4}>
              Derived from real campaign windows and editorial status.
            </Typography>

            {dynamics ? (
              <>
                <Box sx={{ width: "100%", height: 230, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        cx="50%"
                        cy="50%"
                        data={campaignData}
                        dataKey="value"
                        innerRadius={62}
                        nameKey="name"
                        outerRadius={88}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {campaignData.map((entry, index) => (
                          <Cell fill={campaignColors[index]} key={entry.name} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        contentStyle={{ border: "1px solid #E6EAF0", borderRadius: 10 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box className="overview-legend">
                  {campaignData.map((entry, index) => (
                    <Box className="overview-legend-item" key={entry.name}>
                      <span style={{ backgroundColor: campaignColors[index] }} />
                      <Typography color="text.secondary" fontSize={12}>{entry.name}</Typography>
                      <Typography fontSize={12} fontWeight={800}>{entry.value}</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <Box className="overview-empty-chart">
                <Sparkles size={28} />
                <Typography fontWeight={700}>No campaigns in this Draft</Typography>
                <Typography color="text.secondary" fontSize={12.5}>
                  Dynamics will appear here as soon as they are added.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Box className="overview-detail-grid">
        <Card>
          <CardContent>
            <Typography color="primary.main" fontSize={11} fontWeight={800} letterSpacing="0.1em" textTransform="uppercase">
              Editorial workflow
            </Typography>
            <Typography variant="h6" mt={0.7}>
              Draft → Preview → Publish → Immutable Release
            </Typography>
            <Typography color="text.secondary" fontSize={13.5} mt={1.1} maxWidth={700}>
              Administrative edits update only the Draft. Public clients remain pinned to the current immutable release until an administrator publishes.
            </Typography>
            <Stack direction="row" spacing={1} mt={2.4} flexWrap="wrap" useFlexGap>
              <Chip label={`Draft ${draftRevision || "—"}`} size="small" />
              <Chip label={`Published revision ${publishedRevision || "—"}`} size="small" variant="outlined" />
              <Chip
                color={revisionGap > 0 ? "warning" : "success"}
                label={revisionGap > 0 ? `${revisionGap} pending change${revisionGap === 1 ? "" : "s"}` : "Release is current"}
                size="small"
                variant="outlined"
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6">Current Draft</Typography>
            <Stack divider={<Divider flexItem />} mt={1.5}>
              <Box className="overview-detail-row">
                <Typography color="text.secondary" fontSize={12.5}>Revision</Typography>
                <Typography fontSize={13} fontWeight={800}>{draftRevision || "—"}</Typography>
              </Box>
              <Box className="overview-detail-row">
                <Typography color="text.secondary" fontSize={12.5}>Updated by</Typography>
                <Typography fontSize={12.5} fontWeight={700} sx={{ wordBreak: "break-all", textAlign: "right" }}>
                  {draft.data?.data.updatedBy ?? "Not recorded"}
                </Typography>
              </Box>
              <Box className="overview-detail-row">
                <Typography color="text.secondary" fontSize={12.5}>Updated at</Typography>
                <Typography fontSize={12.5} fontWeight={700} textAlign="right">
                  {formatDate(draft.data?.data.updatedAt)}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
