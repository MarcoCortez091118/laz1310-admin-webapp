import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack,
  Typography, useTheme,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight, FileClock, Globe, Image, Newspaper, Radio, RefreshCw, Ticket,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import { readBannerPublication, websiteBannerKeys } from "./banners/api";
import { listShows, showKeys } from "./shows/api";
import { listPromotions, promotionKeys } from "./tickets/api";
import { listWebsiteDrafts, websiteDraftKeys } from "./news/draftsApi";

const sections = [
  {
    label: "News / Blog", to: "/website/news" as const, icon: Newspaper,
    description: "Review article drafts and publication.",
  },
  {
    label: "Website Banners", to: "/website/banners" as const, icon: Image,
    description: "Manage desktop/mobile artwork and release.",
  },
  {
    label: "Website Shows", to: "/website/shows" as const, icon: Radio,
    description: "Publish each program and manage the recycle bin.",
  },
  {
    label: "Ticket Promotions", to: "/website/ticket-promotions" as const, icon: Ticket,
    description: "Review promotions, destinations and participation actions.",
  },
];

/** Website-only operational data from FastAPI; never native Mobile releases. */
export function WebsiteDashboardPage() {
  const theme = useTheme();
  const news = useQuery({
    queryKey: [...websiteDraftKeys, "overview", 50],
    queryFn: async () => (await listWebsiteDrafts(50)).data,
    retry: false,
  });
  const shows = useQuery({
    queryKey: showKeys.list("active"),
    queryFn: async () => (await listShows("active")).data,
    retry: false,
  });
  const promotions = useQuery({
    queryKey: promotionKeys.list("active"),
    queryFn: async () => (await listPromotions("active")).data,
    retry: false,
  });
  const banners = useQuery({
    queryKey: websiteBannerKeys.publication,
    queryFn: async () => (await readBannerPublication()).data,
    retry: false,
  });

  const overview = [
    {
      label: "News drafts loaded",
      value: news.data?.items.length,
      detail: news.data?.nextCursor ? "First 50; more available" : "First page of editor drafts",
      icon: Newspaper,
      to: "/website/news" as const,
      loading: news.isPending,
      error: news.isError,
    },
    {
      label: "Show drafts loaded",
      value: shows.data?.items.length,
      detail: "Active Website shows (up to 100)",
      icon: Radio,
      to: "/website/shows" as const,
      loading: shows.isPending,
      error: shows.isError,
    },
    {
      label: "Promotion drafts loaded",
      value: promotions.data?.items.length,
      detail: "Active promotions (up to 100)",
      icon: Ticket,
      to: "/website/ticket-promotions" as const,
      loading: promotions.isPending,
      error: promotions.isError,
    },
    {
      label: "Published banner variants",
      value: banners.data
        ? banners.data.content.desktop.length + banners.data.content.mobile.length
        : undefined,
      detail: "Desktop + mobile images in current release",
      icon: Image,
      to: "/website/banners" as const,
      loading: banners.isPending,
      error: banners.isError,
    },
  ];

  const inventory = [
    { name: "News", count: news.data?.items.length ?? null, ready: Boolean(news.data) },
    { name: "Shows", count: shows.data?.items.length ?? null, ready: Boolean(shows.data) },
    { name: "Promotions", count: promotions.data?.items.length ?? null, ready: Boolean(promotions.data) },
  ];
  const hasAnyError = news.isError || shows.isError || promotions.isError || banners.isError;
  const chartText = theme.palette.text.secondary;

  function refresh() {
    void news.refetch();
    void shows.refetch();
    void promotions.refetch();
    void banners.refetch();
  }

  return (
    <Box component="section" className="modern-page" aria-label="Website dashboard">
      <Stack spacing={2.5}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }}
          justifyContent="space-between" spacing={2}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Globe size={18} color={theme.palette.primary.main} aria-hidden />
              <Typography variant="overline" color="primary.main" fontWeight={800}>
                LA Z 1310 · WEBSITE
              </Typography>
              <Chip label="Separate from Android / iOS" size="small" variant="outlined" />
            </Stack>
            <Typography component="h1" variant="h4" mt={0.75} fontWeight={850}>
              Website Dashboard
            </Typography>
            <Typography color="text.secondary" mt={0.75} maxWidth={760}>
              Editorial overview using Website-only records supplied by FastAPI.
              Counts reflect the loaded page, not invented traffic or audience analytics.
            </Typography>
          </Box>
          <Button variant="outlined" size="small" startIcon={<RefreshCw size={16}/>}
            onClick={refresh} disabled={news.isFetching || shows.isFetching || promotions.isFetching || banners.isFetching}>
            Refresh
          </Button>
        </Stack>

        {hasAnyError && <Alert severity="warning" action={
          <Button color="inherit" size="small" onClick={refresh}>Retry</Button>
        }>
          One or more Website modules could not be loaded. Unavailable values are shown as —
          rather than reporting incorrect zero counts.
        </Alert>}

        <Box sx={{ display: "grid", gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))",
            xl: "repeat(4,minmax(0,1fr))" } }}>
          {overview.map(metric => {
            const Icon = metric.icon;
            return <Link key={metric.label} to={metric.to}
              style={{ textDecoration: "none", color: "inherit" }}>
              <Card className="overview-metric-card" sx={{ height: "100%",
                "&:hover": { borderColor: "primary.main" } }}>
                <CardContent>
                  <Stack direction="row" alignItems="flex-start"
                    justifyContent="space-between" spacing={1}>
                    <Typography color="text.secondary" fontSize={12.5} fontWeight={700}>
                      {metric.label}
                    </Typography>
                    <Box className="overview-metric-icon"><Icon size={18} aria-hidden /></Box>
                  </Stack>
                  <Typography fontSize={30} fontWeight={850} mt={1.5}
                    sx={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-.04em" }}>
                    {metric.loading ? <CircularProgress size={23} /> :
                      metric.error ? "—" : metric.value ?? "—"}
                  </Typography>
                  <Typography fontSize={11.5} color="text.secondary" mt={0.6}>
                    {metric.error ? "Unable to load" : metric.detail}
                  </Typography>
                </CardContent>
              </Card>
            </Link>;
          })}
        </Box>

        <Box sx={{ display: "grid", gap: 2,
          gridTemplateColumns: { xs: "1fr", xl: "minmax(0,1.2fr) minmax(300px,.8fr)" } }}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography variant="h6">Loaded editorial inventory</Typography>
                  <Typography fontSize={12.5} color="text.secondary" mt={0.5}>
                    Draft records loaded per Website module; capped by each endpoint.
                  </Typography>
                </Box>
                <FileClock size={19} color={chartText} aria-hidden />
              </Stack>
              <Box role="img" aria-label="Bar chart of loaded Website news, shows and promotion drafts"
                sx={{ width: "100%", height: 270 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventory} margin={{ top: 10, right: 12, left: -20, bottom: 4 }}>
                    <CartesianGrid stroke={theme.palette.divider} strokeDasharray="4 5" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false}
                      tick={{ fill: chartText, fontSize: 12 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false}
                      tick={{ fill: chartText, fontSize: 11 }} />
                    <ChartTooltip contentStyle={{
                      background: theme.palette.background.paper,
                      color: theme.palette.text.primary,
                      border: `1px solid ${theme.palette.divider}`, borderRadius: 12,
                    }} />
                    <Bar dataKey="count" name="Loaded drafts"
                      fill="#D30A12" radius={[7,7,0,0]} maxBarSize={72} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              {inventory.some(x => !x.ready) && <Typography fontSize={11.5}
                color="text.secondary" mt={1}>
                Unavailable modules are omitted from the chart rather than reported as zero.
              </Typography>}
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" mb={1}>Editorial workspaces</Typography>
              <Typography fontSize={12.5} color="text.secondary" mb={1.5}>
                Manage each published content type independently.
              </Typography>
              <Stack spacing={0.75}>
                {sections.map(item => {
                  const Icon = item.icon;
                  return <Link key={item.to} to={item.to}
                    style={{ color: "inherit", textDecoration: "none" }}>
                    <Box sx={{
                      display: "flex", alignItems: "center", gap: 1.5,
                      px: 1.5, py: 1.25, borderRadius: 2,
                      "&:hover": { bgcolor: "action.hover" },
                      "&:focus-within": { outline: "2px solid", outlineColor: "primary.main" },
                    }}>
                      <Box className="overview-metric-icon" sx={{ flexShrink: 0 }}>
                        <Icon size={18} aria-hidden />
                      </Box>
                      <Box flex={1} minWidth={0}>
                        <Typography fontWeight={750} fontSize={13.5}>{item.label}</Typography>
                        <Typography color="text.secondary" fontSize={11.5}>
                          {item.description}
                        </Typography>
                      </Box>
                      <ArrowUpRight size={18} color={chartText} aria-hidden />
                    </Box>
                  </Link>;
                })}
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Alert severity="info">
          Website drafts and publications are isolated from the native Android/iOS
          content catalog. Publishing must be performed in the corresponding Website module.
        </Alert>
      </Stack>
    </Box>
  );
}
