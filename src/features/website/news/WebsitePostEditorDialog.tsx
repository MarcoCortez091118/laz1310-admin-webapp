import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Stack, TextField, Typography,
} from "@mui/material";
import { FilePenLine, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "../../../api/errors";
import { ManagedImageField } from "../../media/ManagedImageField";
import type { WebsitePost } from "./api";
import {
  importWebsiteDraft, readWebsiteDraft, saveWebsiteDraft,
  type WebsiteDraftInput, type WebsiteNewsDraft,
} from "./draftsApi";

type Props = {
  open: boolean;
  initialPost: WebsitePost | null;
  initialDraft: WebsiteNewsDraft | null;
  onClose: () => void;
  onSaved: (draft: WebsiteNewsDraft) => void;
};

function formFromPost(post: WebsitePost | null): WebsiteDraftInput {
  return {
    headline: post?.headline ?? "",
    category: post?.category ?? "NOVEDADES",
    summary: post?.summary ?? "",
    fullArticle: post?.fullArticle ?? "",
    imageUrl: post?.imageUrl ?? "",
    sourceName: post?.sourceName ?? "LA Z 1310",
    sourceUrl: post?.sourceUrl ?? "",
    adImageUrl: post?.adImageUrl ?? "",
  };
}

function editorialSlug(value: string): string {
  return value.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 200);
}

export function WebsitePostEditorDialog({
  open, initialPost, initialDraft, onClose, onSaved,
}: Props) {
  const [slug, setSlug] = useState("");
  const [form, setForm] = useState<WebsiteDraftInput>(formFromPost(null));
  const [revision, setRevision] = useState(0);
  const [requiresImport, setRequiresImport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const startingPost = initialDraft?.post ?? initialPost;
    setSlug(startingPost?.id ?? "");
    setSlugTouched(Boolean(startingPost));
    setForm(formFromPost(startingPost));
    setRevision(initialDraft?.revision ?? 0);
    setRequiresImport(Boolean(initialPost && !initialDraft));
    setError("");
    setSaving(false);
    setLoading(Boolean(initialPost && !initialDraft));
    if (initialPost && !initialDraft) {
      void readWebsiteDraft(initialPost.id).then((result) => {
        if (cancelled) return;
        setForm(formFromPost(result.data.post));
        setRevision(result.data.revision);
        setRequiresImport(false);
      }).catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          // The legacy public record exists, but has not yet been imported as a draft.
          setRequiresImport(true);
        } else {
          setError(err instanceof Error ? err.message : "Unable to load existing Website draft.");
        }
      }).finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, [open, initialPost, initialDraft]);

  function update<K extends keyof WebsiteDraftInput>(field: K, value: WebsiteDraftInput[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setError("");
  }

  async function save() {
    if (!/^[a-z0-9][a-z0-9-]{0,198}[a-z0-9]$/.test(slug)) {
      setError("Article ID must be 2–200 lowercase letters, digits or hyphens.");
      return;
    }
    if (form.headline.trim().length < 3 ||
        form.category.trim().length < 2 ||
        form.summary.trim().length < 5 ||
        form.fullArticle.trim().length < 10) {
      setError("Complete the title, category, summary and article body before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let nextRevision = revision;
      if (requiresImport) {
        const imported = await importWebsiteDraft(slug);
        nextRevision = imported.data.revision;
        setRevision(nextRevision);
        setRequiresImport(false);
      }
      const result = await saveWebsiteDraft(slug, nextRevision, form);
      onSaved(result.data);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save Website draft.";
      setError(err instanceof ApiError && err.status === 409
        ? `This draft changed or the article ID is already used. Reload before saving. ${message}`
        : message);
    } finally {
      setSaving(false);
    }
  }

  const isExisting = Boolean(initialPost || initialDraft);
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md"
      aria-labelledby="website-news-editor-title"
      slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: "92vh" } } }}>
      <DialogTitle id="website-news-editor-title">
        <Stack direction="row" spacing={1} alignItems="center">
          <FilePenLine size={20} />
          <Typography variant="h6" fontWeight={850}>
            {isExisting ? "Edit Website article draft" : "Create Website article draft"}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info">
            Draft only. Changes are saved through FastAPI but will not appear on laz1310.com
            until the independent Website publishing workflow is approved and deployed.
          </Alert>
          {requiresImport && (
            <Alert severity="warning">
              Saving will first copy this existing live article into an isolated Website draft.
              The public article remains unchanged.
            </Alert>
          )}
          {loading ? <CircularProgress size={26} /> : (
            <>
              <TextField label="Article ID / SEO slug" required fullWidth
                disabled={isExisting || saving} value={slug}
                helperText="Unique lowercase identifier used by website article URLs."
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(editorialSlug(event.target.value));
                }} />
              <TextField autoFocus label="Headline" required fullWidth
                value={form.headline} disabled={saving}
                inputProps={{ maxLength: 200 }}
                onChange={(event) => {
                  update("headline", event.target.value);
                  if (!isExisting && !slugTouched) setSlug(editorialSlug(event.target.value));
                }} />
              <TextField label="Category" required fullWidth disabled={saving}
                value={form.category} inputProps={{ maxLength: 80 }}
                onChange={(event) => update("category", event.target.value)} />
              <TextField label="Summary" required fullWidth multiline minRows={2}
                disabled={saving} value={form.summary} inputProps={{ maxLength: 600 }}
                onChange={(event) => update("summary", event.target.value)} />
              <TextField label="Complete article" required fullWidth multiline minRows={6}
                disabled={saving} value={form.fullArticle}
                inputProps={{ maxLength: 30000 }}
                helperText="Plain text. HTML and scripts are never interpreted in the editor."
                onChange={(event) => update("fullArticle", event.target.value)} />
              <ManagedImageField
                label="Article cover image"
                pickerTitle="Choose Website article artwork"
                description="Select or upload an image through FastAPI managed Media Library. Existing website images remain valid."
                value={form.imageUrl}
                onChange={(url) => update("imageUrl", url ?? "")}
              />
              <Divider />
              <TextField label="Source name" fullWidth disabled={saving}
                value={form.sourceName} inputProps={{ maxLength: 120 }}
                onChange={(event) => update("sourceName", event.target.value)} />
              <TextField label="Source link (optional, HTTPS)" fullWidth disabled={saving}
                value={form.sourceUrl} inputProps={{ maxLength: 2048 }}
                onChange={(event) => update("sourceUrl", event.target.value)} />
              <TextField label="Advertising image URL (optional, HTTPS)"
                fullWidth disabled={saving} value={form.adImageUrl}
                onChange={(event) => update("adImageUrl", event.target.value)} />
            </>
          )}
          {error && <Alert severity="error" role="alert">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" disabled={loading || saving || Boolean(error && loading)}
          onClick={() => void save()} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}>
          {saving ? "Saving…" : "Save Website draft"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
