import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControlLabel, Paper, Stack,
  Switch, Tab, Tabs, TextField, Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Rocket, Save, Undo2 } from "lucide-react";
import { ArtworkPreview } from "../ArtworkPreview";
import { useEffect, useState } from "react";
import { ApiError } from "../../../api/errors";
import { WebsiteBannerMediaControls } from "./WebsiteBannerMediaControls";
import { useStaff } from "../../auth/StaffGate";
import {
  importLegacyBanners, publishBannerDraft, readBannerDraft, readBannerPublication,
  readBannerReleases, readLegacyBanners, rollbackBannerRelease, saveBannerDraft,
  websiteBannerKeys, type WebsiteBanner, type WebsiteBannerContent,
} from "./api";

type Layout = "desktop" | "mobile";
type EditorState = { layout: Layout; index: number; value: WebsiteBanner };
const EMPTY: WebsiteBannerContent = { desktop: [], mobile: [] };

function missing<T>(load: () => Promise<{ data: T }>): Promise<T | null> {
  return load().then((result) => result.data).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });
}

function draftChanges(content: WebsiteBannerContent, saved: WebsiteBannerContent): boolean {
  return JSON.stringify(content) !== JSON.stringify(saved);
}

function bannerEditorInitial(): WebsiteBanner {
  return { id: crypto.randomUUID(), url: "", linkUrl: null, active: true };
}

