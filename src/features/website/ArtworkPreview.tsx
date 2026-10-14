import { Box, Typography } from "@mui/material";
import { ImageOff } from "lucide-react";
import { useEffect, useState } from "react";

/** Keeps tall/wide artwork inside its own media box. Never expands the parent card. */
export function ArtworkPreview({
  src, alt, shape = "landscape", contain = true,
}: {
  src: string | null | undefined;
  alt: string;
  shape?: "landscape" | "portrait" | "square";
  contain?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const ratio = shape === "portrait" ? "3 / 4" : shape === "square" ? "1 / 1" : "16 / 9";
  return (
    <Box
      className="editorial-artwork"
      sx={{
        width: "100%",
        minWidth: 0,
        aspectRatio: ratio,
        maxHeight: shape === "portrait" ? 260 : 230,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        position: "relative",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2.5,
        bgcolor: "action.hover",
      }}
    >
      {src?.startsWith("https://") && !failed ? (
        <Box component="img" src={src} alt={alt} loading="lazy"
          onError={() => setFailed(true)}
          sx={{
            display: "block",
            width: "100%",
            height: "100%",
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: contain ? "contain" : "cover",
            objectPosition: "center",
          }}
        />
      ) : (
        <Box sx={{ textAlign: "center", p: 2, color: "text.secondary", minWidth: 0 }}>
          <ImageOff size={26} aria-hidden />
          <Typography variant="caption" component="div" sx={{ mt: 1 }}>
            {src ? "Preview unavailable" : "No artwork"}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
