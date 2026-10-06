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
import { programsQueryKeys, publishProgram, trashProgram } from "./api";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === "conflict") {
      return "The Draft or public release changed. Reload Programs before retrying.";
    }
    return error.message || "The Admin API rejected this operation.";
  }
  return error instanceof Error ? error.message : "Unexpected Programs error.";
}

async function publishRemovalIfNeeded(
  stationId: string,
  programId: string,
  title: string,
  etag: string,
  note: string,
) {
  try {
    await publishProgram(
      stationId,
      programId,
      note.trim() || `Remove ${title}`,
      etag,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return;
    throw error;
  }
}

export function ProgramLifecycleActions({
  stationId,
  programId,
  title,
  etag,
  isAdmin,
  dirty,
  busy,
  onDeleted,
}: {
  stationId: string;
  programId: string;
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
  const [publishNote, setPublishNote] = useState(`Publish ${title}`.slice(0, 300));
  const [removalNote, setRemovalNote] = useState(`Remove ${title}`.slice(0, 300));

  async function invalidateAll() {
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

  const publishMutation = useMutation({
    mutationFn: () => {
      const normalized = publishNote.trim();
      if (!normalized) throw new Error("Publication note is required.");
      return publishProgram(stationId, programId, normalized, etag);
    },
    onSuccess: async () => {
      await invalidateAll();
      setPublishOpen(false);
    },
  });

  const trashMutation = useMutation({
    mutationFn: async (publishRemoval: boolean) => {
      const removed = await trashProgram(stationId, programId, etag);
      if (!publishRemoval) return removed;
      if (!removed.etag) {
        throw new Error("The API did not return the new Draft ETag after moving this program to trash.");
      }
      await publishRemovalIfNeeded(
        stationId,
        programId,
        title,
        removed.etag,
        removalNote,
      );
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
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
        >
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
            {isAdmin ? "Publish program" : "Admin required to publish"}
          </Button>
        </Stack>
      </Stack>

      <Dialog
        open={publishOpen}
        onClose={() => !publishMutation.isPending && setPublishOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Publish only “{title}”?</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Only this program and its weekly schedule are rebased from Draft onto the current
            public catalog. Other pending Draft changes remain unpublished.
          </Alert>
          <TextField
            autoFocus
            fullWidth
            label="Publication note"
            value={publishNote}
            inputProps={{ maxLength: 300 }}
            onChange={(event) => setPublishNote(event.target.value)}
            helperText={`${publishNote.length}/300`}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={publishMutation.isPending} onClick={() => setPublishOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={publishMutation.isPending || !publishNote.trim()}
            startIcon={<Rocket size={16} />}
            onClick={() => publishMutation.mutate()}
          >
            {publishMutation.isPending ? "Publishing…" : "Publish program"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={trashOpen}
        onClose={() => !trashMutation.isPending && setTrashOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Move “{title}” to trash?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Trash preserves the complete program and schedule snapshot for audit and recovery.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            <strong>Move to trash only</strong> removes it from Draft. If it is already live,
            Mobile keeps the published version. <strong>Move to trash & remove from app</strong>
            also creates a selective release that removes only this program from Mobile.
          </Typography>
          {isAdmin ? (
            <TextField
              fullWidth
              sx={{ mt: 2 }}
              label="Removal publication note"
              value={removalNote}
              inputProps={{ maxLength: 300 }}
              onChange={(event) => setRemovalNote(event.target.value)}
              helperText="Stored in the immutable release and audit trail when removal is published."
            />
          ) : null}
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button disabled={trashMutation.isPending} onClick={() => setTrashOpen(false)}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="outlined"
            disabled={trashMutation.isPending}
            onClick={() => trashMutation.mutate(false)}
          >
            Move to trash only
          </Button>
          {isAdmin ? (
            <Button
              color="error"
              variant="contained"
              disabled={trashMutation.isPending}
              onClick={() => trashMutation.mutate(true)}
            >
              {trashMutation.isPending ? "Removing…" : "Move to trash & remove from app"}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </>
  );
}
