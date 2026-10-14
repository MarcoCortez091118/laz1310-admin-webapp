import { Alert, Button, Stack, Typography } from "@mui/material";
import { ImagePlus, Images } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ChangeEvent } from "react";
import { uploadWebsiteBannerMedia } from "../website/banners/mediaApi";
import { uploadShowMedia } from "../website/shows/api";
import { uploadPromotionMedia } from "../website/tickets/api";
import { ArtworkPreview } from "../website/ArtworkPreview";
import { WebsiteMediaPickerDialog, type WebsiteMediaFolder } from "./WebsiteMediaBrowser";

/**
 * One presentation component; each upload/list action stays in its own existing
 * FastAPI-bound Website media namespace. A file upload only selects a URL.
 */
export function WebsiteArtworkField({
  folder, url, title, onChange,
}: {
  folder: WebsiteMediaFolder;
  url: string;
  title: string;
  onChange: (url: string) => void;
}) {
  const client = useQueryClient();
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const result = folder === "banners"
        ? await uploadWebsiteBannerMedia(file, title)
        : folder === "shows"
          ? await uploadShowMedia(file, title)
          : await uploadPromotionMedia(file, title);
      onChange(result.data.url);
      void client.invalidateQueries({ queryKey: ["admin", "website", "scoped-media", folder] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload artwork.");
    } finally {
      setUploading(false);
    }
  }
  return <Stack spacing={1.25} sx={{ minWidth: 0 }}>
    <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
      <Button variant="outlined" component="label" disabled={uploading}
        startIcon={<ImagePlus size={17}/>}>
        {uploading ? "Uploading…" : "Upload image"}
        <input type="file" hidden accept="image/jpeg,image/png,image/webp"
          disabled={uploading} onChange={e => { void upload(e); }}/>
      </Button>
      <Button variant="outlined" startIcon={<Images size={17}/>}
        disabled={uploading} onClick={() => setPicker(true)}>
        Browse {folder === "banners" ? "banners" : folder === "shows" ? "show posters" : "promotions"}
      </Button>
    </Stack>
    {url && <Stack sx={{ maxWidth: 280, minWidth: 0 }}>
      <ArtworkPreview src={url} alt={title || "Selected artwork"} shape={folder === "shows" ? "portrait" : "landscape"}/>
    </Stack>}
    {error && <Alert severity="error">{error}</Alert>}
    <Typography variant="caption" color="text.secondary">
      Upload via FastAPI to this Website collection only. Saving and publishing are separate actions.
    </Typography>
    <WebsiteMediaPickerDialog open={picker} folder={folder} selectedUrl={url}
      onClose={() => setPicker(false)} onChoose={onChange} />
  </Stack>;
}
