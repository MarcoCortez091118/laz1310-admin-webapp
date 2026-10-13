import {
  Alert,
  Box,
  Button,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { Download, ExternalLink, ShieldCheck, UsersRound } from "lucide-react";
import { useMemo } from "react";
import { ParticipantsTable } from "./ParticipantsTable";
import type { AccountParticipation } from "./participantTypes";
import {
  useDynamicParticipationsQuery,
  useParticipationServiceStatusQuery,
} from "./queries";

interface ParticipantsPanelProps {
  dynamicId: string;
  title: string;
  isAdmin: boolean;
  active: boolean;
  participationType: "form" | "external_url";
  participationUrl?: string | null;
}

function spreadsheetSafe(value: unknown): string {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value: unknown): string {
  const text = spreadsheetSafe(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function loadedCsv(items: AccountParticipation[]): string {
  const keys = Array.from(new Set(items.flatMap((item) => Object.keys(item.values ?? {}))));
  const header = [
    "id",
    "dynamicId",
    "submittedAt",
    "releaseId",
    "acceptedReleaseId",
    "authenticated",
    "accountUserId",
    "displayName",
    "email",
    "emailVerified",
    "consentVersion",
    ...keys,
  ];
  const rows = items.map((item) => [
    item.id,
    item.dynamicId,
    item.submittedAt,
    item.releaseId,
    item.acceptedReleaseId,
    item.authenticated,
    item.account?.userId ?? "",
    item.account?.displayName ?? "",
    item.account?.email ?? "",
    item.account?.emailVerified ?? "",
    item.consent?.version,
    ...keys.map((key) => item.values?.[key] ?? ""),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function ParticipantsPanel({
  dynamicId,
  title,
  isAdmin,
  active,
  participationType,
  participationUrl,
}: ParticipantsPanelProps) {
  const nativeForm = participationType === "form";
  const status = useParticipationServiceStatusQuery(active && isAdmin && nativeForm);
  const configured = status.data?.data.configured === true;
  const query = useDynamicParticipationsQuery(
    dynamicId,
    active && isAdmin && nativeForm && configured,
  );
  const items = useMemo(
    () =>
      (query.data?.pages.flatMap((page) => page.data.items ?? []) ??
        []) as AccountParticipation[],
    [query.data],
  );

  if (!isAdmin) {
    return (
      <Alert severity="warning" icon={<ShieldCheck size={22} />}>
        <strong>Administrator access required.</strong> Participant responses contain PII. FastAPI exposes this route only to verified users with the admin role.
      </Alert>
    );
  }

  if (!nativeForm) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={1.5} alignItems="flex-start">
          <Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 2, bgcolor: "#fff1f2", color: "primary.main" }}>
            <ExternalLink size={21} />
          </Box>
          <Typography variant="h6" fontWeight={800}>Participants are managed externally</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
            This Dynamic uses <strong>External URL</strong> participation. LA Z does not collect or retain participant responses for this campaign, so there are no native participant records to display here.
          </Typography>
          {participationUrl ? (
            <Button component="a" href={participationUrl} target="_blank" rel="noopener noreferrer" variant="outlined" startIcon={<ExternalLink size={15} />}>
              Open external registration
            </Button>
          ) : null}
        </Stack>
      </Paper>
    );
  }

  if (status.isPending) {
    return (
      <Stack spacing={1.5}>
        <Skeleton variant="rounded" height={100} />
        <Skeleton variant="rounded" height={280} />
      </Stack>
    );
  }

  if (status.error) {
    return (
      <Alert severity="error" action={<Button color="inherit" onClick={() => void status.refetch()}>Retry</Button>}>
        <strong>Unable to verify the participation service.</strong>{" "}
        {status.error instanceof Error ? status.error.message : "Admin API unavailable."}
      </Alert>
    );
  }

  if (!configured) {
    return (
      <Alert severity="warning" icon={<ShieldCheck size={22} />}>
        <strong>Participation encryption is not configured in the API environment.</strong>{" "}
        Native participant PII cannot be read safely until Azure App Service has both <code>DYNAMICS_PII_KEYS</code> and <code>DYNAMICS_HASH_KEY</code>. The Admin will not bypass encryption or expose unprotected responses.
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
      {status.data && !status.data.data.submissionsEnabled ? (
        <Alert severity="info">
          Existing retained records can be reviewed, but new native submissions are disabled in this API environment (<code>DYNAMICS_SUBMISSIONS_ENABLED=false</code>).
        </Alert>
      ) : null}

      <Paper variant="outlined" className="dynamics-participants-header">
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box className="dynamics-participants-icon"><UsersRound size={20} /></Box>
            <Box>
              <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800, letterSpacing: ".12em" }}>Audited PII access</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {items.length} participant record{items.length === 1 ? "" : "s"} loaded. The backend audits each paginated read and retains records for {status.data?.data.retentionDays ?? "—"} days.
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
        <ParticipantsTable items={items} title={title} />
      ) : (
        <Paper variant="outlined" className="dynamics-mui-empty">
          <UsersRound size={30} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>No participations yet</Typography>
          <Typography variant="body2" color="text.secondary">
            This native-form campaign has no retained participant records.
          </Typography>
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
