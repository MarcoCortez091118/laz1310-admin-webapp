import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Download, ShieldCheck, UsersRound } from "lucide-react";
import { useMemo } from "react";
import type { AdminParticipation } from "../../api/types";
import { useDynamicParticipationsQuery } from "./queries";

interface ParticipantsPanelProps {
  dynamicId: string;
  title: string;
  isAdmin: boolean;
  active: boolean;
}

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function spreadsheetSafe(value: unknown): string {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value: unknown): string {
  const text = spreadsheetSafe(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function loadedCsv(items: AdminParticipation[]): string {
  const keys = Array.from(new Set(items.flatMap((item) => Object.keys(item.values ?? {}))));
  const header = ["id", "dynamicId", "submittedAt", "releaseId", "acceptedReleaseId", "authenticated", "consentVersion", ...keys];
  const rows = items.map((item) => [
    item.id,
    item.dynamicId,
    item.submittedAt,
    item.releaseId,
    item.acceptedReleaseId,
    item.authenticated,
    item.consent?.version,
    ...keys.map((key) => item.values?.[key] ?? ""),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function ParticipantsPanel({ dynamicId, title, isAdmin, active }: ParticipantsPanelProps) {
  const query = useDynamicParticipationsQuery(dynamicId, active && isAdmin);
  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.data.items ?? []) ?? [],
    [query.data],
  );
  const valueKeys = useMemo(
    () => Array.from(new Set(items.flatMap((item) => Object.keys(item.values ?? {})))),
    [items],
  );

  if (!isAdmin) {
    return (
      <Alert severity="warning" icon={<ShieldCheck size={22} />}>
        <strong>Administrator access required.</strong> Participant responses contain PII. FastAPI exposes this route only to verified users with the admin role.
      </Alert>
    );
  }

  if (query.isPending) {
    return (
      <Stack spacing={1.5}>
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={320} />
      </Stack>
    );
  }

  if (query.error) {
    return (
      <Alert
        severity="error"
        action={<Button color="inherit" size="small" onClick={() => void query.refetch()}>Retry</Button>}
      >
        <strong>Unable to load participants.</strong>{" "}
        {query.error instanceof Error ? query.error.message : "Admin API unavailable."}
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Paper variant="outlined" className="dynamics-participants-header">
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box className="dynamics-participants-icon"><UsersRound size={20} /></Box>
            <Box>
              <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800, letterSpacing: ".12em" }}>Audited PII access</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {items.length} participant record{items.length === 1 ? "" : "s"} loaded. The backend audits each paginated read.
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<Download size={16} />}
            disabled={!items.length}
            onClick={() => {
              const blob = new Blob([loadedCsv(items)], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = `dynamics-${dynamicId}-participants-loaded.csv`;
              anchor.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export loaded rows
          </Button>
        </Stack>
      </Paper>

      {items.length ? (
        <TableContainer component={Paper} variant="outlined" className="dynamics-participants-table">
          <Table stickyHeader size="small" aria-label={`${title} participants`}>
            <TableHead>
              <TableRow>
                <TableCell>Submitted</TableCell>
                <TableCell>Identity</TableCell>
                {valueKeys.map((key) => <TableCell key={key}>{key}</TableCell>)}
                <TableCell>Consent</TableCell>
                <TableCell>Release evidence</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ minWidth: 170 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatDate(item.submittedAt)}</Typography>
                    <Typography component="code" variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{item.id}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.authenticated ? "Authenticated" : "Anonymous"}
                      color={item.authenticated ? "success" : "default"}
                      size="small"
                      variant={item.authenticated ? "filled" : "outlined"}
                    />
                  </TableCell>
                  {valueKeys.map((key) => (
                    <TableCell key={key} sx={{ minWidth: 140, maxWidth: 300, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      {String(item.values?.[key] ?? "—")}
                    </TableCell>
                  ))}
                  <TableCell sx={{ minWidth: 170 }}>
                    <Typography variant="body2">v{item.consent?.version ?? "—"}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDate(item.consent?.acceptedAt)}</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 220 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Presented</Typography>
                    <Typography component="code" variant="caption" sx={{ overflowWrap: "anywhere" }}>{item.releaseId}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>Accepted</Typography>
                    <Typography component="code" variant="caption" sx={{ overflowWrap: "anywhere" }}>{item.acceptedReleaseId}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper variant="outlined" className="dynamics-mui-empty">
          <UsersRound size={30} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>No participations yet</Typography>
          <Typography variant="body2" color="text.secondary">This campaign has no retained participant records.</Typography>
        </Paper>
      )}

      {query.hasNextPage ? (
        <Button
          variant="outlined"
          sx={{ alignSelf: "center" }}
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? "Loading…" : "Load next page"}
        </Button>
      ) : null}
    </Stack>
  );
}
