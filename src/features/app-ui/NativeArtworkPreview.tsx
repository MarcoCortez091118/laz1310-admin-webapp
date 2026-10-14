import { Box, Typography } from "@mui/material";
import { ImageOff } from "lucide-react";
import { useEffect, useState } from "react";

export type EditorialImageShape = "banner" | "poster" | "square";

/** Layout-only preview: immutable input, image errors are isolated per URL. */
export function NativeArtworkPreview({
  src, alt, shape = "square", maxHeight = 260,
}: {
  src: string | null | undefined;
  alt: string;
  shape?: EditorialImageShape;
  maxHeight?: number;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <Box className="native-artwork-preview" sx={{
      width: "100%", minWidth: 0,
      aspectRatio: shape === "banner" ? "3 / 1" : shape === "poster" ? "3 / 4" : "1 / 1",
      maxHeight, borderRadius: 2.5, border: "1px solid", borderColor: "divider",
      bgcolor: "action.hover", position: "relative", overflow: "hidden",
      display: "grid", placeItems: "center",
    }}>
      {src?.startsWith("https://") && !failed ? (
        <Box key={src} component="img" src={src} alt={alt} loading="lazy"
          referrerPolicy="no-referrer" onError={() => setFailed(true)}
          sx={{
            width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%",
            display: "block", objectFit: "contain", objectPosition: "center",
          }}
        />
      ) : (
        <Box sx={{ display: "grid", justifyItems: "center", gap: 1, p: 2,
          color: "text.secondary", textAlign: "center" }}>
          <ImageOff size={24} aria-hidden />
          <Typography variant="caption">{src ? "Preview unavailable" : "No artwork"}</Typography>
        </Box>
      )}
    </Box>
  );
}
