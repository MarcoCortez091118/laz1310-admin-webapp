import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, InputAdornment, Pagination, Stack, TextField, Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { paginateItems } from "../../app/pagination";
import { ArtworkPreview } from "../website/ArtworkPreview";
import { listWebsiteBannerMedia } from "../website/banners/mediaApi";
import { listShowMedia } from "../website/shows/api";
import { listPromotionMedia } from "../website/tickets/api";
import "./editorial-gallery.css";

export type WebsiteMediaFolder = "banners" | "shows" | "promotions";
export interface WebsiteImageAsset {
  id: string; url: string; alt: string;
  width: number; height: number; sizeBytes: number; contentType: string;
}
export const websiteMediaFolders: { id: WebsiteMediaFolder; label: string; description: string }[] = [
  { id: "banners", label: "Website Banners", description: "Desktop and mobile hero artwork" },
  { id: "shows", label: "Website Shows", description: "Program posters and artwork" },
  { id: "promotions", label: "Ticket Promotions", description: "Registration and promotion artwork" },
];

/**
 * Each folder is a distinct FastAPI media contract backed by its isolated
 * Website Storage prefix. This is not unrestricted GCS bucket navigation.
 */
export async function readWebsiteFolder(
  folder: WebsiteMediaFolder,
): Promise<WebsiteImageAsset[]> {
  switch (folder) {
    case "banners": return (await listWebsiteBannerMedia()).data;
    case "shows": return (await listShowMedia()).data;
    case "promotions": return (await listPromotionMedia()).data;
  }
}

export function WebsiteMediaBrowser({
  folder, onChoose, selectedUrl,
}: {
  folder: WebsiteMediaFolder;
  onChoose?: (url: string) => void;
  selectedUrl?: string | null;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { setSearch(""); setPage(1); }, [folder]);
  const library = useQuery({
    queryKey: ["admin", "website", "scoped-media", folder],
    queryFn: () => readWebsiteFolder(folder), retry: false,
  });
  const term = search.trim().toLocaleLowerCase();
  const filtered = (library.data ?? []).filter(asset =>
    !term || asset.alt.toLocaleLowerCase().includes(term) ||
    asset.id.toLocaleLowerCase().includes(term));
  const shown = paginateItems(filtered, page, 20);
  const label = websiteMediaFolders.find(item => item.id === folder)?.label ?? folder;
  return <Stack spacing={2} minWidth={0}>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}
      alignItems={{ sm: "center" }} justifyContent="space-between">
      <Box>
        <Typography fontWeight={800}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          Isolated collection · {library.data ? `${library.data.length} loaded assets` : "Loading"}
        </Typography>
      </Box>
      <Stack direction="row" gap={1}>
        <TextField size="small" aria-label={`Search ${label} images`}
          placeholder="Search description or asset ID"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          slotProps={{ input: { startAdornment:
            <InputAdornment position="start"><Search size={16}/></InputAdornment>,
          } }}
        />
        <Button size="small" variant="outlined" disabled={library.isFetching}
          onClick={() => void library.refetch()}>Refresh</Button>
      </Stack>
    </Stack>
    {library.isPending ? <Box sx={{ display: "grid", placeItems: "center", minHeight: 160 }}>
      <CircularProgress size={27}/>
    </Box> : library.error ? <Alert severity="error" action={
      <Button color="inherit" onClick={() => void library.refetch()}>Retry</Button>
    }>Unable to load this Website media collection. No other folder was substituted.</Alert> :
    shown.items.length ? <Box className="editorial-five-grid">
      {shown.items.map(asset => {
        const selected = selectedUrl === asset.url;
        return <Box component="article" key={asset.id} sx={{
          minWidth: 0, border: "1px solid", borderColor: selected ? "primary.main" : "divider",
          borderRadius: 3, p: 1.25, bgcolor: "background.paper", overflow: "hidden",
          display: "flex", flexDirection: "column", gap: 1,
        }}>
          <ArtworkPreview src={asset.url} alt={asset.alt} shape="square" />
          <Typography fontWeight={750} noWrap title={asset.alt} fontSize={12.5}>
            {asset.alt}
          </Typography>
          <Typography color="text.secondary" fontSize={11.5}>
            {asset.width} × {asset.height}
          </Typography>
          {onChoose && <Button size="small" variant={selected ? "contained" : "outlined"}
            fullWidth onClick={() => onChoose(asset.url)}>
            {selected ? "Selected" : "Choose image"}
          </Button>}
        </Box>;
      })}
    </Box> : <Alert severity="info">
      {search.trim() ? "No matching images in this folder." : "No managed images in this folder."}
    </Alert>}
    {shown.pages > 1 && <Stack direction="row" justifyContent="space-between"
      alignItems="center" gap={1} flexWrap="wrap">
      <Typography fontSize={12} color="text.secondary">
        {shown.items.length} of {shown.total} loaded images
      </Typography>
      <Pagination count={shown.pages} page={shown.page}
        onChange={(_, next) => setPage(next)} size="small" />
    </Stack>}
    <Typography fontSize={11.5} color="text.secondary">
      Files are served through this folder's existing FastAPI endpoint.
      Subfolders and global Storage search are not available in the current API.
    </Typography>
  </Stack>;
}

export function WebsiteMediaPickerDialog({
  open, folder, selectedUrl, onClose, onChoose,
}: {
  open: boolean; folder: WebsiteMediaFolder; selectedUrl?: string | null;
  onClose: () => void; onChoose: (url: string) => void;
}) {
  const label = websiteMediaFolders.find(item => item.id === folder)?.label ?? folder;
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg"
    slotProps={{ paper: { sx: { maxHeight: "calc(100dvh - 24px)", m: 1 } } }}>
    <DialogTitle>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" gap={1} alignItems="center">
          <FolderOpen size={20}/> {label} — image library
        </Stack>
        <Button size="small" color="inherit" onClick={onClose}
          aria-label="Close image library"><X size={17}/></Button>
      </Stack>
    </DialogTitle>
    <DialogContent dividers sx={{ minWidth: 0 }}>
      {open && <WebsiteMediaBrowser folder={folder} selectedUrl={selectedUrl}
        onChoose={url => { onChoose(url); onClose(); }}/>}
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Cancel</Button></DialogActions>
  </Dialog>;
}
