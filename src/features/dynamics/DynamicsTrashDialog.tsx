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
import { RotateCcw, Trash2 } from "lucide-react";
import { adminQueryKeys } from "../content/api";
import { dynamicsQueryKeys, restoreDynamic, type DynamicTrashItem } from "./api";
import { useDynamicTrashQuery } from "./queries";

function date(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function TrashRow({
  item,
  etag,
}: {
  item: DynamicTrashItem;
  etag: string;
}) {
  const queryClient = useQueryClient();
  const restore = useMutation({
    mutationFn: () => restoreDynamic(item.id, etag),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dynamicsQueryKeys.list }),
        queryClient.invalidateQueries({ queryKey: dynamicsQueryKeys.trash }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.draft }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview }),
        queryClient.invalidateQueries({ queryKey: ["admin", "audit"] }),
      ]);
    },
  });

  return (
    <Box sx={{ py: 1.75 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography fontWeight={800}>{item.snapshot.title}</Typography>
            <Chip
              size="small"
              color={item.restoredAt ? "success" : "default"}
              variant="outlined"
              label={item.restoredAt ? "Restored" : "In trash"}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            {item.snapshot.slug} · deleted {date(item.deletedAt)} by {item.deletedBy}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.4, overflowWrap: "anywhere" }}>
            Dynamic {item.dynamicId} · Trash record {item.id}
          </Typography>
          {item.restoredAt ? (
            <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 0.4 }}>
              Restored {date(item.restoredAt)} by {item.restoredBy ?? "unknown"}
            </Typography>
          ) : null}
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RotateCcw size={15} />}
          disabled={Boolean(item.restoredAt) || restore.isPending}
          onClick={() => restore.mutate()}
          sx={{ alignSelf: { xs: "stretch", sm: "flex-start" }, flexShrink: 0 }}
        >
          {restore.isPending ? "Restoring…" : "Restore to Draft"}
        </Button>
      </Stack>
      {restore.error ? (
        <Alert severity="error" sx={{ mt: 1.25 }}>
          {restore.error instanceof Error ? restore.error.message : "Unable to restore this campaign."}
        </Alert>
      ) : null}
    </Box>
  );
}

export function DynamicsTrashDialog({
  open,
  etag,
  onClose,
}: {
  open: boolean;
  etag: string;
  onClose: () => void;
}) {
  const query = useDynamicTrashQuery(open);
  const items = query.data?.data ?? [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Trash2 size={20} /> Dynamics trash
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Deleting a campaign is a soft-delete. The full campaign snapshot, actor and timestamp are retained for audit. Restoring returns the snapshot to Draft; it does not publish it automatically.
        </Alert>
        {query.isPending ? <Typography color="text.secondary">Loading trash…</Typography> : null}
        {query.error ? (
          <Alert severity="error" action={<Button color="inherit" onClick={() => void query.refetch()}>Retry</Button>}>
            {query.error instanceof Error ? query.error.message : "Unable to load Dynamics trash."}
          </Alert>
        ) : null}
        {!query.isPending && !query.error && items.length === 0 ? (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <Trash2 size={32} />
            <Typography fontWeight={800} sx={{ mt: 1 }}>Trash is empty</Typography>
            <Typography variant="body2" color="text.secondary">Deleted Dynamics will appear here with their audit metadata.</Typography>
          </Box>
        ) : null}
        {items.map((item, index) => (
          <Box key={item.id}>
            {index > 0 ? <Divider /> : null}
            <TrashRow item={item} etag={etag} />
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