function BannerEditorDialog({
  editor, onClose, onCommit,
}: {
  editor: EditorState | null;
  onClose: () => void;
  onCommit: (value: WebsiteBanner) => void;
}) {
  const [value, setValue] = useState<WebsiteBanner>(editor?.value ?? bannerEditorInitial());
  useEffect(() => {
    if (editor) setValue(editor.value);
  }, [editor]);
  const valid = value.url.startsWith("https://") &&
    (!value.linkUrl || value.linkUrl.startsWith("https://")) && value.id.length > 0;

  return (
    <Dialog open={Boolean(editor)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editor?.index === -1 ? "Add Website banner" : "Edit Website banner"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {editor?.layout === "desktop" ? "Desktop website" : "Mobile website layout"} ·
            artwork is uploaded to an isolated Website media namespace.
          </Typography>
          <WebsiteBannerMediaControls
            description={editor?.layout === "desktop" ? "LA Z Website desktop banner" : "LA Z Website mobile banner"}
            onChoose={(url) => setValue((current) => ({ ...current, url }))}
          />
          <TextField label="Direct HTTPS image URL" value={value.url} fullWidth required
            onChange={(event) => setValue((current) => ({ ...current, url: event.target.value.trim() }))}
            helperText="Use an existing public image or managed Website asset URL." />
          <TextField label="Destination URL (optional)" value={value.linkUrl ?? ""} fullWidth
            onChange={(event) => setValue((current) => ({
              ...current, linkUrl: event.target.value.trim() || null,
            }))}
            helperText="HTTPS only. Leave empty for an image without a clickable link." />
          <FormControlLabel label="Active in this Website layout"
            control={<Switch checked={value.active}
              onChange={(event) => setValue((current) => ({ ...current, active: event.target.checked }))} />} />
          {value.url.startsWith("https://") && (
            <ArtworkPreview src={value.url} alt="Draft artwork preview"
              shape={editor?.layout === "mobile" ? "portrait" : "landscape"} />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!valid} onClick={() => onCommit(value)}>
          Apply to draft
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function WebsiteBannersPage() {
  const queryClient = useQueryClient();
  const staff = useStaff();
  const isAdmin = staff.roles.includes("admin");
  const [layout, setLayout] = useState<Layout>("desktop");
  const [working, setWorking] = useState<WebsiteBannerContent>(EMPTY);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [rollbackId, setRollbackId] = useState<string | null>(null);

  const draft = useQuery({
    queryKey: websiteBannerKeys.draft,
    queryFn: () => missing(readBannerDraft),
    retry: false, refetchOnWindowFocus: false,
  });
  const legacy = useQuery({
    queryKey: websiteBannerKeys.legacy,
    queryFn: async () => (await readLegacyBanners()).data,
    retry: false,
  });
  const published = useQuery({
    queryKey: websiteBannerKeys.publication,
    queryFn: () => missing(readBannerPublication),
    retry: false,
  });
  const releases = useQuery({
    queryKey: websiteBannerKeys.releases,
    queryFn: () => missing(readBannerReleases),
    enabled: Boolean(published.data),
    retry: false,
  });
  useEffect(() => {
    if (draft.data !== undefined) setWorking(draft.data?.content ?? EMPTY);
  }, [draft.data]);
  const original = draft.data?.content ?? EMPTY;
  const changed = draftChanges(working, original);
  const revision = draft.data?.revision ?? 0;
  const legacyRequiresImport = !draft.data && Boolean(legacy.data?.sourceExists);

  function reload() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "website", "banners"] });
  }

  const importMutation = useMutation({
    mutationFn: () => importLegacyBanners(legacy.data?.fingerprint ?? ""),
    onSuccess: reload,
  });
  const saveMutation = useMutation({
    mutationFn: () => saveBannerDraft(revision, working),
    onSuccess: reload,
  });
  const publishMutation = useMutation({
    mutationFn: () => publishBannerDraft(revision),
    onSuccess: reload,
  });
  const rollbackMutation = useMutation({
    mutationFn: (releaseId: string) =>
      rollbackBannerRelease(published.data?.revision ?? 0, releaseId),
    onSuccess: () => { setRollbackId(null); reload(); },
  });
  const mutations = [importMutation, saveMutation, publishMutation, rollbackMutation];
  const busy = mutations.some((item) => item.isPending);
  const actionError = mutations.find((item) => item.error)?.error;
  const conflict = actionError instanceof ApiError && actionError.status === 409;

  function replaceAt(index: number, value: WebsiteBanner) {
    setWorking((current) => {
      const slides = [...current[layout]];
      if (index < 0) slides.push(value);
      else slides[index] = value;
      return { ...current, [layout]: slides };
    });
  }

  function move(index: number, distance: number) {
    setWorking((current) => {
      const slides = [...current[layout]];
      const target = index + distance;
      if (target < 0 || target >= slides.length) return current;
      const [item] = slides.splice(index, 1);
      if (!item) return current;
      slides.splice(target, 0, item);
      return { ...current, [layout]: slides };
    });
  }

  const disabled = draft.isPending || legacy.isPending || busy;
  const cards = working[layout];

  return (
    <section className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">Website / Content</p>
        <h1>Website Banners</h1>
        <p className="muted">
          Manage the laz1310.com hero carousel. Desktop and mobile here mean
          responsive WEBSITE layouts — not the native LA Z Mobile app.
        </p>
      </header>
      <Alert severity="info">
        Changes first save as a Website draft. Only an administrator can publish or
        roll back. The public Website stays on its existing banner source until
        the separate approved API canary is deployed.
      </Alert>
      {draft.isPending || legacy.isPending ? (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} /> <Typography>Loading Website banner inventory…</Typography>
        </Stack>
      ) : draft.error || legacy.error ? (
        <Alert severity="error">
          Unable to load Website Banners: {String(draft.error ?? legacy.error)}
          <Button onClick={reload}>Retry</Button>
        </Alert>
      ) : (
        <>
          {legacy.data?.warnings.map((warning) => (
            <Alert key={warning} severity="warning">{warning}</Alert>
          ))}
          {legacyRequiresImport && (
            <Alert severity="warning" action={<Button disabled={busy || !isAdmin ||
              !legacy.data?.fingerprint}
              onClick={() => importMutation.mutate()}>Review &amp; import</Button>}>
              Existing banners were detected in settings/banners. Import them
              before making editorial changes; their original document will not be modified.
              {legacy.data?.fingerprint ? ` Fingerprint: ${legacy.data.fingerprint.slice(0, 12)}…` : ""}
              {!isAdmin ? " Only administrators can approve this import." : ""}
            </Alert>
          )}
          {!legacyRequiresImport && !draft.data && (
            <Alert severity="info">
              No editable Website banner draft exists yet. New artwork can be
              entered below; verify old Storage fallback assets before first publication.
            </Alert>
          )}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" color={changed ? "warning" : "default"}
                  label={changed ? "UNSAVED CHANGES" : `DRAFT #${revision}`} />
                <Chip size="small" color={published.data ? "success" : "default"}
                  label={published.data ? `LIVE #${published.data.revision}` : "NOT PUBLISHED"} />
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button startIcon={<Save size={16} />} disabled={disabled || !changed || legacyRequiresImport}
                  onClick={() => saveMutation.mutate()}>Save draft</Button>
                <Button variant="contained" startIcon={<Rocket size={16} />}
                  disabled={disabled || !isAdmin || changed || !draft.data ||
                    published.data?.draftRevision === revision || Boolean(draft.error)}
                  onClick={() => publishMutation.mutate()}>Publish Website banners</Button>
              </Stack>
            </Stack>
            <Divider sx={{ my: 2 }} />
            {actionError && (
              <Alert severity={conflict ? "warning" : "error"} sx={{ mb: 2 }}>
                {actionError instanceof Error ? actionError.message : "Action failed."}
                {conflict ? " Reload current revisions before retrying." : ""}
                <Button onClick={reload}>Reload</Button>
              </Alert>
            )}
            <Tabs value={layout} variant="scrollable" allowScrollButtonsMobile scrollButtons="auto"
              onChange={(_, next: Layout) => setLayout(next)}>
              <Tab label={`Desktop website (${working.desktop.length})`} value="desktop" />
              <Tab label={`Mobile website (${working.mobile.length})`} value="mobile" />
            </Tabs>
            <Box sx={{
              display: "grid",
              gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(2,minmax(0,1fr))", xl: "repeat(3,minmax(0,1fr))" },
              gap: 2,
              mt: 2,
              minWidth: 0,
            }}>
              {cards.map((card, index) => (
                <Paper variant="outlined" key={card.id} sx={{
                  p: 1.5, borderRadius: 3, minWidth: 0, overflow: "hidden",
                  display: "flex", flexDirection: "column", gap: 1.5,
                }}>
                  <ArtworkPreview
                    src={card.url}
                    alt={`Website ${layout} banner ${index + 1}`}
                    shape={layout === "mobile" ? "portrait" : "landscape"}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                      <Typography fontWeight={800} noWrap sx={{ minWidth: 0 }}>
                        Banner {index + 1}
                      </Typography>
                      <Chip size="small" label={card.active ? "Active" : "Hidden"}
                        color={card.active ? "success" : "default"} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{
                      display: "block", mt: .75, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
                    }} title={card.linkUrl || "No destination link"}>
                      {card.linkUrl || "No destination link"}
                    </Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" gap={.75}
                    flexWrap="wrap" justifyContent="space-between">
                    <Stack direction="row" spacing={0}>
                      <Button size="small" aria-label={`Move banner ${index + 1} up`}
                        disabled={disabled || index === 0}
                        onClick={() => move(index, -1)}><ArrowUp size={17} /></Button>
                      <Button size="small" aria-label={`Move banner ${index + 1} down`}
                        disabled={disabled || index === cards.length - 1}
                        onClick={() => move(index, 1)}><ArrowDown size={17} /></Button>
                    </Stack>
                    <Stack direction="row" spacing={.5}>
                      <Button size="small" variant="outlined" disabled={disabled}
                        onClick={() => setEditor({ layout, index, value: card })}>Edit</Button>
                      <Button size="small" color="error" disabled={disabled}
                        onClick={() => setWorking((current) => ({
                          ...current, [layout]: current[layout].filter((_, i) => i !== index),
                        }))}>Remove</Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Box>
            <Stack spacing={1.25} sx={{ mt: 2 }}>
              {cards.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No {layout} banners in this draft.
                </Typography>
              )}
              <Button variant="outlined" startIcon={<Plus size={16} />}
                disabled={disabled || cards.length >= 40 || legacyRequiresImport}
                onClick={() => setEditor({ layout, index: -1, value: bannerEditorInitial() })}>
                Add {layout} banner
              </Button>
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>Website release history</Typography>
            {published.isPending ? <CircularProgress size={20} /> : published.error ? (
              <Alert severity="error">{String(published.error)}</Alert>
            ) : !published.data ? (
              <Typography color="text.secondary">No Website banners published yet.</Typography>
            ) : releases.data?.items.map((item) => (
              <Stack key={item.releaseId} direction="row" alignItems="center"
                justifyContent="space-between" spacing={1} sx={{ py: 1 }}>
                <Typography variant="body2">
                  Release #{item.revision} · {item.action} · {new Date(item.publishedAt).toLocaleString()}
                </Typography>
                <Button size="small" startIcon={<Undo2 size={15} />}
                  disabled={!isAdmin || busy || changed || item.releaseId === published.data?.releaseId}
                  onClick={() => setRollbackId(item.releaseId)}>Restore</Button>
              </Stack>
            ))}
            {releases.error && <Alert severity="error">{String(releases.error)}</Alert>}
          </Paper>
        </>
      )}
      <BannerEditorDialog editor={editor} onClose={() => setEditor(null)}
        onCommit={(value) => {
          if (editor) {
            replaceAt(editor.index, value);
            setEditor(null);
          }
        }} />
      <Dialog open={Boolean(rollbackId)} onClose={() => setRollbackId(null)}>
        <DialogTitle>Restore earlier Website banners?</DialogTitle>
        <DialogContent>
          This creates a new immutable Website release. It will not alter the native Mobile app.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackId(null)}>Cancel</Button>
          <Button variant="contained" disabled={busy || !rollbackId}
            onClick={() => { if (rollbackId) rollbackMutation.mutate(rollbackId); }}>
            Confirm rollback
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
