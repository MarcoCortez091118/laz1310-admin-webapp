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
import { ApiError } from "../../api/errors";
import { adminQueryKeys } from "../content/api";
import {
  dynamicsQueryKeys,
  publishDynamic,
  restoreDynamic,
  type DynamicTrashItem,
  type PublishedOutsideDraftItem,
} from "./api";
import { useDynamicTrashQuery, usePublishedOutsideDraftQuery } from "./queries";

function date(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

async function publishRemoval(
  dynamicId: string,
  title: string,
  etag: string,
): Promise<void> {
  try {
    await publishDynamic(dynamicId, `Remove ${title}`.slice(0, 300), etag);
  } catch (error) {
    // Removal is idempotent. A concurrent operation may already have removed the Dynamic from
    // the current public release by the time this request runs.
    if (error instanceof ApiError && error.status === 404) return;
    throw error;
  }
}

async function invalidatePublicationState(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: dynamicsQueryKeys.trash }),
    queryClient.invalidateQueries({ queryKey: dynamicsQueryKeys.publishedOutsideDraft }),
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.publicState }),
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview }),
    queryClient.invalidateQueries({ queryKey: ["admin", "releases"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "audit"] }),
  ]);
}

function TrashRow({
  item,
  etag,
  isAdmin,
}: {
  item: DynamicTrashItem;
  etag: string;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();

  const restore = useMutation({
    mutationFn: () => restoreDynamic(item.id, etag),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dynamicsQueryKeys.list }),
        queryClient.invalidateQueries({ queryKey: dynamicsQueryKeys.trash }),
        queryClient.invalidateQueries({ queryKey: dynamicsQueryKeys.publishedOutsideDraft }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.draft }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview }),
        queryClient.invalidateQueries({ queryKey: ["admin", "audit"] }),
      ]);
    },
  });

  const removal = useMutation({
    mutationFn: () => publishRemoval(item.dynamicId, item.snapshot.title, etag),
    onSuccess: async () => invalidatePublicationState(queryClient),
  });

  const pending = restore.isPending || removal.isPending;

  return (
    <Box sx={{ py: 1.75 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography fontWeight={800}>{item.snapshot.title}</Typography>
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
            {item.snapshot.slug} · deleted {date(item.deletedAt)} by {item.deletedBy}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.4, overflowWrap: "anywhere" }}>
            Dynamic {item.dynamicId} · Trash record {item.id}
          </Typography>
          {item.published && !item.restoredAt ? (
            <Alert severity="warning" sx={{ mt: 1.25 }}>
              This campaign was removed from Draft but is still part of the current public release. Mobile will keep showing it until its removal is published.
            </Alert>
          ) : null}
          {item.restoredAt ? (
            <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 0.4 }}>
              Restored {date(item.restoredAt)} by {item.restoredBy ?? "unknown"}
            </Typography>
          ) : null}
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}>
          {isAdmin && !item.restoredAt && item.published ? (
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
          <Button
            size="small"
            variant="outlined"
            startIcon={<RotateCcw size={15} />}
            disabled={Boolean(item.restoredAt) || pending}
            onClick={() => restore.mutate()}
            sx={{ flexShrink: 0 }}
          >
            {restore.isPending ? "Restoring…" : "Restore to Draft"}
          </Button>
        </Stack>
      </Stack>
      {restore.error ? (
        <Alert severity="error" sx={{ mt: 1.25 }}>
          {restore.error instanceof Error ? restore.error.message : "Unable to restore this campaign."}
        </Alert>
      ) : null}
      {removal.error ? (
        <Alert severity="error" sx={{ mt: 1.25 }}>
          {removal.error instanceof Error
            ? removal.error.message
            : "Unable to publish this campaign removal."}
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
  item: PublishedOutsideDraftItem;
  etag: string;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const removal = useMutation({
    mutationFn: () => publishRemoval(item.dynamic.id, item.dynamic.title, etag),
    onSuccess: async () => invalidatePublicationState(queryClient),
  });

  return (
    <Box sx={{ py: 1.75 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography fontWeight={800}>{item.dynamic.title}</Typography>
            <Chip size="small" color="error" label="Still live in Mobile" />
            <Chip size="small" color="warning" variant="outlined" label="Missing from Draft & Trash" />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            {item.dynamic.slug} · public release {item.releaseId}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.4 }}>
            Published {date(item.publishedAt)} · Dynamic {item.dynamic.id}
          </Typography>
          <Alert severity="warning" icon={<TriangleAlert size={19} />} sx={{ mt: 1.25 }}>
            This campaign exists in the current Mobile release but has no matching Draft or Trash entry. This is consistent with a deletion performed before audited Dynamics trash was introduced.
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
            : "Unable to reconcile this published campaign."}
        </Alert>
      ) : null}
    </Box>
  );
}

export function DynamicsTrashDialog({
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
  const trashQuery = useDynamicTrashQuery(open);
  const outsideDraftQuery = usePublishedOutsideDraftQuery(open);
  const items = trashQuery.data?.data ?? [];
  const outsideDraft = outsideDraftQuery.data?.data ?? [];
  const trashDynamicIds = new Set(items.map((item) => item.dynamicId));
  const recoveryItems = outsideDraft.filter((item) => !trashDynamicIds.has(item.dynamic.id));
  const loading = trashQuery.isPending || outsideDraftQuery.isPending;
  const empty = !loading && !trashQuery.error && !outsideDraftQuery.error && items.length === 0 && recoveryItems.length === 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Trash2 size={20} /> Dynamics trash
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Trash preserves the complete campaign snapshot and audit evidence. The recovery check also compares Draft with the current public Mobile release so historical deletions cannot remain live invisibly.
        </Alert>

        {loading ? <Typography color="text.secondary">Checking Draft, Trash and current release…</Typography> : null}
        {trashQuery.error ? (
          <Alert severity="error" sx={{ mb: 1 }} action={<Button color="inherit" onClick={() => void trashQuery.refetch()}>Retry</Button>}>
            {trashQuery.error instanceof Error ? trashQuery.error.message : "Unable to load Dynamics trash."}
          </Alert>
        ) : null}
        {outsideDraftQuery.error ? (
          <Alert severity="error" sx={{ mb: 1 }} action={<Button color="inherit" onClick={() => void outsideDraftQuery.refetch()}>Retry</Button>}>
            {outsideDraftQuery.error instanceof Error
              ? outsideDraftQuery.error.message
              : "Unable to reconcile the current Mobile release."}
          </Alert>
        ) : null}

        {recoveryItems.length > 0 ? (
          <Box sx={{ mb: items.length > 0 ? 2 : 0 }}>
            <Alert severity="warning" sx={{ mb: 1 }}>
              {recoveryItems.length === 1
                ? "1 campaign is still live in Mobile even though it no longer exists in Draft or Trash."
                : `${recoveryItems.length} campaigns are still live in Mobile even though they no longer exist in Draft or Trash.`}
            </Alert>
            {recoveryItems.map((item, index) => (
              <Box key={item.dynamic.id}>
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
              No deleted Dynamics and no published campaigns are stranded outside Draft.
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
