import {
  Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, InputAdornment, Paper, Skeleton, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import { BookOpen, ExternalLink, Newspaper, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { listWebsitePosts, type WebsitePost, websiteNewsKeys } from "./api";

function displayDate(post: WebsitePost) {
  const date = new Date(post.timestamp);
  // Legacy posts use Unix milliseconds, but some may be supplied in seconds.
  const millis = post.timestamp < 10_000_000_000 ? post.timestamp * 1000 : post.timestamp;
  const parsed = new Date(millis);
  return Number.isNaN(parsed.getTime()) ? post.date : parsed.toLocaleDateString();
}

function PostDetails({ post, onClose }: { post: WebsitePost | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(post)} onClose={onClose} fullWidth maxWidth="md"
      aria-labelledby="website-news-preview-title"
      slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: "90vh" } } }}>
      <DialogTitle id="website-news-preview-title">Website article · Read-only preview</DialogTitle>
      <DialogContent dividers>
        {post && <Stack spacing={2}>
          <Box component="img" src={post.imageUrl} alt={post.headline}
            referrerPolicy="no-referrer" sx={{ display: "block", width: "100%", maxHeight: 300, objectFit: "contain", bgcolor: "action.hover", borderRadius: 2 }} />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={post.category} size="small" color="primary" variant="outlined" />
            <Chip label={post.date || displayDate(post)} size="small" variant="outlined" />
          </Stack>
          <Typography variant="h5" fontWeight={800}>{post.headline}</Typography>
          <Typography color="text.secondary">{post.summary}</Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {post.fullArticle}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
            Legacy post ID: {post.id} · Source: {post.sourceName || "Not specified"}
          </Typography>
          {post.sourceUrl && (
            <Button component="a" href={post.sourceUrl} target="_blank"
              rel="noopener noreferrer" variant="outlined"
              startIcon={<ExternalLink size={16} />} sx={{ alignSelf: "flex-start" }}>
              External source
            </Button>
          )}
        </Stack>}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

export function WebsiteNewsPage() {
  const [search, setSearch] = useState("");
  const [selectedPost, setSelectedPost] = useState<WebsitePost | null>(null);
  const posts = useInfiniteQuery({
    queryKey: websiteNewsKeys.all,
    queryFn: ({ pageParam, signal }) => listWebsitePosts(20, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const items = useMemo(
    () => posts.data?.pages.flatMap((page) => page.data.items) ?? [],
    [posts.data],
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? items.filter((post) => [post.headline, post.category, post.summary, post.id]
      .some((value) => value.toLowerCase().includes(term))) : items;
  }, [items, search]);

  return (
    <Box className="modern-page">
      <Stack spacing={2.25}>
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={800}>
            Website · Editorial
          </Typography>
          <Typography variant="h4" fontWeight={850}>Noticias / Blog</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 800 }}>
            Existing website posts from the original Firestore collection, served read-only by
            FastAPI. This area is separate from Mobile Pages and published releases.
          </Typography>
        </Box>
        <Alert severity="info" icon={<BookOpen size={20} />}>
          Phase 1: read-only inventory. Creating, editing, deleting and publishing website
          articles will be enabled only after the independent Website Draft/Publish contract
          and migration have passed acceptance.
        </Alert>
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField label="Search loaded articles" size="small" value={search}
              onChange={(event) => setSearch(event.target.value)} fullWidth
              helperText="Search filters only the loaded pages; use Load more for older posts."
              InputProps={{ startAdornment: <InputAdornment position="start"><Search size={17} /></InputAdornment> }} />
            <Button variant="outlined" disabled={posts.isFetching}
              onClick={() => void posts.refetch()} sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}>
              {posts.isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </Stack>
        </Paper>
        {posts.isPending && <Stack spacing={1}><Skeleton height={60}/><Skeleton height={60}/></Stack>}
        {posts.error && (
          <Alert severity="error" action={<Button color="inherit" onClick={() => void posts.refetch()}>Retry</Button>}>
            Unable to load website articles. The FastAPI Website News V1 endpoint must be
            deployed before this view can read posts.{" "}
            {posts.error instanceof Error ? posts.error.message : ""}
          </Alert>
        )}
        {!posts.isPending && !posts.error && (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
            <Table size="small" aria-label="Website news articles" sx={{ minWidth: 650 }}>
              <TableHead><TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell>Article</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Legacy ID</TableCell>
                <TableCell align="right">Preview</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {filtered.map((post) => (
                  <TableRow key={post.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar variant="rounded" src={post.imageUrl}
                          alt={post.headline} sx={{ width: 58, height: 48, bgcolor: "action.hover" }}>
                          <Newspaper size={20}/>
                        </Avatar>
                        <Box sx={{ maxWidth: 340 }}>
                          <Typography variant="body2" fontWeight={800}>{post.headline}</Typography>
                          <Typography variant="caption" color="text.secondary"
                            sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {post.summary}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell><Chip size="small" label={post.category} variant="outlined"/></TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{post.date || displayDate(post)}</TableCell>
                    <TableCell sx={{ maxWidth: 180, overflowWrap: "anywhere" }}>{post.id}</TableCell>
                    <TableCell align="right">
                      <Button variant="outlined" size="small" onClick={() => setSelectedPost(post)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!filtered.length && <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    {items.length ? "No loaded article matches this search." : "No website posts found."}
                  </TableCell>
                </TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {posts.hasNextPage && (
          <Button variant="outlined" disabled={posts.isFetchingNextPage}
            sx={{ alignSelf: "center" }} onClick={() => void posts.fetchNextPage()}>
            {posts.isFetchingNextPage ? "Loading…" : "Load more articles"}
          </Button>
        )}
        <Typography variant="caption" color="text.secondary">
          {items.length} loaded articles · No publishing operation is available in this release.
        </Typography>
      </Stack>
      <PostDetails post={selectedPost} onClose={() => setSelectedPost(null)} />
    </Box>
  );
}
