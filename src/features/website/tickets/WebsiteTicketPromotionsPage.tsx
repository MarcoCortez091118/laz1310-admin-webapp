import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Rocket, Trash2, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "../../../api/errors";
import { useStaff } from "../../auth/StaffGate";
import {
  importPromotion, legacyPromotions, listPromotions, purgePromotion, savePromotion, promotionAction,
  promotionKeys, promotionPublication, type LegacyPromotion, type PromotionContent, type PromotionDraft,
} from "./api";
import { PromotionArtworkField } from "./PromotionArtworkField";

type View = "active" | "trashed" | "legacy";
type Editor = { id: string; revision: number; content: PromotionContent };
type Confirmation = { id: string; revision: number; action: "trash" | "purge" | "unpublish" };

const NEW_CONTENT: PromotionContent = {
  webUrl: "", mobileUrl: "", actionType: "formulario", linkUrl: null,
  eventName: "", position: 0,
};

function message(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "The show was changed by another editor. Reload it before retrying.";
  }
  return error instanceof Error ? error.message : "Operation failed.";
}

function PromotionEditDialog({ editor, close, save, busy }: {
  editor: Editor | null; close: () => void;
  save: (value: PromotionContent) => void; busy: boolean;
}) {
  const [content, setContent] = useState<PromotionContent>(NEW_CONTENT);
  useEffect(() => { if (editor) setContent(editor.content); }, [editor]);
  const valid = (content.webUrl.startsWith("https://") || content.mobileUrl.startsWith("https://")) &&
    (content.actionType !== "enlace" || Boolean(content.linkUrl?.startsWith("https://"))) &&
    Number.isInteger(content.position) && content.position >= 0;

  return (
    <Dialog open={Boolean(editor)} onClose={busy ? undefined : close} fullWidth maxWidth="sm">
      <DialogTitle>{editor?.revision === 0 ? "Create Website promotion" : "Edit Website promotion draft"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info">Saving a draft does not publish it. Registration forms and n8n remain unchanged.</Alert>
          <TextField label="Event name" value={content.eventName} fullWidth
            onChange={e => setContent(v => ({ ...v, eventName: e.target.value }))} />
          <TextField label="Order (0 first)" type="number" value={content.position}
            onChange={e => setContent(v => ({ ...v, position: Number(e.target.value) }))} />
          <TextField select label="Action" value={content.actionType}
            onChange={e => setContent(v => ({ ...v, actionType: e.target.value as PromotionContent["actionType"] }))}>
            <MenuItem value="formulario">Participation form</MenuItem>
            <MenuItem value="enlace">External HTTPS link</MenuItem>
          </TextField>
          {content.actionType === "enlace" && <TextField label="HTTPS destination" value={content.linkUrl ?? ""}
            fullWidth required onChange={e => setContent(v => ({ ...v, linkUrl: e.target.value.trim() || null }))} />}
          <Typography fontWeight={700}>Desktop image</Typography>
          <PromotionArtworkField title={content.eventName || "Desktop promotion"} url={content.webUrl}
            onChange={url => setContent(v => ({ ...v, webUrl: url }))} />
          <TextField label="Desktop image URL" value={content.webUrl} fullWidth
            onChange={e => setContent(v => ({ ...v, webUrl: e.target.value.trim() }))} />
          <Typography fontWeight={700}>Mobile image</Typography>
          <PromotionArtworkField title={content.eventName || "Mobile promotion"} url={content.mobileUrl}
            onChange={url => setContent(v => ({ ...v, mobileUrl: url }))} />
          <TextField label="Mobile image URL" value={content.mobileUrl} fullWidth
            onChange={e => setContent(v => ({ ...v, mobileUrl: e.target.value.trim() }))} />
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

function PromotionRow({ draft, isAdmin, busy, edit, action, confirm }: {
  draft: PromotionDraft; isAdmin: boolean; busy: boolean;
  edit: (show: PromotionDraft) => void;
  action: (id: string, action: "publish" | "restore", revision: number) => void;
  confirm: (value: Confirmation) => void;
}) {
  const publication = useQuery({
    queryKey: promotionKeys.publication(draft.id),
    queryFn: async () => (await promotionPublication(draft.id)).data,
    retry: false, enabled: draft.state === "active",
  });
  const published = publication.data?.status === "published";
  const needsPublish = !published || publication.data?.draftRevision !== draft.revision;
  const inTrash = draft.state === "trashed";
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ sm: "center" }}>
        <Box component="img" src={(draft.content.webUrl || draft.content.mobileUrl)} alt={draft.content.eventName}
          sx={{ width: 100, aspectRatio: "1", objectFit: "cover", borderRadius: 1 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={800}>{draft.content.eventName}</Typography>
          <Typography variant="caption" color="text.secondary">
            {draft.content.actionType || "Schedule not set"} · Order {draft.content.position}
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

export function WebsiteTicketPromotionsPage() {
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
    queryKey: promotionKeys.list(view),
    queryFn: async () => (await listPromotions(view === "trashed" ? "trashed" : "active")).data,
    enabled: view !== "legacy", retry: false,
  });
  const legacy = useQuery({
    queryKey: promotionKeys.legacy, queryFn: async () => (await legacyPromotions()).data,
    enabled: view === "legacy", retry: false,
  });

  function reload() {
    void client.invalidateQueries({ queryKey: ["website", "promotions"] });
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

  function save(content: PromotionContent) {
    if (!editor) return;
    void execute(() => savePromotion(editor.id, editor.revision, content), "Promotion draft saved. Publish separately.");
  }

  function perform(id: string, action: "publish" | "restore", revision: number) {
    void execute(() => promotionAction(id, action, revision),
      action === "publish" ? "Promotion published." : "Promotion restored as a draft (not published).");
  }

  function confirmAction() {
    if (!confirming) return;
    const { id, revision, action } = confirming;
    void execute(() => action === "purge" ? purgePromotion(id, revision) :
      promotionAction(id, action, revision),
      action === "trash" ? "Moved to trash and unpublished." :
      action === "purge" ? "Promotion draft deleted permanently; audit and releases retained." :
      "Show removed from public Website.");
  }

  return (
    <section className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">Website / Editorial</p>
        <h1>Website Ticket Promotions</h1>
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
          <Tab value="active" label="Promotions" />
          <Tab value="legacy" label="Recover existing" />
          <Tab value="trashed" label="Trash" />
        </Tabs>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<RefreshCw size={16} />} onClick={reload}>Refresh</Button>
          {view === "active" && <Button variant="contained" startIcon={<Plus size={17}/>}
            onClick={create}>Create promotion</Button>}
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
              {legacy.data?.items.length ?? 0} promotional slides found in the legacy Firestore settings/tickets document.
              Importing creates a private draft and never publishes it.
            </Typography>
            {legacy.data?.items.map((show: LegacyPromotion) => (
              <Paper variant="outlined" sx={{ p: 2 }} key={show.id}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                  <Box component="img" src={(show.content.webUrl || show.content.mobileUrl)} alt={show.content.eventName}
                    sx={{ width: 92, height: 92, objectFit: "cover" }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={800}>{show.content.eventName}</Typography>
                    <Typography color="text.secondary" variant="caption">
                      {show.content.actionType} · {show.id}
                    </Typography>
                  </Box>
                  <Button disabled={busy} onClick={() => void execute(
                    () => importPromotion(show), "Legacy show recovered to private draft.",
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
            <PromotionRow key={draft.id} draft={draft} isAdmin={isAdmin} busy={busy}
              edit={show => setEditor({
                id: show.id, revision: show.revision, content: show.content,
              })}
              action={perform} confirm={setConfirming} />
          ))}
          {!list.data?.items.length && <Alert severity="info">
            {view === "trashed" ? "Trash is empty." : "No Website promotions yet. Create or recover a show."}
          </Alert>}
        </Stack>
      )}
      <PromotionEditDialog editor={editor} close={() => setEditor(null)} save={save} busy={busy} />
      <Dialog open={Boolean(confirming)} onClose={() => !busy && setConfirming(null)}>
        <DialogTitle>{confirming?.action === "purge" ? "Delete promotion permanently?" :
          confirming?.action === "trash" ? "Move promotion to trash?" : "Unpublish show?"}</DialogTitle>
        <DialogContent>
          <Typography>
            {confirming?.action === "purge" ?
              "Only promotions kept in trash for at least 30 days can be deleted permanently. Old releases and audit records remain." :
              confirming?.action === "trash" ?
              "This removes the promotion from the public Website immediately. You may restore its private draft later." :
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
