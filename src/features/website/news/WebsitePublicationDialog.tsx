import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Stack, Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, History, Rocket, RotateCcw } from "lucide-react";
import { useState } from "react";
import { ApiError } from "../../../api/errors";
import { useStaff } from "../../auth/StaffGate";
import { websiteDraftKeys } from "./draftsApi";
import type { WebsiteNewsDraft } from "./draftsApi";
import {
  listWebsiteReleases, previewWebsiteDraft, publishWebsiteDraft,
  readWebsitePublication, rollbackWebsiteRelease, websitePublicationKeys,
  type WebsiteRelease,
} from "./publicationApi";

type ConfirmAction = { kind: "publish" } | { kind: "rollback"; release: WebsiteRelease };

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "The draft, legacy website article, or publication changed. Reload the latest version before retrying.";
  }
  return error instanceof Error ? error.message : "Website publishing request failed.";
}

/** Exact server draft preview plus independently versioned publication controls. */
export function WebsitePublicationDialog({
  slug, open, onClose,
}: {
  slug: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const staff = useStaff();
  const canPublish = staff.roles.includes("admin");
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = useState<ConfirmAction | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const preview = useQuery({
    queryKey: ["admin", "website", "draft-preview", slug],
    queryFn: () => previewWebsiteDraft(slug!),
    enabled: open && Boolean(slug),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const publication = useQuery({
    queryKey: websitePublicationKeys.byPost(slug ?? ""),
    queryFn: async () => {
      try { return (await readWebsitePublication(slug!)).data; }
      catch (reason) {
        if (reason instanceof ApiError && reason.status === 404) return null;
        throw reason;
      }
    },
    enabled: open && Boolean(slug),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const history = useQuery({
    queryKey: [...websitePublicationKeys.byPost(slug ?? ""), "history"],
    queryFn: async () => (await listWebsiteReleases(slug!)).data,
    enabled: open && Boolean(slug) && Boolean(publication.data),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const draft: WebsiteNewsDraft | null = preview.data?.data ?? null;
  const live = publication.data ?? null;
  const isLoading = preview.isPending || publication.isPending;

  async function refresh() {
    setError("");
    await Promise.all([
      preview.refetch(), publication.refetch(), history.refetch(),
    ]);
  }

  async function confirm() {
    if (!slug || !confirmation || pending || !canPublish || !draft) return;
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const operation = confirmation.kind === "publish"
        ? await publishWebsiteDraft(slug, draft.revision)
        : await rollbackWebsiteRelease(slug, live!.revision, confirmation.release.id);
      setSuccess(
        `Website release ${operation.data.revision} recorded successfully. Public visibility requires the separate Website canary activation.`,
      );
      setConfirmation(null);
      await queryClient.invalidateQueries({ queryKey: websitePublicationKeys.byPost(slug) });
      await queryClient.invalidateQueries({ queryKey: websiteDraftKeys });
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
      setConfirmation(null);
      await refresh();
    } finally {
      setPending(false);
    }
  }

  function close() {
    if (pending) return;
    setConfirmation(null);
    setError("");
    setSuccess("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth
      aria-labelledby="website-publish-dialog-title"
      slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: "92vh" } } }}>
      <DialogTitle id="website-publish-dialog-title">
        <Stack direction="row" spacing={1} alignItems="center">
          <Rocket size={20} />
          <Typography variant="h6" fontWeight={850}>Preview & Website publication</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Alert severity="info">
            This release belongs only to laz1310.com. It does not publish Mobile content,
            and the public website must be switched to the approved-news canary separately.
          </Alert>
          {(preview.error || publication.error || history.error) && (
            <Alert severity="error" action={
              <Button color="inherit" onClick={() => void refresh()}>Retry</Button>
            }>
              {errorMessage(preview.error ?? publication.error ?? history.error)}
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
          {isLoading && <Stack direction="row" gap={1} alignItems="center">
            <CircularProgress size={19}/>
            <Typography>Loading current Website revisions…</Typography>
          </Stack>}
          {draft && (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                <Chip icon={<Eye size={15}/>} size="small" label={`Draft revision ${draft.revision}`} />
                <Chip color={live ? "success" : "default"} variant="outlined" size="small"
                  label={live ? `Published revision ${live.revision}` : "Not yet published"} />
              </Stack>
              <Typography variant="overline" color="text.secondary">Private editorial preview</Typography>
              <Typography variant="h5" fontWeight={850}>{draft.post.headline}</Typography>
              <Typography variant="body2" color="text.secondary">{draft.post.summary}</Typography>
              {draft.post.imageUrl && <Box component="img" src={draft.post.imageUrl}
                alt={draft.post.headline} referrerPolicy="no-referrer"
                sx={{ width: "100%", maxHeight: 300, borderRadius: 2, objectFit: "contain" }} />}
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {draft.post.fullArticle}
              </Typography>
              {draft.post.adImageUrl && <Stack spacing={1}>
                <Typography fontWeight={700} variant="subtitle2">Advertising preview · 1:1</Typography>
                <Box component="img" src={draft.post.adImageUrl} alt="Draft advertisement"
                  referrerPolicy="no-referrer"
                  sx={{ width: "100%", maxWidth: 300, aspectRatio: "1/1",
                    objectFit: "cover", borderRadius: 2 }} />
              </Stack>}
            </Stack>
          )}
          {live && <Alert severity="info">
            Current public snapshot: {live.post.headline} · version {live.revision} ·
            release {live.releaseId.slice(0, 8)}.
          </Alert>}
          {canPublish && draft && !isLoading && !preview.error && !publication.error && (
            <Button variant="contained" startIcon={<Rocket size={16}/>}
              disabled={pending || (live?.draftRevision === draft.revision)}
              onClick={() => setConfirmation({ kind: "publish" })}>
              {live ? "Update published article" : "Publish article"}
            </Button>
          )}
          {!canPublish && <Alert severity="warning">
            Only an administrator can publish or roll back Website News.
          </Alert>}
          <Divider />
          <Stack direction="row" spacing={1} alignItems="center">
            <History size={18}/><Typography fontWeight={800}>Website release history</Typography>
          </Stack>
          {history.isPending && live && <CircularProgress size={18}/>}
          {history.data?.items.map((release) => (
            <Stack key={release.id} direction={{ xs: "column", sm: "row" }}
              spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}
              sx={{ border: "1px solid", borderColor: "divider", p: 1.5, borderRadius: 2 }}>
              <Box>
                <Typography variant="body2" fontWeight={800}>
                  Version {release.revision} · {release.action === "rollback" ? "Restored" : "Published"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {release.post.headline} · {new Date(release.publishedAt).toLocaleString()}
                </Typography>
              </Box>
              {canPublish && live && release.id !== live.releaseId && (
                <Button size="small" variant="outlined" startIcon={<RotateCcw size={15}/>}
                  disabled={pending}
                  onClick={() => setConfirmation({ kind: "rollback", release })}>
                  Restore this version
                </Button>
              )}
            </Stack>
          ))}
          {history.data?.items.length === 0 && (
            <Typography variant="body2" color="text.secondary">No previous releases.</Typography>
          )}
          {confirmation && <Alert severity="warning" action={
            <Stack direction="row" spacing={1}>
              <Button color="inherit" size="small" onClick={() => setConfirmation(null)}>Cancel</Button>
              <Button color="inherit" size="small" variant="contained"
                disabled={pending} onClick={() => void confirm()}
                startIcon={<CheckCircle2 size={15} />}>Confirm</Button>
            </Stack>
          }>
            {confirmation.kind === "publish"
              ? `Confirm ${live ? "UPDATE" : "PUBLISH"} draft revision ${draft?.revision} to Website releases?`
              : `Restore version ${confirmation.release.revision} as a new public release? The draft will not change.`}
          </Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={close} disabled={pending}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
