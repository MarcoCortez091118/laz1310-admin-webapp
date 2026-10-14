import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, IconButton, InputAdornment, Menu, MenuItem, Paper, Pagination, Stack, Tab, Tabs, TextField, Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Plus, RefreshCw, Rocket, Search, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "../../../api/errors";
import { useStaff } from "../../auth/StaffGate";
import {
  importShow, legacyShows, listShows, purgeShow, saveShow, showAction,
  showKeys, showPublication, type LegacyShow, type ShowContent, type ShowDraft,
} from "./api";
import { ShowPosterField } from "./ShowPosterField";
import { ArtworkPreview } from "../ArtworkPreview";
import { paginateItems } from "../../../app/pagination";

type View = "active" | "trashed" | "legacy";
type Editor = { id: string; revision: number; content: ShowContent };
type Confirmation = { id: string; revision: number; action: "trash" | "purge" | "unpublish" };

const NEW_CONTENT: ShowContent = {
  title: "", schedule: "", imageUrl: "", position: 0, linkUrl: null,
};

function message(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "The show was changed by another editor. Reload it before retrying.";
  }
  return error instanceof Error ? error.message : "Operation failed.";
}

function ShowEditDialog({ editor, close, save, busy }: {
  editor: Editor | null; close: () => void;
  save: (value: ShowContent) => void; busy: boolean;
}) {
  const [content, setContent] = useState<ShowContent>(NEW_CONTENT);
  useEffect(() => { if (editor) setContent(editor.content); }, [editor]);
  const valid = content.title.trim().length > 0 && content.imageUrl.startsWith("https://") &&
    (!content.linkUrl || content.linkUrl.startsWith("https://")) &&
    Number.isInteger(content.position) && content.position >= 0;

  return (
    <Dialog open={Boolean(editor)} onClose={busy ? undefined : close} fullWidth maxWidth="sm">
      <DialogTitle>{editor?.revision === 0 ? "Create Website show" : "Edit Website show draft"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info">Saving changes does not publish them. Every show is published separately.</Alert>
          <TextField label="Show / presenter name" value={content.title} required fullWidth
            onChange={e => setContent(v => ({ ...v, title: e.target.value }))} />
          <TextField label="Schedule / subtitle" value={content.schedule} fullWidth
            onChange={e => setContent(v => ({ ...v, schedule: e.target.value }))} />
          <TextField label="Display order (0 first)" type="number" value={content.position}
            onChange={e => setContent(v => ({ ...v, position: Number(e.target.value) }))} />
          <ShowPosterField title={content.title} url={content.imageUrl}
            onChange={url => setContent(v => ({ ...v, imageUrl: url }))} />
          <TextField label="HTTPS poster URL" value={content.imageUrl} fullWidth required
            onChange={e => setContent(v => ({ ...v, imageUrl: e.target.value.trim() }))} />
          <TextField label="Optional HTTPS destination" value={content.linkUrl ?? ""} fullWidth
            onChange={e => setContent(v => ({ ...v, linkUrl: e.target.value.trim() || null }))} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy}>Cancel</Button>
        <Button variant="contained" disabled={!valid || busy} onClick={() => save(content)}>
          Save draft (not published)
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ShowCard({ draft, isAdmin, busy, edit, action, confirm }: {
  draft: ShowDraft; isAdmin: boolean; busy: boolean;
  edit: (show: ShowDraft) => void;
  action: (id: string, action: "publish" | "restore", revision: number) => void;
  confirm: (value: Confirmation) => void;
}) {
  const publication = useQuery({
    queryKey: showKeys.publication(draft.id),
    queryFn: async () => (await showPublication(draft.id)).data,
    retry: false, enabled: draft.state === "active",
  });
  const published = publication.data?.status === "published";
  const needsPublish = !published || publication.data?.draftRevision !== draft.revision;
  const inTrash = draft.state === "trashed";
  return (
    <Paper variant="outlined" sx={{
      p: 1.5, borderRadius: 3, minWidth: 0, overflow: "hidden",
      display: "flex", flexDirection: "column", gap: 1.25,
      "&:hover": { borderColor: "primary.main" },
    }}>
      <ArtworkPreview src={draft.content.imageUrl} alt={draft.content.title} shape="portrait" />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" alignItems="start" justifyContent="space-between" gap={1}>
          <Typography fontWeight={800} fontSize={15} sx={{
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere",
          }} title={draft.content.title}>{draft.content.title}</Typography>
          <Chip size="small" label={inTrash ? "Trash" : published ? "Live" : "Draft"}
            color={inTrash ? "warning" : published ? "success" : "default"} />
        </Stack>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: .75 }}>
          {draft.content.schedule || "Schedule not set"}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .5 }}>
          Order {draft.content.position} · Draft {draft.revision}
          {published && needsPublish ? " · Changes pending" : ""}
        </Typography>
      </Box>
      <Stack direction="row" alignItems="center" spacing={.75}>
        {inTrash ? <Button size="small" fullWidth variant="outlined"
          startIcon={<Undo2 size={15}/>} disabled={busy}
          onClick={() => action(draft.id, "restore", draft.revision)}>Restore</Button> :
          <Button size="small" fullWidth variant="outlined" disabled={busy}
            onClick={() => edit(draft)}>Edit show</Button>}
        {!inTrash && isAdmin && needsPublish &&
          <Button size="small" variant="contained" disabled={busy}
            startIcon={<Rocket size={15}/>}
            onClick={() => action(draft.id, "publish", draft.revision)}>Publish</Button>}
        {isAdmin && <ShowMoreActions draft={draft} busy={busy}
          published={published} publicationRevision={publication.data?.revision ?? 0}
          confirm={confirm} />}
      </Stack>
    </Paper>
  );
}

