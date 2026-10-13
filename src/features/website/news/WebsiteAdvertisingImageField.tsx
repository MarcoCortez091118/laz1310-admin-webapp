import {
  Alert, Box, Button, Chip, Paper, Stack, TextField, Typography,
} from "@mui/material";
import { Image as ImageIcon, Images, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { MediaPickerDialog } from "../../media/MediaPickerDialog";
import {
  advertisingImageShape, safeAdvertisingImageUrl,
  WEBSITE_AD_ASPECT_RATIO, WEBSITE_AD_RECOMMENDED_PX,
} from "./advertisingImage";

type ImageState =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "loaded"; width: number; height: number };

export function WebsiteAdvertisingImageField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chosenAsset, setChosenAsset] = useState<{ url: string; alt: string } | null>(null);
  const [imageState, setImageState] = useState<ImageState>({ kind: "loading" });
  const source = safeAdvertisingImageUrl(value);
  const hasUrl = value.trim().length > 0;

  useEffect(() => {
    setImageState({ kind: "loading" });
  }, [source]);

  const shape = imageState.kind === "loaded"
    ? advertisingImageShape(imageState.width, imageState.height)
    : "unknown";

  return (
    <Paper component="section" variant="outlined"
      aria-label="Website article advertising"
      sx={{ borderRadius: 2.5, p: 2 }}>
      <Stack spacing={1.5}>
        <Stack spacing={0.5}>
          <Typography fontWeight={850}>Article advertising · Ads</Typography>
          <Typography variant="body2" color="text.secondary">
            Choose an image from the managed Media Library, upload a new one,
            or paste a direct HTTPS image URL. The website displays the ad in a square slot.
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`Expected ratio: ${WEBSITE_AD_ASPECT_RATIO}`}
              size="small" color="primary" variant="outlined" />
            <Chip label={`Recommended: ${WEBSITE_AD_RECOMMENDED_PX} × ${WEBSITE_AD_RECOMMENDED_PX} px`}
              size="small" variant="outlined" />
          </Stack>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="outlined" startIcon={<Images size={17} />}
            disabled={disabled} onClick={() => setPickerOpen(true)}>
            {hasUrl ? "Replace / upload ad" : "Upload / choose ad"}
          </Button>
          {hasUrl && (
            <Button variant="text" color="error" startIcon={<Trash2 size={16} />}
              disabled={disabled} onClick={() => {
                setChosenAsset(null);
                onChange("");
              }}>
              Clear ad
            </Button>
          )}
        </Stack>
        <TextField
          fullWidth
          size="small"
          label="Advertising image URL (optional)"
          placeholder="https://example.com/advertisement.webp"
          disabled={disabled}
          value={value}
          onChange={(event) => {
            setChosenAsset(null);
            onChange(event.target.value);
          }}
          helperText="Use a direct HTTPS image address, not a file-sharing preview page."
          inputProps={{ maxLength: 2048 }}
          error={hasUrl && !source}
        />
        {chosenAsset && source === chosenAsset.url ? (
          <Alert severity="success" role="status">
            Selected from Media Library: {chosenAsset.alt}. Press “Save Website draft”
            to persist this advertising image.
          </Alert>
        ) : null}

        {hasUrl && !source && (
          <Alert severity="error" role="alert">
            This is not a valid direct HTTPS image URL. Choose or upload an image instead.
          </Alert>
        )}
        {source && (
          <Stack spacing={1}>
            <Box
              sx={{
                aspectRatio: "1 / 1",
                maxWidth: 320,
                width: "100%",
                mx: "auto",
                bgcolor: "action.hover",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
                position: "relative",
              }}
            >
              {imageState.kind === "failed" && (
                <Stack alignItems="center" spacing={1} sx={{ px: 2, textAlign: "center" }}>
                  <ImageIcon size={30} color="#94a3b8" />
                  <Typography variant="caption" color="text.secondary">
                    Unable to load this image.
                  </Typography>
                </Stack>
              )}
              <Box component="img" key={source}
                src={source} alt="Website article advertisement preview"
                referrerPolicy="no-referrer"
                onLoad={(event) => {
                  if (event.currentTarget.getAttribute("src") !== source) return;
                  setImageState({
                    kind: "loaded",
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  });
                }}
                onError={() => setImageState({ kind: "failed" })}
                sx={{
                  display: imageState.kind === "failed" ? "none" : "block",
                  position: "absolute", inset: 0,
                  width: "100%", height: "100%",
                  objectFit: "cover",
                }}
              />
            </Box>
            {imageState.kind === "loading" && (
              <Typography variant="caption" color="text.secondary" textAlign="center">
                Checking image preview…
              </Typography>
            )}
            {imageState.kind === "failed" && (
              <Alert severity="error" role="alert">
                The browser cannot display this URL. Check that it points directly to a
                publicly accessible image; expired links, permissions and hotlink protection
                can prevent loading. Uploading the image to our managed library is preferred.
              </Alert>
            )}
            {imageState.kind === "loaded" && (
              <Alert severity={shape === "square" ? "success" : "warning"}>
                Source: {imageState.width} × {imageState.height} px.{" "}
                {shape === "square"
                  ? "The asset matches the square advertising slot."
                  : "This is not 1:1. The website may crop the image. A square asset is recommended."}
              </Alert>
            )}
          </Stack>
        )}
        {!hasUrl && (
          <Box sx={{
            p: 3, minHeight: 110, display: "grid", placeItems: "center",
            bgcolor: "action.hover", border: "1px dashed", borderColor: "divider",
            borderRadius: 2,
          }}>
            <Stack spacing={0.5} alignItems="center" color="text.secondary">
              <ImageIcon size={24} />
              <Typography variant="body2">No advertisement image selected</Typography>
            </Stack>
          </Box>
        )}
        <Typography variant="caption" color="text.secondary">
          This preview shows the draft only. Your advertisement will not appear on
          laz1310.com until Website publication is implemented and approved.
        </Typography>
      </Stack>
      <MediaPickerDialog
        open={pickerOpen}
        currentUrl={source}
        title="Upload or choose article advertisement"
        description="Managed upload: JPEG, PNG or WebP, up to 5 MiB. Square 1:1 artwork recommended."
        onClose={() => setPickerOpen(false)}
        onSelect={(asset) => {
          setChosenAsset({ url: asset.url, alt: asset.alt });
          onChange(asset.url);
        }}
      />
    </Paper>
  );
}
