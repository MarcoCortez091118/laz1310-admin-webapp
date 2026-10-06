import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Rocket, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { adminQueryKeys } from "../content/api";
import {
  deleteProgramTrash,
  programsQueryKeys,
  publishProgram,
  restoreProgram,
  type ProgramTrashItem,
  type PublishedProgramOutsideDraft,
} from "./api";
import {
  useProgramTrashQuery,
  usePublishedProgramsOutsideDraftQuery,
} from "./queries";

function date(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

async function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: programsQueryKeys.status }),
    queryClient.invalidateQueries({ queryKey: programsQueryKeys.trash }),
    queryClient.invalidateQueries({ queryKey: programsQueryKeys.publishedOutsideDraft }),
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.draft }),
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview }),
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.publicState }),
    queryClient.invalidateQueries({ queryKey: ["admin", "releases"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "audit"] }),
  ]);
}

function TrashRow({
  item,
  etag,
  isAdmin,
}: {
  item: ProgramTrashItem;
  etag: string;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();

  const restore = useMutation({
    mutationFn: () => restoreProgram(item.id, etag),
    onSuccess: async (result) => {
      queryClient.setQueryData(adminQueryKeys.draft, result);
      await invalidateAll(queryClient);
    },
  });

  const removal = useMutation({
    mutationFn: () =>
      publishProgram(
        item.stationId,
        item.programId,
        `Remove ${item.snapshot.name}`.slice(0, 300),
        etag,
      ),
    onSuccess: async () => invalidateAll(queryClient),
  });

  const permanentDelete = useMutation({
    mutationFn: () => deleteProgramTrash(item.id),
    onSuccess: async () => invalidateAll(queryClient),
  });

  const pending = restore.isPending || removal.isPending || permanentDelete.isPending;
  const error = restore.error ?? removal.error ?? permanentDelete.error;

  return (
    <Box sx={{ py: 1.75 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography fontWeight={800}>{item.snapshot.name}</Typography>
            <Chip
              size="small"
              color={item.restoredAt ? "success" : "default"}
              variant="outlined"
              label={item.restoredAt ? "Restored" : "In trash"}
            />
            <Chip
              size="small"
              color={item.published ? "error" : "success"}
              variant={item.published ? "filled" : "outlined"}
              label={item.published ? "Still live in Mobile" : "Removed from Mobile"}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            /{item.snapshot.slug} · deleted {date(item.deletedAt)} by {item.deletedBy}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.4, overflowWrap: "anywhere" }}
          >
            Station {item.stationId} · Program {item.programId} · {item.schedule.length} schedule
            {item.schedule.length === 1 ? " slot" : " slots"}
          </Typography>
          {item.published && !item.restoredAt ? (
            <Alert severity="warning" sx={{ mt: 1.25 }}>
              This program was removed from Draft but is still in the current public release.
              Mobile will keep showing it until its removal is published.
            </Alert>
          ) : null}
          {item.restoredAt ? (
            <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 0.4 }}>
              Restored {date(item.restoredAt)} by {item.restoredBy ?? "unknown"}
            </Typography>
          ) : null}
        </Box>

        <Stack spacing={1} sx={{ alignSelf: { xs: "stretch", md: "flex-start" }, minWidth: 190 }}>
          {isAdmin && item.published && !item.restoredAt ? (
            <Button
              size="small"
              color="error"
              variant="contained"
              startIcon={<Rocket size={15} />}
              disabled={pending}
              onClick={() => removal.mutate()}
            >
              {removal.isPending ? "Removing…" : "Remove from app now"}
            </Button>
          ) : null}
          {!item.restoredAt ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<RotateCcw size={15} />}
              disabled={pending}
              onClick={() => restore.mutate()}
            >
              {restore.isPending ? "Restoring…" : "Restore to Draft"}
            </Button>
          ) : null}
          {isAdmin && !item.published ? (
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<Trash2 size={15} />}
              disabled={pending}
              onClick={() => permanentDelete.mutate()}
            >
              {permanentDelete.isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          ) : null}
        </Stack>
      </Stack>
      {error ? (
        <Alert severity="error" sx={{ mt: 1.25 }}>
          {error instanceof Error ? error.message : "Unable to update Programs trash."}
        </Alert>
      ) : null}
    </Box>
  );
}