function ShowMoreActions({ draft, busy, published, publicationRevision, confirm }: {
  draft: ShowDraft; busy: boolean; published: boolean; publicationRevision: number;
  confirm: (value: Confirmation) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const inTrash = draft.state === "trashed";
  return <>
    <IconButton size="small" aria-label={`More actions for ${draft.content.title}`}
      disabled={busy} onClick={event => setAnchor(event.currentTarget)}>
      <MoreVertical size={18} />
    </IconButton>
    <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)}>
      {!inTrash && published && <MenuItem onClick={() => {
        setAnchor(null);
        confirm({ id: draft.id, revision: publicationRevision, action: "unpublish" });
      }}>Unpublish</MenuItem>}
      {!inTrash && <MenuItem onClick={() => {
        setAnchor(null);
        confirm({ id: draft.id, revision: draft.revision, action: "trash" });
      }}>Move to trash</MenuItem>}
      {inTrash && <MenuItem onClick={() => {
        setAnchor(null);
        confirm({ id: draft.id, revision: draft.revision, action: "purge" });
      }}>Delete permanently (30-day retention)</MenuItem>}
    </Menu>
  </>;
}

export function WebsiteShowsPage() {
  const staff = useStaff();
  const isAdmin = staff.roles.includes("admin");
  const client = useQueryClient();
  const [view, setView] = useState<View>("active");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [confirming, setConfirming] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const list = useQuery({
    queryKey: showKeys.list(view),
    queryFn: async () => (await listShows(view === "trashed" ? "trashed" : "active")).data,
    enabled: view !== "legacy", retry: false,
  });
  const legacy = useQuery({
    queryKey: showKeys.legacy, queryFn: async () => (await legacyShows()).data,
    enabled: view === "legacy", retry: false,
  });

  const filteredShows = (list.data?.items ?? [])
    .filter(item => {
      const term = search.trim().toLocaleLowerCase();
      return !term || item.content.title.toLocaleLowerCase().includes(term) ||
        item.content.schedule.toLocaleLowerCase().includes(term);
    })
    .sort((a, b) => a.content.position - b.content.position || a.id.localeCompare(b.id));
  const visibleShows = paginateItems(filteredShows, page, 9);

  function reload() {
    void client.invalidateQueries({ queryKey: ["website", "shows"] });
  }
  async function execute(work: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      await work();
      setNotice(success);
      setEditor(null); setConfirming(null);
      reload();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  function create() {
    setEditor({ id: crypto.randomUUID(), revision: 0, content: { ...NEW_CONTENT } });
  }

  function save(content: ShowContent) {
    if (!editor) return;
    void execute(() => saveShow(editor.id, editor.revision, content), "Show draft saved. Publish separately.");
  }

  function perform(id: string, action: "publish" | "restore", revision: number) {
    void execute(() => showAction(id, action, revision),
      action === "publish" ? "Show published." : "Show restored as a draft (not published).");
  }

  function confirmAction() {
    if (!confirming) return;
    const { id, revision, action } = confirming;
    void execute(() => action === "purge" ? purgeShow(id, revision) :
      showAction(id, action, revision),
      action === "trash" ? "Moved to trash and unpublished." :
      action === "purge" ? "Show draft deleted permanently; audit and releases retained." :
      "Show removed from public Website.");
  }

  return (
    <section className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">Website / Editorial</p>
        <h1>Website Shows</h1>
        <p className="muted">
          Manage the SHOWS carousel separately from native Mobile Programs.
          Every show has independent drafts, releases, and a recoverable recycle bin.
        </p>
      </header>
      <Alert severity="info">
        Editing does not publish. Moving an active published show to trash immediately hides it.
        Restoring from trash restores only the draft; publishing is a separate admin action.
        Permanent deletion is restricted for 30 days and retains audit and release history.
      </Alert>
      {error && <Alert severity="error">{error} <Button onClick={reload}>Reload</Button></Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
        <Tabs value={view} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile
          onChange={(_, value: View) => { setView(value); setPage(1); setSearch(""); }}>
          <Tab value="active" label="Shows" />
          <Tab value="legacy" label="Recover existing" />
          <Tab value="trashed" label="Trash" />
        </Tabs>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<RefreshCw size={16} />} onClick={reload}>Refresh</Button>
          {view === "active" && <Button variant="contained" startIcon={<Plus size={17}/>}
            onClick={create}>Create show</Button>}
        </Stack>
      </Stack>
      <Divider />
      {view !== "legacy" && <TextField
        placeholder="Search shows by title or schedule"
        aria-label="Search Website shows"
        value={search}
        onChange={event => { setSearch(event.target.value); setPage(1); }}
        sx={{ maxWidth: 440 }}
        slotProps={{ input: { startAdornment:
          <InputAdornment position="start"><Search size={17}/></InputAdornment>,
        } }}
      />}
      {view === "legacy" ? (
        legacy.isPending ? <CircularProgress /> : legacy.error ? (
          <Alert severity="error">{message(legacy.error)}</Alert>
        ) : (
          <Stack spacing={2}>
            {legacy.data?.warnings.map(warning => <Alert key={warning} severity="warning">{warning}</Alert>)}
            <Typography color="text.secondary">
              {legacy.data?.items.length ?? 0} posters found in Firebase Storage /web-programation.
              Importing creates a private draft and never publishes it.
            </Typography>
            {legacy.data?.items.map((show: LegacyShow) => (
              <Paper variant="outlined" sx={{ p: 2 }} key={show.id}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                  <Box component="img" src={show.content.imageUrl} alt={show.content.title}
                    sx={{ width: 92, height: 92, objectFit: "cover" }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={800}>{show.content.title}</Typography>
                    <Typography color="text.secondary" variant="caption">
                      {show.content.schedule} · {show.objectPath}
                    </Typography>
                  </Box>
                  <Button disabled={busy} onClick={() => void execute(
                    () => importShow(show), "Legacy show recovered to private draft.",
                  )}>Recover as draft</Button>
                </Stack>
              </Paper>
            ))}
            {!legacy.data?.items.length && <Alert severity="info">No recoverable source posters found.</Alert>}
          </Stack>
        )
      ) : list.isPending ? <CircularProgress /> : list.error ? (
        <Alert severity="error">{message(list.error)}</Alert>
      ) : (
        <Stack spacing={2}>
          <Box sx={{
            display: "grid", gap: 2, minWidth: 0,
            gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))",
              md: "repeat(3,minmax(0,1fr))", lg: "repeat(4,minmax(0,1fr))",
              xl: "repeat(5,minmax(0,1fr))" },
          }}>
          {visibleShows.items.map(draft => (
            <ShowCard key={draft.id} draft={draft} isAdmin={isAdmin} busy={busy}
              edit={show => setEditor({
                id: show.id, revision: show.revision, content: show.content,
              })}
              action={perform} confirm={setConfirming} />
          ))}
          </Box>
          {!filteredShows.length && <Alert severity="info">
            {search ? "No shows match your search." : view === "trashed" ?
              "Trash is empty." : "No Website shows yet. Create or recover a show."}
          </Alert>}
          {visibleShows.pages > 1 && <Stack direction="row" justifyContent="space-between"
            alignItems="center" gap={2} flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">
              Showing {visibleShows.items.length} of {visibleShows.total} loaded shows
            </Typography>
            <Pagination count={visibleShows.pages} page={visibleShows.page}
              onChange={(_, next) => setPage(next)} color="primary" />
          </Stack>}
        </Stack>
      )}
      <ShowEditDialog editor={editor} close={() => setEditor(null)} save={save} busy={busy} />
      <Dialog open={Boolean(confirming)} onClose={() => !busy && setConfirming(null)}>
        <DialogTitle>{confirming?.action === "purge" ? "Delete permanently?" :
          confirming?.action === "trash" ? "Move show to trash?" : "Unpublish show?"}</DialogTitle>
        <DialogContent>
          <Typography>
            {confirming?.action === "purge" ?
              "Only shows kept in trash for at least 30 days can be deleted permanently. Old releases and audit records remain." :
              confirming?.action === "trash" ?
              "This removes the show from the public Website immediately. You may restore its private draft later." :
              "This removes the selected show from the public Website but preserves its draft."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setConfirming(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={confirmAction}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
