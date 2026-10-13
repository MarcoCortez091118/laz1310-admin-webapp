import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControl,
  InputAdornment, InputLabel, ListItemText, MenuItem, Paper, Select,
  Skeleton, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, ChevronLeft, ChevronRight, Columns3,
  Newspaper, Plus, RefreshCw, Search,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { listWebsitePosts, type WebsitePost, websiteNewsKeys } from "./api";
import {
  canAdvanceNewsPage, filterNewsPage, NEWS_COLUMNS, NEWS_PAGE_SIZES,
  newsPageCategories, type NewsColumn,
} from "./model";
import { WebsiteNewsDetailsDialog } from "./WebsiteNewsDetailsDialog";
import { WebsitePostEditorDialog } from "./WebsitePostEditorDialog";
import { WebsiteDraftsPanel } from "./WebsiteDraftsPanel";
import { websiteDraftKeys, type WebsiteNewsDraft } from "./draftsApi";
import { WebsiteNewsTable } from "./WebsiteNewsTable";

/**
 * Cursor-based navigation: only one server page is shown at a time.
 * Earlier pages remain in TanStack Query cache for instant Back navigation.
 */
export function WebsiteNewsPage() {
  const queryClient = useQueryClient();
  const [pageSize, setPageSize] = useState<number>(20);
  const [pageIndex, setPageIndex] = useState(0);
  const tableAnchorRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [visibleColumns, setVisibleColumns] = useState<NewsColumn[]>([
    "category", "date", "source",
  ]);
  const [selectedPost, setSelectedPost] = useState<WebsitePost | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<WebsitePost | null>(null);
  const [editingDraft, setEditingDraft] = useState<WebsiteNewsDraft | null>(null);

  function openEditor(post: WebsitePost | null, draft: WebsiteNewsDraft | null = null) {
    setEditingPost(post);
    setEditingDraft(draft);
    setEditorOpen(true);
  }

  const directoryQueryKey = [...websiteNewsKeys.all, "directory", pageSize] as const;
  const posts = useInfiniteQuery({
    queryKey: directoryQueryKey,
    queryFn: ({ pageParam, signal }) => listWebsitePosts(pageSize, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const pages = posts.data?.pages;
  const activeIndex = Math.min(pageIndex, Math.max((pages?.length ?? 1) - 1, 0));
  const pageItems = pages?.[activeIndex]?.data.items ?? [];
  const availableCategories = newsPageCategories(pageItems);
  const visibleItems = useMemo(
    () => filterNewsPage(pageItems, search, category),
    [pageItems, search, category],
  );
  const loadedCount = pages?.reduce((sum, page) => sum + page.data.items.length, 0) ?? 0;
  const canGoNext = canAdvanceNewsPage(
    activeIndex,
    pages?.length ?? 0,
    Boolean(posts.hasNextPage),
  );
  const pageBusy = posts.isFetchingNextPage || (posts.isFetching && !posts.isFetchingNextPage);
  const hasFilters = Boolean(search.trim()) || category !== "all";

  function clearPageFilters() {
    setSearch("");
    setCategory("all");
  }

  function changePageSize(size: number) {
    if (!NEWS_PAGE_SIZES.some((value) => value === size)) return;
    setPageIndex(0);
    setPageSize(size);
    clearPageFilters();
  }

  function showPage(index: number) {
    clearPageFilters();
    setPageIndex(index);
    // Keep the first article visible on every page; no manual scrolling required.
    tableAnchorRef.current?.scrollIntoView({ block: "start" });
  }

  function previousPage() {
    if (activeIndex === 0) return;
    showPage(activeIndex - 1);
  }

  async function nextPage() {
    if (pageBusy || !canGoNext) return;
    if (pages && activeIndex + 1 < pages.length) {
      showPage(activeIndex + 1);
      return;
    }
    const result = await posts.fetchNextPage();
    if (!result.isError && (result.data?.pages.length ?? 0) > activeIndex + 1) {
      showPage(activeIndex + 1);
    }
  }

  return (
    <Box className="modern-page">
      <Stack spacing={2.25}>
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={800}
            sx={{ letterSpacing: ".12em" }}>
            Website · Editorial
          </Typography>
          <Typography variant="h4" fontWeight={850} sx={{ letterSpacing: "-.035em" }}>
            Noticias / Blog
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 800 }}>
            Browse articles from the official LA Z website. This catalog is independent
            from the native Mobile app and its published content.
          </Typography>
        </Box>

        <Alert severity="info" icon={<BookOpen size={20} />}>
          Website News V2: prepare and save editorial drafts securely. The existing live
          website and Mobile releases remain unchanged until Website publication is approved.
        </Alert>

        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }}
          justifyContent="space-between" spacing={1.5}>
          <Typography variant="subtitle1" fontWeight={800}>Editorial workspace</Typography>
          <Button variant="contained" startIcon={<Plus size={17} />}
            onClick={() => openEditor(null)}>
            Create article draft
          </Button>
        </Stack>
        <WebsiteDraftsPanel onEdit={(draft) => openEditor(null, draft)} />

        <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} alignItems="center">
          <Chip variant="outlined" color="primary"
            icon={<Newspaper size={16} />}
            label={`${loadedCount} loaded articles`} />
          <Chip variant="outlined" label={`Page ${activeIndex + 1}`} />
          <Chip variant="outlined" label="Newest first · FastAPI" />
        </Stack>

        <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}
            alignItems={{ md: "flex-start" }}>
            <TextField
              label="Search current page"
              placeholder="Title, category, summary or article ID"
              size="small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              fullWidth
              helperText="Search and category filters apply to the current page only."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><Search size={17} /></InputAdornment>
                ),
              }}
            />
            <TextField
              select size="small" label="Category"
              value={availableCategories.includes(category) ? category : "all"}
              onChange={(event) => setCategory(event.target.value)}
              sx={{ minWidth: { md: 160 } }}
            >
              <MenuItem value="all">All categories</MenuItem>
              {availableCategories.map((value) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </TextField>
            <FormControl size="small" sx={{ minWidth: { md: 170 } }}>
              <InputLabel id="website-news-columns-label">Columns</InputLabel>
              <Select
                labelId="website-news-columns-label"
                label="Columns"
                multiple
                value={visibleColumns}
                onChange={(event) => {
                  const value = event.target.value;
                  setVisibleColumns(
                    typeof value === "string"
                      ? value.split(",") as NewsColumn[]
                      : value as NewsColumn[],
                  );
                }}
                renderValue={() => (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Columns3 size={16} />
                    <span>{visibleColumns.length} shown</span>
                  </Stack>
                )}
              >
                {NEWS_COLUMNS.map((column) => (
                  <MenuItem key={column.id} value={column.id}>
                    <Checkbox size="small"
                      checked={visibleColumns.includes(column.id)} />
                    <ListItemText primary={column.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={posts.isFetching ? <CircularProgress size={15} /> :
                <RefreshCw size={16} />}
              disabled={posts.isFetching}
              onClick={() => {
                setPageIndex(0);
                clearPageFilters();
                // Reset opaque cursors when articles are added/edited in legacy Firestore.
                // This refetches page 1 instead of re-requesting all cached pages.
                void queryClient.resetQueries({ queryKey: directoryQueryKey, exact: true });
              }}
              sx={{ minHeight: 40, flexShrink: 0 }}
            >
              Refresh
            </Button>
          </Stack>
        </Paper>

        {posts.isPending ? (
          <Stack spacing={1}>
            <Skeleton height={70} variant="rounded" />
            <Skeleton height={70} variant="rounded" />
            <Skeleton height={70} variant="rounded" />
          </Stack>
        ) : null}

        {posts.error ? (
          <Alert severity="error"
            action={<Button color="inherit"
              onClick={() => posts.isFetchNextPageError
                ? void nextPage() : void posts.refetch()}>
              Retry
            </Button>}>
            Could not load Website articles. The current page will remain available
            if it was previously loaded.{" "}
            {posts.error instanceof Error ? posts.error.message : ""}
          </Alert>
        ) : null}

        {pages && (
          <>
            <Box ref={tableAnchorRef} sx={{ scrollMarginTop: "96px" }}>
              <WebsiteNewsTable
                posts={visibleItems}
                columns={visibleColumns}
                hasFilters={hasFilters}
                onOpen={setSelectedPost}
                onPrepareDraft={(post) => openEditor(post)}
              />
            </Box>

            <Paper variant="outlined" sx={{ borderRadius: 3, p: 1.5 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}
                justifyContent="space-between" alignItems={{ sm: "center" }}>
                <Stack direction="row" spacing={1} alignItems="center"
                  justifyContent={{ xs: "space-between", sm: "flex-start" }}>
                  <TextField select size="small" label="Rows per page"
                    disabled={pageBusy}
                    value={pageSize}
                    onChange={(event) => changePageSize(Number(event.target.value))}
                    sx={{ width: 155 }}>
                    {NEWS_PAGE_SIZES.map((size) => (
                      <MenuItem key={size} value={size}>{size}</MenuItem>
                    ))}
                  </TextField>
                  <Typography color="text.secondary" variant="body2"
                    aria-live="polite" sx={{ whiteSpace: "nowrap" }}>
                    Page {activeIndex + 1} · {visibleItems.length} shown
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center"
                  justifyContent={{ xs: "space-between", sm: "flex-end" }}>
                  <Tooltip title="Previously loaded page">
                    <span>
                      <Button variant="outlined" disabled={activeIndex === 0 || pageBusy}
                        onClick={previousPage} startIcon={<ChevronLeft size={16} />}>
                        Previous
                      </Button>
                    </span>
                  </Tooltip>
                  <Button variant="contained"
                    disabled={!canGoNext || pageBusy}
                    endIcon={posts.isFetchingNextPage ?
                      <CircularProgress size={16} color="inherit" /> :
                      <ChevronRight size={16} />}
                    onClick={() => void nextPage()}>
                    Next
                  </Button>
                </Stack>
              </Stack>
              <Typography variant="caption" color="text.secondary"
                sx={{ display: "block", mt: 1 }}>
                Pagination uses FastAPI cursors. The total number of articles is not
                provided by the API; filters are limited to the current page.
              </Typography>
            </Paper>
          </>
        )}
      </Stack>
      <WebsiteNewsDetailsDialog post={selectedPost}
        onClose={() => setSelectedPost(null)} />
      <WebsitePostEditorDialog
        open={editorOpen}
        initialPost={editingPost}
        initialDraft={editingDraft}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: websiteDraftKeys });
        }}
      />
    </Box>
  );
}
