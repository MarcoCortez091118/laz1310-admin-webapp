import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { Images } from "lucide-react";
import { NativeArtworkPreview } from "../app-ui/NativeArtworkPreview";
import { NativeEditorSteps } from "../app-ui/NativeEditorSteps";
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
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(initial);
    setUrl(externalUrl(initial));
    setError("");
    setMediaOpen(false);
    setStep(0);
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
        maxWidth="md"
        aria-labelledby="banner-form-title"
        slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: "min(90vh, 820px)" } } }}
      >
        <DialogTitle id="banner-form-title" sx={{ pb: 0.5 }}>
          {mode === "create" ? "Create banner" : "Edit banner"}
        </DialogTitle>
        <DialogContent dividers sx={{ minWidth: 0 }}>
          <NativeEditorSteps active={step}/>
          {step === 0 && <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography fontWeight={800}>Banner information</Typography>
            <TextField autoFocus required fullWidth label="Title / accessibility label"
              value={draft.title} slotProps={{ htmlInput: { maxLength: 160 } }}
              onChange={event => { setError(""); setDraft(value => ({ ...value, title: event.target.value })); }}/>
            <TextField fullWidth type="url" label="Destination URL (optional)"
              helperText="HTTPS only. Leave blank when the banner is not clickable."
              placeholder="https://..." value={url}
              onChange={event => { setError(""); setUrl(event.target.value); }}/>
          </Stack>}
          {step === 1 && <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography fontWeight={800}>App artwork</Typography>
            <Typography color="text.secondary" variant="body2">
              Choose artwork from the Android/iOS Media Library only.
              Desktop Website media belongs to a different collection.
            </Typography>
            <NativeArtworkPreview src={draft.imageUrl} alt={draft.title || "Banner preview"}
              shape="banner" maxHeight={260}/>
            <Button onClick={() => setMediaOpen(true)} variant="outlined"
              startIcon={<Images size={16}/>}>
              {draft.imageUrl ? "Change managed image" : "Upload or choose image"}
            </Button>
          </Stack>}
          {step === 2 && <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography fontWeight={800}>Review before applying</Typography>
            <NativeArtworkPreview src={draft.imageUrl} alt={draft.title || "App banner"}
              shape="banner" maxHeight={260}/>
            <Typography variant="subtitle1" fontWeight={800}>{draft.title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {url.trim() || "No destination link"}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Applying here changes only the local editor. Save draft and publish
              are separate operations on the App Banners page.
            </Typography>
          </Stack>}
          {error ? <Typography role="alert" color="error" variant="body2" mt={1}>{error}</Typography> : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, flexWrap: "wrap" }}>
          <Button onClick={onClose}>Cancel</Button>
          {step > 0 && <Button onClick={() => { setError(""); setStep(v => v - 1); }}>Back</Button>}
          {step < 2 ? <Button variant="contained" onClick={() => {
            if (step === 0) {
              if (!draft.title.trim()) { setError("A banner title is required."); return; }
              if (url.trim() && (!url.trim().startsWith("https://") || !URL.canParse(url.trim()))) {
                setError("Destination must be a valid HTTPS URL."); return;
              }
            } else if (!draft.imageUrl?.trim()) {
              setError("Choose or upload a managed image."); return;
            }
            setError("");
            setStep(v => v + 1);
          }}>Continue</Button> :
            <Button variant="contained" onClick={confirm}>
              {mode === "create" ? "Add to draft editor" : "Apply changes"}
            </Button>}
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
