import { Alert, Box, Button, Card, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { Activity, FileClock, RefreshCw, ShieldCheck } from "lucide-react";
import { useDraftQuery, usePublicStateQuery } from "../content/queries";
import { useStaff } from "../auth/StaffGate";

function timestamp(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Unknown" : date.toLocaleString();
}

/** Operational release diagnostics. Never presented as business intelligence. */
export function MonitoringPage() {
  const staff = useStaff();
  if (!staff.roles.includes("admin")) {
    return <Box className="modern-page"><Alert severity="warning">
      Monitoring is restricted to administrators.</Alert></Box>;
  }
  return <MonitoringContent />;
}

function MonitoringContent() {
  const draft = useDraftQuery();
  const published = usePublicStateQuery();
  const data = draft.data?.data;
  const release = published.data?.data;
  const hasError = draft.isError || published.isError;
  const pending = draft.isPending || published.isPending;
  const versionGap = !hasError && data && release
    ? Math.max(0, data.revision - release.revision) : null;

  return <Box component="section" className="modern-page">
    <Stack spacing={2.25}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
        alignItems={{ sm: "center" }} spacing={1.5}>
        <Box>
          <Typography color="primary.main" variant="overline" fontWeight={800}>
            APP ANDROID / IOS · OPERATIONS
          </Typography>
          <Typography component="h1" variant="h4">Monitoring</Typography>
          <Typography color="text.secondary" fontSize={13.5} mt={.6}>
            Technical publishing state and revision diagnostics from FastAPI.
            Audience analytics are tracked separately from system health.
          </Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<RefreshCw size={16}/>}
          disabled={draft.isFetching || published.isFetching}
          onClick={() => { void draft.refetch(); void published.refetch(); }}>Refresh</Button>
      </Stack>
      {hasError && <Alert severity="error">
        Unable to retrieve the current App editorial state. Values are unavailable, not zero.
      </Alert>}
      <Box sx={{ display: "grid", gap: 2,
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", xl: "repeat(3,minmax(0,1fr))" } }}>
        {[
          { name: "Draft revision", value: hasError || pending ? "—" : data?.revision ?? "—", icon: FileClock },
          { name: "Published revision", value: hasError || pending ? "—" : release?.revision ?? "—", icon: ShieldCheck },
          { name: "Unpublished revision gap", value: versionGap ?? "—", icon: Activity },
        ].map(metric => {
          const Icon = metric.icon;
          return <Card key={metric.name}><CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography color="text.secondary" fontSize={12.5}>{metric.name}</Typography>
              <Box className="overview-metric-icon"><Icon size={18}/></Box>
            </Stack>
            <Typography fontSize={30} fontWeight={850} mt={1}>{metric.value}</Typography>
          </CardContent></Card>;
        })}
      </Box>
      <Card><CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Current App publication</Typography>
          <Chip size="small" variant="outlined"
            label={hasError ? "Unavailable" : release?.releaseId ? "Published" : "Not published"} />
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack spacing={1.5} sx={{ "& strong": { overflowWrap: "anywhere" } }}>
          <Typography variant="body2">Release ID: <strong>{hasError ? "—" : release?.releaseId ?? "None"}</strong></Typography>
          <Typography variant="body2">Draft last updated: <strong>{hasError ? "—" : timestamp(data?.updatedAt)}</strong></Typography>
          <Typography variant="body2">Draft updated by: <strong>{hasError ? "—" : data?.updatedBy ?? "Not recorded"}</strong></Typography>
          <Typography variant="body2" color="text.secondary">
            This information is for operational troubleshooting. Draft and release revisions
            do not measure real visitors, engagement or business growth.
          </Typography>
        </Stack>
      </CardContent></Card>
      <Alert severity="info">
        Return to <Link to="/" style={{ color: "inherit", fontWeight: 700 }}>App Dashboard</Link>
        {" "}to review the current content inventory and campaign lifecycle.
      </Alert>
    </Stack>
  </Box>;
}
