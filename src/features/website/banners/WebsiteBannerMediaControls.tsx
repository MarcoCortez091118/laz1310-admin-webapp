import {
  Alert, Box, Button, CircularProgress, Stack, Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { listWebsiteBannerMedia, uploadWebsiteBannerMedia } from "./mediaApi";

export function WebsiteBannerMediaControls({
  onChoose,
  description,
}: {
  onChoose: (url: string) => void;
  description: string;
}) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [gallery, setGallery] = useState(false);
  const assets = useQuery({
    queryKey: ["admin", "website", "banner-media"],
    queryFn: ({ signal }) => listWebsiteBannerMedia(100, signal),
    enabled: gallery,
    retry: false,
  });

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    input.value = "";
    setError("");
    setUploading(true);
    try {
      const result = await uploadWebsiteBannerMedia(file, description);
      onChoose(result.data.url);
      await queryClient.invalidateQueries({ queryKey: ["admin", "website", "banner-media"] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload banner image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button variant="outlined" component="label"
          startIcon={uploading ? <CircularProgress size={16} /> : <ImagePlus size={17} />}
          disabled={uploading}>
          {uploading ? "Uploading to Website…" : "Upload Website artwork"}
          <input hidden type="file" accept="image/jpeg,image/png,image/webp"
            onChange={(event) => { void upload(event); }} disabled={uploading} />
        </Button>
        <Button variant="outlined" disabled={uploading} onClick={() => setGallery(value => !value)}>
          {gallery ? "Hide Website media" : "Choose existing Website media"}
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Uploaded files are processed through FastAPI and stored under Website banner media,
        never in the native Mobile media namespace. Upload alone does not publish the banner.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {gallery && (
        assets.isPending ? <CircularProgress size={22} /> :
        assets.error ? (
          <Alert severity="error">
            Unable to load Website assets.{" "}
            <Button onClick={() => void assets.refetch()}>Retry</Button>
          </Alert>
        ) : !assets.data?.data.length ? (
          <Typography color="text.secondary">No Website banner images uploaded yet.</Typography>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))", gap: 1 }}>
            {assets.data.data.map((asset) => (
              <Box component="button" key={asset.id} type="button"
                title={asset.alt} aria-label={`Choose ${asset.alt}`}
                onClick={() => { onChoose(asset.url); setGallery(false); }}
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5,
                  p: 0.5, cursor: "pointer", bgcolor: "background.paper" }}>
                <Box component="img" src={asset.url} alt={asset.alt}
                  sx={{ width: "100%", aspectRatio: "3 / 1", objectFit: "contain" }} />
              </Box>
            ))}
          </Box>
        )
      )}
    </Stack>
  );
}
