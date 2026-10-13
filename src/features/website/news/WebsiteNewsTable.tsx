import {
  Avatar, Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import { Eye, Newspaper } from "lucide-react";
import type { WebsitePost } from "./api";
import { displayNewsDate, type NewsColumn } from "./model";

interface WebsiteNewsTableProps {
  posts: WebsitePost[];
  columns: NewsColumn[];
  hasFilters: boolean;
  onOpen: (post: WebsitePost) => void;
}

export function WebsiteNewsTable({
  posts,
  columns,
  hasFilters,
  onOpen,
}: WebsiteNewsTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined"
      sx={{ borderRadius: 3, maxWidth: "100%", overflowX: "auto" }}>
      <Table size="small" aria-label="Website News articles" sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: "action.hover", "& th": {
            fontWeight: 800, color: "text.secondary", py: 1.75,
          } }}>
            <TableCell>Article</TableCell>
            {columns.includes("category") && <TableCell>Category</TableCell>}
            {columns.includes("date") && <TableCell>Date</TableCell>}
            {columns.includes("source") && <TableCell>Source</TableCell>}
            {columns.includes("slug") && <TableCell>Article ID</TableCell>}
            <TableCell align="right">Details</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.id} hover sx={{ "& td": { py: 1.2 } }}>
              <TableCell sx={{ minWidth: 290, maxWidth: 480 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar variant="rounded" src={post.imageUrl || undefined}
                    alt={post.headline}
                    sx={{ width: 64, height: 52, bgcolor: "action.hover", borderRadius: 2,
                      flexShrink: 0 }}>
                    <Newspaper size={22} />
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={800}
                      sx={{ display: "-webkit-box", WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>
                      {post.headline}
                    </Typography>
                    <Typography variant="caption" color="text.secondary"
                      sx={{ display: "block", overflow: "hidden",
                        whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 340, mt: 0.4 }}>
                      {post.summary || "No summary"}
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>
              {columns.includes("category") && (
                <TableCell>
                  <Chip size="small" variant="outlined" label={post.category || "GENERAL"}
                    sx={{ maxWidth: 150, fontWeight: 700 }} />
                </TableCell>
              )}
              {columns.includes("date") && (
                <TableCell sx={{ whiteSpace: "nowrap" }}>{displayNewsDate(post)}</TableCell>
              )}
              {columns.includes("source") && (
                <TableCell sx={{ maxWidth: 160, overflowWrap: "anywhere" }}>
                  {post.sourceName || "—"}
                </TableCell>
              )}
              {columns.includes("slug") && (
                <TableCell sx={{ maxWidth: 170 }}>
                  <Tooltip title={post.id}>
                    <Typography variant="caption" color="text.secondary"
                      sx={{ display: "block", maxWidth: 165,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {post.id}
                    </Typography>
                  </Tooltip>
                </TableCell>
              )}
              <TableCell align="right">
                <Button variant="outlined" size="small" onClick={() => onOpen(post)}
                  startIcon={<Eye size={15} />}
                  aria-label={`Preview article: ${post.headline}`}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!posts.length && (
            <TableRow>
              <TableCell align="center" colSpan={columns.length + 2} sx={{ py: 6 }}>
                <Stack alignItems="center" spacing={1}>
                  <Newspaper color="#94A3B8" size={30} />
                  <Typography fontWeight={800}>
                    {hasFilters ? "No matching articles on this page" : "No articles on this page"}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    {hasFilters ? "Try a different search or category." :
                      "Use the pagination controls to browse the catalog."}
                  </Typography>
                </Stack>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
