import {
  Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Typography,
} from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FilePenLine } from "lucide-react";
import { listWebsiteDrafts, type WebsiteNewsDraft, websiteDraftKeys } from "./draftsApi";

export function WebsiteDraftsPanel({ onEdit }: {
  onEdit: (draft: WebsiteNewsDraft) => void;
}) {
  const drafts = useInfiniteQuery({
    queryKey: websiteDraftKeys,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => listWebsiteDrafts(20, pageParam, signal),
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const items = drafts.data?.pages.flatMap((page) => page.data.items) ?? [];

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <FilePenLine size={19} />
          <Typography fontWeight={850}>Website drafts</Typography>
          <Chip label={`${items.length} loaded`} size="small" variant="outlined"/>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Private editorial work. Neither Mobile nor the public website reads these drafts.
        </Typography>
        {drafts.isPending && <CircularProgress size={22} />}
        {drafts.error && <Alert severity="error" action={
          <Button color="inherit" onClick={() => void drafts.refetch()}>Retry</Button>
        }>
          Unable to load Website drafts. Deploy FastAPI News V2 before enabling this workspace.
          {" "}{drafts.error instanceof Error ? drafts.error.message : ""}
        </Alert>}
        {!drafts.isPending && !drafts.error && items.length === 0 &&
          <Typography color="text.secondary" variant="body2">
            No saved Website drafts yet. Create one or prepare an existing article below.
          </Typography>}
        {items.map((draft) => (
          <Stack key={draft.post.id} direction={{ xs: "column", sm: "row" }}
            spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between"
            sx={{ py: 1, borderTop: "1px solid", borderColor: "divider" }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={800}>{draft.post.headline}</Typography>
              <Typography variant="caption" color="text.secondary">
                {draft.post.id} · Revision {draft.revision} · {draft.origin === "legacy"
                  ? "Imported from website" : "New article"}
              </Typography>
            </Box>
            <Button variant="outlined" size="small" startIcon={<FilePenLine size={15} />}
              sx={{ flexShrink: 0 }} onClick={() => onEdit(draft)}>
              Continue editing
            </Button>
          </Stack>
        ))}
        {drafts.hasNextPage && (
          <Button variant="outlined" disabled={drafts.isFetchingNextPage}
            onClick={() => void drafts.fetchNextPage()}>
            {drafts.isFetchingNextPage ? "Loading…" : "Load more drafts"}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
