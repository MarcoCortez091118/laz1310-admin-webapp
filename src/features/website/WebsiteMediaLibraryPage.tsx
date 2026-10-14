import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { ChevronDown, FolderOpen, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { WebsiteArtworkField } from "../media/WebsiteArtworkField";
import { WebsiteMediaBrowser } from "../media/WebsiteMediaBrowser";
import { websiteMediaFolders, type WebsiteMediaFolder } from "../media/websiteMediaCatalog";

/** Website media collections are backed by separate, existing FastAPI routes. */
export function WebsiteMediaLibraryPage() {
  const [folder, setFolder] = useState<WebsiteMediaFolder>("banners");
  const [selectedUrl, setSelectedUrl] = useState("");
  return <Box component="section" className="modern-page" sx={{ minWidth: 0 }}>
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="overline" fontWeight={800} color="primary.main">
          WEBSITE / ASSETS
        </Typography>
        <Typography component="h1" variant="h4">Website Media Library</Typography>
        <Typography color="text.secondary" mt={1} maxWidth={740} fontSize={13.5}>
          Explore managed Website artwork, organized by purpose. Collections
          are isolated from Android/iOS media and from each other.
        </Typography>
      </Box>
      <Box className="media-folder-grid" aria-label="Website media folders">
        {websiteMediaFolders.map(item => (
          <button key={item.id} type="button" className="media-folder-tile"
            aria-pressed={folder === item.id} onClick={() => { setFolder(item.id); setSelectedUrl(""); }}>
            <FolderOpen size={26} aria-hidden color={folder === item.id ? "#D30A12" : "currentColor"}/>
            <span style={{ minWidth: 0 }}>
              <strong>{item.label}</strong><small>{item.description}</small>
            </span>
          </button>
        ))}
      </Box>
      <Accordion disableGutters sx={{ borderRadius: "14px !important", overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
        <AccordionSummary expandIcon={<ChevronDown size={19}/>}
          aria-controls="website-folder-upload-panel" id="website-folder-upload-header">
          <Typography fontWeight={750}>Upload image to selected folder</Typography>
        </AccordionSummary>
        <AccordionDetails id="website-folder-upload-panel">
          <WebsiteArtworkField key={folder} folder={folder} showBrowse={false}
            url={selectedUrl} onChange={setSelectedUrl}
            title={`LA Z Website ${folder} image`}/>
        </AccordionDetails>
      </Accordion>
      <Card><CardContent sx={{ p: { xs: 2, md: 3 }, minWidth: 0 }}>
        <WebsiteMediaBrowser folder={folder}/>
      </CardContent></Card>
      <Alert severity="info" icon={<ShieldCheck size={19}/>}>
        Choose images from the corresponding Website editor when changing content.
        Uploading an image never publishes a banner, show or promotion.
        Native Android/iOS media remains under its separate Media module.
      </Alert>
    </Stack>
  </Box>;
}
