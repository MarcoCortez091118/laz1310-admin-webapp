import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Rocket, Trash2 } from "lucide-react";
import { useState } from "react";
import { ApiError } from "../../api/errors";
import { adminQueryKeys } from "../content/api";
import { deleteDynamic, dynamicsQueryKeys, publishDynamic } from "./api";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === "conflict") return "The Draft changed. Reload Dynamics before retrying.";
    if (error.kind === "validation") return error.message;
    return error.message || "The Admin API rejected this operation.";
  }
  return error instanceof Error ? error.message : "Unexpected Dynamics error.";
}

async function publishRemovalIfNeeded(
  dynamicId: string,
  title: string,
  etag: string,
  note: string,
) {
  try {
    await publishDynamic(dynamicId, note.trim() || `Remove ${title}`, etag);
  } catch (error) {
    // A campaign that was never part of the public release is already absent after trashing.
    // Treat that state as an idempotent successful removal instead of surfacing a false failure.
    if (error instanceof ApiError && error.status === 404) return;
    throw error;
  }
}

export function DynamicLifecycleActions({
  dynamicId,
  title,
  etag,
  isAdmin,
  dirty,
  busy,
  onDeleted,
}: {
  dynamicId: string;
  title: string;
  etag: string;
  isAdmin: boolean;
  dirty: boolean;
  busy: boolean;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const [publishOpen, setPublishOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [note, setNote] = useState(`Publish ${title}`.slice(0, 300));

  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: dynamicsQueryKeys.list }),
      queryClient.invalidateQueries({ queryKey: dynamicsQueryKeys.trash }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.draft }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.publicState }),
      queryClient.invalidateQueries({ queryKey: ["admin", "releases"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] }),
    ]);
  }

  const publishMutation = useMutation({
    mutationFn: () => {
      const normalized = note.trim();
      if (!normalized) throw new Error("Publication note is required.");
      return publishDynamic(dynamicId, normalized, etag);
    },
    onSuccess: async () => {
      await invalidateAll();
      setPublishOpen(false);
    },
  });

  const trashMutation = useMutation({
    mutationFn: async (publishRemoval: boolean) => {
      const removed = await deleteDynamic(dynamicId, etag);
      if (!publishRemoval) return removed;
      if (!removed.etag) {
        throw new Error("The API did not return the new Draft ETag after moving this campaign to trash.");
      }
      await publishRemovalIfNeeded(dynamicId, title, removed.etag, note);
      return removed;
    },
    onSuccess: async () => {
      await invalidateAll();
      setTrashOpen(false);
      onDeleted();
    },
  });

  const mutationError = publishMutation.error ?? trashMutation.error;
  const pending = busy || publishMutation.isPending || trashMutation.isPending;

  return (
    <>
      <Stack spacing={1} sx={{ width: "100%" }}>
        {mutationError ? <Alert severity="error">{errorMessage(mutationError)}</Alert> : null}
        {dirty ? (
          <Typography variant="caption" color="warning.main">
            Save the current form to Draft before publishing or moving it to trash.
          </Typography>
        ) : null}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
          <Button
            color="error"
            variant="outlined"
            startIcon={<Trash2 size={16} />}
            disabled={pending || dirty}
            onClick={() => setTrashOpen(true)}
          >
            Move to trash
          </Button>
          <Button
            variant="outlined"
            startIcon={<Rocket size={16} />}
            disabled={!isAdmin || pending || dirty}
            onClick={() => setPublishOpen(true)}
          >
            {isAdmin ? "Publish campaign" : "Admin required to publish"}
          </Button>
        </Stack>
      </Stack>

      <Dialog open={publishOpen} onClose={() => !publishMutation.isPending && setPublishOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Publish only “{title}”?</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Only this campaign is rebased from Draft onto the current public catalog. Other pending Draft changes remain unpublished.
          </Alert>
          <TextField
            autoFocus
            fullWidth
            label="Publication note"
            value={note}
            inputProps={{ maxLength: 300 }}
            onChange={(event) => setNote(event.target.value)}
            helperText={`${note.length}/300`}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={publishMutation.isPending} onClick={() => setPublishOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={publishMutation.isPending || !note.trim()}
            startIcon={<Rocket size={16} />}
            onClick={() => publishMutation.mutate()}
          >
            {publishMutation.isPending ? "Publishing…" : "Publish campaign"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={trashOpen} onClose={() => !trashMutation.isPending && setTrashOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Move “{title}” to trash?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            The complete campaign snapshot is retained in the Dynamics trash and audit log. Participant records are not deleted.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Moving to trash removes it from Draft. If it is currently published, Mobile keeps the published version until you publish the removal.
          </Typography>
          {isAdmin ? (
            <TextField
              fullWidth
              sx={{ mt: 2 }}
              label="Publication note"
              value={note}
              inputProps={{ maxLength: 300 }}
              onChange={(event) => setNote(event.target.value)}
              helperText="Used only when you choose Move to trash & publish removal."
            />
          ) : null}
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button disabled={trashMutation.isPending} onClick={() => setTrashOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="outlined"
            disabled={trashMutation.isPending}
            onClick={() => trashMutation.mutate(false)}
          >
            Move to trash
          </Button>
          {isAdmin ? (
            <Button
              color="error"
              variant="contained"
              disabled={trashMutation.isPending}
              onClick={() => trashMutation.mutate(true)}
            >
              {trashMutation.isPending ? "Processing…" : "Trash & publish removal"}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </>
  );
}
