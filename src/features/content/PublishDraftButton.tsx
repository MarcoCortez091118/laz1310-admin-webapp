import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Rocket } from "lucide-react";
import { useState } from "react";
import { ApiError } from "../../api/errors";
import { dynamicsQueryKeys } from "../dynamics/api";
import { adminQueryKeys, publishDraft } from "./api";
import { useDraftQuery } from "./queries";

function publishError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.kind === "conflict") return "The Draft changed before publication. Reload it and review the latest changes before publishing.";
    if (error.kind === "forbidden") return "Only a verified administrator can publish the Draft.";
    return error.message;
  }
  return error instanceof Error ? error.message : "Unable to publish the Draft.";
}

export function PublishDraftButton({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const draft = useDraftQuery();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("Publish Dynamics updates");
  const [published, setPublished] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const etag = draft.data?.etag;
      if (!etag) throw new Error("Draft ETag unavailable. Reload the Draft before publishing.");
      const normalized = note.trim();
      if (!normalized || normalized.length > 300) throw new Error("Publication note must contain 1–300 characters.");
      return publishDraft(normalized, etag);
    },
    onSuccess: async () => {
      setOpen(false);
      setPublished(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.draft }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.publicState }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.releases }),
        queryClient.invalidateQueries({ queryKey: dynamicsQueryKeys.list }),
      ]);
    },
  });

  return (
    <>
      <Button
        color="primary"
        disabled={!isAdmin || !draft.data?.etag || mutation.isPending}
        onClick={() => {
          mutation.reset();
          setOpen(true);
        }}
        startIcon={<Rocket size={17} />}
        variant="contained"
      >
        {isAdmin ? "Publish changes" : "Admin publish required"}
      </Button>

      <Dialog fullWidth maxWidth="sm" open={open} onClose={() => !mutation.isPending && setOpen(false)}>
        <DialogTitle>Publish the current Draft?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Alert severity="warning">
              Publish is global. This creates a new immutable release containing <strong>all current Draft changes</strong>, not only Dynamics. Mobile reads published releases and will not see saved Draft edits until this succeeds.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Current Draft revision: <strong>{draft.data?.data.revision ?? "—"}</strong>
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Publication note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              inputProps={{ maxLength: 300 }}
              helperText={`${note.trim().length}/300 · stored with the release audit trail`}
            />
            {mutation.error ? <Alert severity="error">{publishError(mutation.error)}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={mutation.isPending} onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={mutation.isPending || !note.trim()}
            onClick={() => mutation.mutate()}
            startIcon={<Rocket size={16} />}
            variant="contained"
          >
            {mutation.isPending ? "Publishing…" : "Publish release"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        autoHideDuration={5000}
        open={published}
        onClose={() => setPublished(false)}
        message="Release published. Mobile content-version will now expose the new release."
      />
    </>
  );
}
