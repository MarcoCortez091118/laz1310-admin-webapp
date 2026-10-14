import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import type { LucideIcon } from "lucide-react";
import {
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
import { Link } from "@tanstack/react-router";
import { useDraftQuery } from "../content/queries";

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
  const theme = useTheme();
  const chartText = theme.palette.text.secondary;
  const chartBorder = theme.palette.divider;
  const tooltipStyle = {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    border: `1px solid ${chartBorder}`,
    borderRadius: 12,
    boxShadow: "0 14px 32px rgba(0,0,0,.15)",
  };
  const draft = useDraftQuery();
  const catalog = draft.data?.data.catalog;
  const loading = draft.isPending;
  const failed = draft.error;
  const metricValue = (value: number): number | string => failed ? "—" : value;

  const pages = catalog?.pages?.length ?? 0;
  const stations = catalog?.stations?.length ?? 0;
  const programs =
    catalog?.stations?.reduce((total: number, station: Station) => total + (station.shows?.length ?? 0), 0) ?? 0;
  const dynamics = catalog?.dynamics?.length ?? 0;
  const activeStations = catalog?.stations?.filter((station: Station) => station.isActive ?? true).length ?? 0;

  const inventoryData = [
    { name: "Pages", value: failed ? null : pages },
    { name: "Stations", value: failed ? null : stations },
    { name: "Programs", value: failed ? null : programs },
    { name: "Dynamics", value: failed ? null : dynamics },
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
  const campaignColors = ["#2BC4A4", "#6397F8", "#FFBC66", "#F14C52"];


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
            Android / iOS · Control plane
          </Typography>
          <Typography component="h1" variant="h4" mt={0.5}>
            App Dashboard
          </Typography>
          <Typography color="text.secondary" fontSize={14} mt={0.6}>
            Editorial content available for Android and iOS, based on the current FastAPI catalog.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button component={Link} to="/programs" variant="outlined" size="small">Programs</Button>
          <Button component={Link} to="/dynamics" variant="contained" size="small">Dynamics</Button>
        </Stack>
      </Stack>

      {failed ? (
        <Alert
          action={
            <Button
              color="inherit"
              onClick={() => {
                void draft.refetch();
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

      <Box className="overview-metric-grid" sx={{
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))",
          xl: "repeat(4,minmax(0,1fr))" },
      }}>
        <MetricCard detail="Draft catalog" icon={FileText} label="Pages" loading={loading} value={metricValue(pages)} />
        <MetricCard
          detail={`${activeStations} active station${activeStations === 1 ? "" : "s"}`}
          icon={Radio}
          label="Stations"
          loading={loading}
          value={metricValue(stations)}
        />
        <MetricCard detail="Shows across all stations" icon={CalendarRange} label="Programs" loading={loading} value={metricValue(programs)} />
        <MetricCard detail="Draft campaigns" icon={Sparkles} label="Dynamics" loading={loading} value={metricValue(dynamics)} />
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
              <Chip label="Current catalog" size="small" variant="outlined" />
            </Stack>
            <Box sx={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={chartBorder} strokeDasharray="4 4" vertical={false} />
                  <XAxis axisLine={false} dataKey="name" tick={{ fill: chartText, fontSize: 12 }} tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tick={{ fill: chartText, fontSize: 11 }} tickLine={false} />
                  <ChartTooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: theme.palette.action.hover }}
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

            {dynamics && !failed ? (
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
                        contentStyle={tooltipStyle}
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
                <Typography fontWeight={700}>{failed ? "Campaign data unavailable" : "No campaigns in this Draft"}</Typography>
                <Typography color="text.secondary" fontSize={12.5}>
                  {failed ? "Retry when FastAPI is available." : "Dynamics will appear here as soon as they are added."}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Card>
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }}
              justifyContent="space-between" spacing={2}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6">Editorial overview</Typography>
                <Typography color="text.secondary" fontSize={13} mt={.5}>
                  These are real counts of content in the App catalog, not audience,
                  listening time or conversion statistics. Release diagnostics
                  are available separately under Monitoring.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" component={Link} to="/notifications">
                  Notifications
                </Button>
                <Button variant="outlined" component={Link} to="/programs">
                  Open programs
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>

    </Box>
  );
}
