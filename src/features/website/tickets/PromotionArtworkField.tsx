import {
  Alert, Box, Button, CircularProgress, Stack, Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState, type ChangeEvent } from "react";
import { listPromotionMedia, uploadPromotionMedia } from "./api";

export function PromotionArtworkField({ url, onChange, title }: {
  url: string; onChange: (url: string) => void; title: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [error, setError] = useState("");
  const library = useQuery({
    queryKey: ["website", "ticket-promotions", "media"],
    queryFn: async () => (await listPromotionMedia()).data,
    enabled: showLibrary, retry: false,
  });

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadPromotionMedia(file, title);
      onChange(uploaded.data.url);
      if (showLibrary) void library.refetch();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1}>
        <Button component="label" variant="outlined" disabled={uploading}>
          {uploading ? "Uploading…" : "Upload artwork"}
          <input hidden accept="image/jpeg,image/png,image/webp" type="file"
            onChange={(event) => { void onFile(event); }} />
        </Button>
        <Button onClick={() => setShowLibrary(value => !value)}>
          {showLibrary ? "Hide library" : "Choose existing poster"}
        </Button>
      </Stack>
      {uploading && <CircularProgress size={20} />}
      {error && <Alert severity="error">{error}</Alert>}
      {showLibrary && (library.isPending ? <CircularProgress size={20} /> : library.error ?
        <Alert severity="error">Could not load Website promotions artwork.</Alert> :
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 1 }}>
          {library.data?.map(asset => (
            <Box key={asset.id} component="button" type="button"
              aria-label={`Choose ${asset.alt}`} onClick={() => onChange(asset.url)}
              sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", p: 1, cursor: "pointer" }}>
              <Box component="img" src={asset.url} alt={asset.alt}
                sx={{ width: "100%", aspectRatio: "1", objectFit: "contain" }} />
            </Box>
          ))}
        </Box>)}
      {url && <Box component="img" alt={title || "Promotion artwork preview"} src={url}
        sx={{ maxWidth: 170, aspectRatio: "1", objectFit: "cover", borderRadius: 2 }} />}
      <Typography variant="caption" color="text.secondary">
        Files are uploaded via FastAPI to Website-only storage. Uploading does not publish a show.
      </Typography>
    </Stack>
  );
}
