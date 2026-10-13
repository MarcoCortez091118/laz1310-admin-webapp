import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { Image as ImageIcon, Images } from "lucide-react";
import { useEffect, useState } from "react";
import type { Card } from "../../api/types";
import { MediaPickerDialog } from "../media/MediaPickerDialog";

type Props = {
  open: boolean;
  initial: Card;
  mode: "create" | "edit";
  onClose: () => void;
  onConfirm: (banner: Card) => void;
};

function externalUrl(banner: Card): string {
  return banner.link?.kind === "external" ? banner.link.target : "";
}

/** A transient draft: cancelling never mutates the parent's editorial state. */
export function BannerFormDialog({ open, initial, mode, onClose, onConfirm }: Props) {
  const [draft, setDraft] = useState<Card>(initial);
  const [url, setUrl] = useState(externalUrl(initial));
  const [mediaOpen, setMediaOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(initial);
    setUrl(externalUrl(initial));
    setError("");
    setMediaOpen(false);
  }, [initial, open]);

  function confirm() {
    const title = draft.title.trim();
    const imageUrl = draft.imageUrl?.trim();
    const link = url.trim();
    if (!title) return setError("A banner title is required.");
    if (!imageUrl) return setError("Choose or upload a managed image.");
    if (link && (!link.startsWith("https://") || !URL.canParse(link))) {
      return setError("Destination must be a valid HTTPS URL.");
    }
    onConfirm({
      ...draft,
      title,
      imageUrl,
      link: link ? { kind: "external", target: link } : null,
    });
    onClose();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={mediaOpen ? undefined : onClose}
        fullWidth
        maxWidth="sm"
        aria-labelledby="banner-form-title"
        slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: "min(90vh, 820px)" } } }}
      >
        <DialogTitle id="banner-form-title" sx={{ pb: 0.5 }}>
          {mode === "create" ? "Create banner" : "Edit banner"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Add artwork and its accessibility label here. Saving this form only updates the
              local editor; use Save draft and then Publish banners to make it visible in Mobile.
            </Typography>
            <TextField
              autoFocus
              required
              label="Banner title / accessibility label"
              value={draft.title}
              inputProps={{ maxLength: 160 }}
              onChange={(event) => {
                setError("");
                setDraft((value) => ({ ...value, title: event.target.value }));
              }}
              fullWidth
            />
            <Box sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
              {draft.imageUrl ? (
                <Box component="img" alt={draft.title || "Banner preview"} src={draft.imageUrl}
                  referrerPolicy="no-referrer"
                  sx={{ width: "100%", aspectRatio: "3 / 1", objectFit: "cover", display: "block" }} />
              ) : (
                <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ minHeight: 145 }}>
                  <ImageIcon size={28} />
                  <Typography variant="body2" color="text.secondary">No artwork selected</Typography>
                </Stack>
              )}
            </Box>
            <Button onClick={() => setMediaOpen(true)} variant="outlined" startIcon={<Images size={16} />}>
              {draft.imageUrl ? "Change managed image" : "Upload or choose image"}
            </Button>
            <TextField
              fullWidth
              type="url"
              label="Destination URL (optional)"
              helperText="HTTPS only. Leave blank for a non-clickable banner."
              placeholder="https://..."
              value={url}
              onChange={(event) => { setError(""); setUrl(event.target.value); }}
            />
            {error ? <Typography role="alert" color="error" variant="body2">{error}</Typography> : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={confirm}>
            {mode === "create" ? "Add to draft editor" : "Apply changes"}
          </Button>
        </DialogActions>
      </Dialog>
      <MediaPickerDialog
        open={open && mediaOpen}
        currentUrl={draft.imageUrl}
        onClose={() => setMediaOpen(false)}
        onSelect={(asset) => {
          setError("");
          setDraft((value) => ({ ...value, imageUrl: asset.url }));
          setMediaOpen(false);
        }}
        title="Choose banner artwork"
      />
    </>
  );
}
