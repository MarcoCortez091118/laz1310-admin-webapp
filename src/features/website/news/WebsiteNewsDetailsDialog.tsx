import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Stack, Typography,
} from "@mui/material";
import { ExternalLink } from "lucide-react";
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