function PublishedOnlyRecoveryRow({
  item,
  etag,
  isAdmin,
}: {
  item: PublishedProgramOutsideDraft;
  etag: string;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const removal = useMutation({
    mutationFn: () =>
      publishProgram(
        item.stationId,
        item.program.id,
        `Remove ${item.program.name}`.slice(0, 300),
        etag,
      ),
    onSuccess: async () => invalidateAll(queryClient),
  });

  return (
    <Box sx={{ py: 1.75 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography fontWeight={800}>{item.program.name}</Typography>
            <Chip size="small" color="error" label="Still live in Mobile" />
            <Chip size="small" color="warning" variant="outlined" label="Missing from Draft & Trash" />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            {item.stationName} · /{item.program.slug} · public release {item.releaseId}
          </Typography>
          <Alert severity="warning" icon={<TriangleAlert size={19} />} sx={{ mt: 1.25 }}>
            This program exists in the current Mobile release but has no matching Draft or Trash
            entry. It can be reconciled safely by publishing only its removal.
          </Alert>
        </Box>
        {isAdmin ? (
          <Button
            size="small"
            color="error"
            variant="contained"
            startIcon={<Rocket size={15} />}
            disabled={removal.isPending}
            onClick={() => removal.mutate()}
            sx={{ alignSelf: { xs: "stretch", sm: "flex-start" }, flexShrink: 0 }}
          >
            {removal.isPending ? "Removing…" : "Remove from app now"}
          </Button>
        ) : null}
      </Stack>
      {removal.error ? (
        <Alert severity="error" sx={{ mt: 1.25 }}>
          {removal.error instanceof Error
            ? removal.error.message
            : "Unable to reconcile this published program."}
        </Alert>
      ) : null}
    </Box>
  );
}

export function ProgramsTrashDialog({
  open,
  etag,
  isAdmin,
  onClose,
}: {
  open: boolean;
  etag: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const trashQuery = useProgramTrashQuery(open);
  const outsideQuery = usePublishedProgramsOutsideDraftQuery(open);
  const items = trashQuery.data?.data ?? [];
  const outside = outsideQuery.data?.data ?? [];
  const trashKeys = new Set(items.map((item) => `${item.stationId}:${item.programId}`));
  const recoveryItems = outside.filter(
    (item) => !trashKeys.has(`${item.stationId}:${item.program.id}`),
  );
  const loading = trashQuery.isPending || outsideQuery.isPending;
  const empty =
    !loading &&
    !trashQuery.error &&
    !outsideQuery.error &&
    items.length === 0 &&
    recoveryItems.length === 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Trash2 size={20} /> Programs trash
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Trash preserves the complete Program + Schedule snapshot. Permanent deletion removes the
          recoverable trash record only; immutable releases and audit history remain intact.
        </Alert>

        {loading ? (
          <Typography color="text.secondary">Checking Draft, Trash and current release…</Typography>
        ) : null}
        {trashQuery.error ? (
          <Alert
            severity="error"
            sx={{ mb: 1 }}
            action={<Button color="inherit" onClick={() => void trashQuery.refetch()}>Retry</Button>}
          >
            {trashQuery.error instanceof Error
              ? trashQuery.error.message
              : "Unable to load Programs trash."}
          </Alert>
        ) : null}
        {outsideQuery.error ? (
          <Alert
            severity="error"
            sx={{ mb: 1 }}
            action={<Button color="inherit" onClick={() => void outsideQuery.refetch()}>Retry</Button>}
          >
            {outsideQuery.error instanceof Error
              ? outsideQuery.error.message
              : "Unable to reconcile the current Mobile release."}
          </Alert>
        ) : null}

        {recoveryItems.length > 0 ? (
          <Box sx={{ mb: items.length > 0 ? 2 : 0 }}>
            <Alert severity="warning" sx={{ mb: 1 }}>
              {recoveryItems.length === 1
                ? "1 program is still live in Mobile without a matching Draft/Trash record."
                : `${recoveryItems.length} programs are still live in Mobile without matching Draft/Trash records.`}
            </Alert>
            {recoveryItems.map((item, index) => (
              <Box key={`${item.stationId}:${item.program.id}`}>
                {index > 0 ? <Divider /> : null}
                <PublishedOnlyRecoveryRow item={item} etag={etag} isAdmin={isAdmin} />
              </Box>
            ))}
          </Box>
        ) : null}

        {items.length > 0 && recoveryItems.length > 0 ? <Divider sx={{ my: 1 }} /> : null}
        {items.map((item, index) => (
          <Box key={item.id}>
            {index > 0 ? <Divider /> : null}
            <TrashRow item={item} etag={etag} isAdmin={isAdmin} />
          </Box>
        ))}

        {empty ? (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <Trash2 size={32} />
            <Typography fontWeight={800} sx={{ mt: 1 }}>Trash is empty</Typography>
            <Typography variant="body2" color="text.secondary">
              No deleted Programs and no published Programs are stranded outside Draft.
            </Typography>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
