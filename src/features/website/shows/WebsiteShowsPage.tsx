import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Paper, Stack, Tab, Tabs, TextField, Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Plus, RefreshCw, Rocket, Trash2, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "../../../api/errors";
import { useStaff } from "../../auth/StaffGate";
import {
  importShow, legacyShows, listShows, purgeShow, saveShow, showAction, showHistory,
  showKeys, showPublication, type LegacyShow, type ShowContent, type ShowDraft,
} from "./api";
import { ShowPosterField } from "./ShowPosterField";

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

function ShowRow({ draft, isAdmin, busy, edit, action, confirm }: {
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
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ sm: "center" }}>
        <Box component="img" src={draft.content.imageUrl} alt={draft.content.title}
          sx={{ width: 100, aspectRatio: "1", objectFit: "cover", borderRadius: 1 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={800}>{draft.content.title}</Typography>
          <Typography variant="caption" color="text.secondary">
            {draft.content.schedule || "Schedule not set"} · Order {draft.content.position}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
            <Chip size="small" label={inTrash ? "IN TRASH" :
              published ? "PUBLISHED" : "UNPUBLISHED"}
              color={inTrash ? "warning" : published ? "success" : "default"} />
            <Chip size="small" label={`Draft revision ${draft.revision}`} />
            {published && needsPublish && <Chip size="small" color="warning" label="UNPUBLISHED CHANGES" />}
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
          {inTrash ? (
            <>
              <Button startIcon={<Undo2 size={15} />} disabled={busy}
                onClick={() => action(draft.id, "restore", draft.revision)}>Restore draft</Button>
              {isAdmin && <Button color="error" disabled={busy}
                onClick={() => confirm({ id: draft.id, revision: draft.revision, action: "purge" })}>
                Delete permanently
              </Button>}
            </>
          ) : (
            <>
              <Button disabled={busy} onClick={() => edit(draft)}>Edit</Button>
              {isAdmin && <Button startIcon={<Rocket size={15} />} variant="contained"
                disabled={busy || !needsPublish}
                onClick={() => action(draft.id, "publish", draft.revision)}>Publish</Button>}
              {isAdmin && published && <Button disabled={busy}
                onClick={() => confirm({
                  id: draft.id, revision: publication.data?.revision ?? 0, action: "unpublish",
                })}>Unpublish</Button>}
              {isAdmin && <Button startIcon={<Trash2 size={15} />} color="error"
                disabled={busy}
                onClick={() => confirm({ id: draft.id, revision: draft.revision, action: "trash" })}>
                Move to trash
              </Button>}
            </>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

export function WebsiteShowsPage() {
  const staff = useStaff();
  const isAdmin = staff.roles.includes("admin");
  const client = useQueryClient();
  const [view, setView] = useState<View>("active");
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
  const knownIds = new Set(list.data?.items.map(show => show.id) ?? []);

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
        <Tabs value={view} onChange={(_, value: View) => setView(value)}>
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
          {list.data?.items.map(draft => (
            <ShowRow key={draft.id} draft={draft} isAdmin={isAdmin} busy={busy}
              edit={show => setEditor({
                id: show.id, revision: show.revision, content: show.content,
              })}
              action={perform} confirm={setConfirming} />
          ))}
          {!list.data?.items.length && <Alert severity="info">
            {view === "trashed" ? "Trash is empty." : "No Website shows yet. Create or recover a show."}
          </Alert>}
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
