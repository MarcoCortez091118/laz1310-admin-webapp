import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Stack, Typography,
} from "@mui/material";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { safeAdvertisingImageUrl } from "./advertisingImage";
import type { WebsitePost } from "./api";
import { displayNewsDate } from "./model";

function safeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function WebsiteNewsDetailsDialog({
  post, onClose,
}: {
  post: WebsitePost | null;
  onClose: () => void;
}) {
  const sourceUrl = safeSourceUrl(post?.sourceUrl ?? "");
  const adUrl = safeAdvertisingImageUrl(post?.adImageUrl ?? "");
  const [failedAdUrl, setFailedAdUrl] = useState<string | null>(null);
  return (
    <Dialog open={Boolean(post)} onClose={onClose} fullWidth maxWidth="md"
      aria-labelledby="website-news-preview-title"
      slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: "90vh" } } }}>
      <DialogTitle id="website-news-preview-title">Website article · Read-only preview</DialogTitle>
      <DialogContent dividers>
        {post && (
          <Stack spacing={2}>
            {post.imageUrl ? (
              <Box component="img" src={post.imageUrl} alt={post.headline}
                referrerPolicy="no-referrer"
                sx={{ display: "block", width: "100%", maxHeight: 300,
                  objectFit: "contain", bgcolor: "action.hover", borderRadius: 2 }} />
            ) : null}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={post.category || "GENERAL"} size="small"
                color="primary" variant="outlined" />
              <Chip label={displayNewsDate(post)} size="small" variant="outlined" />
            </Stack>
            <Typography variant="h5" fontWeight={800}>{post.headline}</Typography>
            <Typography color="text.secondary">{post.summary}</Typography>
            <Typography variant="body2"
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {post.fullArticle}
            </Typography>
            <Typography variant="caption" color="text.secondary"
              sx={{ overflowWrap: "anywhere" }}>
              Legacy post ID: {post.id} · Source: {post.sourceName || "Not specified"}
            </Typography>
            {post.adImageUrl && (
              <Stack spacing={1.5}>
                <Typography fontWeight={800}>Article advertising · 1:1</Typography>
                {adUrl && failedAdUrl !== adUrl ? (
                  <Box component="img" src={adUrl}
                    alt="Advertisement for this Website article"
                    referrerPolicy="no-referrer"
                    onError={() => setFailedAdUrl(adUrl)}
                    sx={{ aspectRatio: "1 / 1", width: "100%", maxWidth: 320,
                      objectFit: "cover", borderRadius: 2 }}
                  />
                ) : (
                  <Alert severity="warning">
                    This advertising image is unavailable. Verify its URL or upload
                    a managed image in the article editor.
                  </Alert>
                )}
              </Stack>
            )}
            {sourceUrl && (
              <Button component="a" href={sourceUrl} target="_blank"
                rel="noopener noreferrer" variant="outlined"
                startIcon={<ExternalLink size={16} />}
                sx={{ alignSelf: "flex-start" }}>
                External source
              </Button>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}
