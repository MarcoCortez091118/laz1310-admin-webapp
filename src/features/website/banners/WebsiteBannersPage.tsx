import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControlLabel, Paper, Stack,
  Switch, Tab, Tabs, TextField, Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Rocket, Save, Undo2 } from "lucide-react";
import { ArtworkPreview } from "../ArtworkPreview";
import { EditorialFormSteps } from "../EditorialFormSteps";
import { bannerInfoValid, bannerArtworkValid } from "../editorialValidation";
import { useEffect, useState } from "react";
import { ApiError } from "../../../api/errors";
import { WebsiteBannerMediaControls } from "./WebsiteBannerMediaControls";
import { PlacementEditorFields, websiteScheduleValid } from "../campaigns/PlacementEditorFields";
import { useStaff } from "../../auth/StaffGate";
import {
  importLegacyBanners, publishBannerDraft, readBannerDraft, readBannerPublication,
  readBannerReleases, readLegacyBanners, rollbackBannerRelease, saveBannerDraft,
  reconcileBannerDraft, websiteBannerKeys, type WebsiteBanner, type WebsiteBannerContent,
  type LegacyBannerDecision,
  readBannerTrash, trashBannerFromDraft, restoreBannerFromTrash, websiteBannerTrashKey,
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
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (editor) { setValue(editor.value); setStep(0); }
  }, [editor]);
  const infoValid = bannerInfoValid(value) && websiteScheduleValid(value);
  const artworkValid = bannerArtworkValid(value);
  const valid = infoValid && artworkValid;

  return <Dialog open={Boolean(editor)} onClose={onClose} fullWidth maxWidth="md"
    aria-labelledby="banner-editor-title"
    slotProps={{ paper: { sx: { maxHeight: "calc(100dvh - 24px)", m: 1 } } }}>
    <DialogTitle id="banner-editor-title">
      {editor?.index === -1 ? "Add Website banner" : "Edit Website banner"}
    </DialogTitle>
    <DialogContent dividers sx={{ minWidth: 0 }}>
      <EditorialFormSteps active={step}/>
      {step === 0 && <Stack spacing={2} sx={{ mt: 2 }}>
        <Typography fontWeight={800}>Banner settings</Typography>
        <Alert severity="info">
          Artwork is managed independently for Website desktop and mobile layouts.
        </Alert>
        <TextField label="Optional HTTPS destination" value={value.linkUrl ?? ""} fullWidth
          onChange={event => setValue(current => ({
            ...current, linkUrl: event.target.value.trim() || null,
          }))} helperText="Leave blank when the banner is not clickable."/>
        <FormControlLabel label="Active on this Website layout"
          control={<Switch checked={value.active}
            onChange={event => setValue(current => ({ ...current, active: event.target.checked }))}/>} />
        <PlacementEditorFields value={value}
          onChange={patch => setValue(current => ({ ...current, ...patch }))} />
      </Stack>}
      {step === 1 && <Stack spacing={2} sx={{ mt: 2 }}>
        <Typography fontWeight={800}>
          {editor?.layout === "desktop" ? "Desktop artwork" : "Mobile artwork"}
        </Typography>
        <WebsiteBannerMediaControls
          description={editor?.layout === "desktop"
            ? "LA Z Website desktop banner" : "LA Z Website mobile banner"}
          currentUrl={value.url}
          onChoose={url => setValue(current => ({ ...current, url }))}/>
        <TextField label="HTTPS image URL" value={value.url} fullWidth required
          onChange={event => setValue(current => ({ ...current, url: event.target.value.trim() }))}
          helperText="Upload new artwork or choose an existing image in Website Banners."/>
      </Stack>}
      {step === 2 && <Stack spacing={2} sx={{ mt: 2 }}>
        <Alert severity="info">
          Applying only updates the unsaved editor state. Use Save draft on the
          Banners page before publishing separately.
        </Alert>
        <ArtworkPreview src={value.url} alt="Banner preview"
          shape={editor?.layout === "mobile" ? "portrait" : "landscape"}/>
        <Typography variant="body2">Layout: {editor?.layout || "Website"}</Typography>
        <Typography variant="body2">Visibility: {value.active ? "Active" : "Hidden"}</Typography>
        <Typography variant="body2">Sections: {(value.placements ?? ["home"]).join(", ")}</Typography>
        <Typography variant="body2">Dates: {value.startsAt ?? "Always"} — {value.endsAt ?? "Always"}</Typography>
        <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
          Destination: {value.linkUrl || "No destination"}
        </Typography>
      </Stack>}
    </DialogContent>
    <DialogActions sx={{ flexWrap: "wrap" }}>
      <Button onClick={onClose}>Cancel</Button>
      {step > 0 && <Button onClick={() => setStep(n => n - 1)}>Back</Button>}
      {step < 2 ? <Button variant="contained"
        disabled={step === 0 ? !infoValid : !artworkValid}
        onClick={() => setStep(n => n + 1)}>Continue</Button> :
        <Button variant="contained" disabled={!valid} onClick={() => onCommit(value)}>
          Apply to draft
        </Button>}
    </DialogActions>
  </Dialog>;
}

export function WebsiteBannersPage() {
  const queryClient = useQueryClient();
  const staff = useStaff();
  const isAdmin = staff.roles.includes("admin");
  const [layout, setLayout] = useState<Layout>("desktop");
  const [pane, setPane] = useState<"published" | "draft" | "trash" | "legacy">("published");
  const [working, setWorking] = useState<WebsiteBannerContent>(EMPTY);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [rollbackId, setRollbackId] = useState<string | null>(null);
  const [trashCandidate, setTrashCandidate] = useState<{layout: Layout; bannerId: string} | null>(null);
  const [legacyActions, setLegacyActions] = useState<Record<string, "draft" | "trash">>({});

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
  const archived = useQuery({
    queryKey: websiteBannerTrashKey,
    queryFn: async () => (await readBannerTrash()).data.items,
    enabled: pane === "trash",
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
  // A legacy-origin draft must match its original Firestore document exactly.
  // Editing or saving the draft does NOT refresh its origin fingerprint.
  const legacyConflict = Boolean(draft.data && legacy.data && (
    draft.data.origin === "legacy"
      ? !legacy.data.sourceExists ||
        legacy.data.fingerprint !== draft.data.legacyFingerprint
      : legacy.data.sourceExists
  ));
  const requiresReconciliation = Boolean(legacyRequiresImport || legacyConflict);
  const invalidEntries = legacy.data?.invalidEntries ?? [];
  const allDecided = invalidEntries.every(
    issue => legacyActions[`${issue.layout}:${issue.index}`] !== undefined
  );

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
  const reconcileMutation = useMutation({
    mutationFn: () => {
      if (!legacy.data?.fingerprint || !allDecided) {
        throw new Error("Choose Draft or Trash for each invalid legacy banner.");
      }
      const decisions: LegacyBannerDecision[] = invalidEntries.map(issue => ({
        layout: issue.layout,
        index: issue.index,
        action: legacyActions[`${issue.layout}:${issue.index}`]!,
      }));
      return reconcileBannerDraft(revision, legacy.data.fingerprint, decisions);
    },
    onSuccess: () => { setLegacyActions({}); reload(); },
  });
  const publishMutation = useMutation({
    mutationFn: () => publishBannerDraft(revision),
    onSuccess: () => { reload(); setPane("published"); },
  });
  const trashMutation = useMutation({
    mutationFn: (item: {layout: Layout; bannerId: string}) =>
      trashBannerFromDraft(revision, item.layout, item.bannerId),
    onSuccess: () => { setTrashCandidate(null); reload(); },
  });
  const restoreMutation = useMutation({
    mutationFn: (trashId: string) => restoreBannerFromTrash(revision, trashId),
    onSuccess: () => { reload(); setPane("draft"); },
  });
  const rollbackMutation = useMutation({
    mutationFn: (releaseId: string) =>
      rollbackBannerRelease(published.data?.revision ?? 0, releaseId),
    onSuccess: () => { setRollbackId(null); reload(); },
  });
  const mutations = [importMutation, saveMutation, publishMutation, rollbackMutation, reconcileMutation, trashMutation, restoreMutation];
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
      <Tabs value={pane} onChange={(_, value: typeof pane) => setPane(value)}
        variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile
        aria-label="Website banner management">
        <Tab value="published" label="Publicados"/>
        <Tab value="draft" label="Borradores"/>
        <Tab value="trash" label="Papelera"/>
        <Tab value="legacy" label="Heredados"/>
      </Tabs>
      {pane === "published" && <Alert severity="info">
        Publicado en FastAPI no significa visible en laz1310.com hasta que
        el Website utilice el lector de publicaciones aprobadas. Active solo
        habilita el banner dentro de esa revisión.
      </Alert>}
      {pane === "draft" && <Alert severity="info">
        Edita aquí, guarda el borrador y publica una revisión.
        El sitio cambiará solamente al consumir esa publicación.
      </Alert>}
      {pane === "trash" && <Alert severity="info">
        Los banners de esta papelera se pueden restaurar. Los cambios del
        borrador no afectan la publicación actual hasta publicar otra revisión.
      </Alert>}
      {pane === "legacy" && <Alert severity="info">
        Inventario histórico de migración. No forma parte de los banners publicados.
      </Alert>}
      {draft.isPending || (pane === "legacy" && legacy.isPending) ? (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} /> <Typography>Loading Website banner inventory…</Typography>
        </Stack>
      ) : draft.error || (pane === "legacy" && legacy.error) ? (
        <Alert severity="error">
          Unable to load Website Banners: {String(draft.error ?? legacy.error)}
          <Button onClick={reload}>Retry</Button>
        </Alert>
      ) : (
        <>
          {pane === "legacy" && legacy.data?.warnings.map((warning) => (
            <Alert key={warning} severity="warning">{warning}</Alert>
          ))}
          {pane === "legacy" && legacyConflict && draft.data && (
            <Alert severity="error">
              <Typography fontWeight={750} sx={{ mb: .5 }}>
                The legacy banners have changed since this draft was imported.
              </Typography>
              <Typography variant="body2">
                We found changes in the older banner source. You can resolve them
                directly here: choose Draft or Trash for the items below, then
                select Sync to draft. Your existing draft and banners stay intact.
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mt: 1, overflowWrap: "anywhere" }}>
                Imported fingerprint: {(draft.data.legacyFingerprint ?? "none").slice(0, 12)}…
                {" · "}Current source: {(legacy.data?.fingerprint ?? "missing").slice(0, 12)}…
                {" · "}Current source importable: {legacy.data?.importable ? "yes" : "no"}
              </Typography>
              <Button size="small" onClick={reload} sx={{ mt: 1 }}>Reload inventory</Button>
            </Alert>
          )}
          {pane === "legacy" && legacyRequiresImport && (
            <Alert severity="warning" action={<Button disabled={busy || !isAdmin ||
              !legacy.data?.fingerprint || legacy.data?.importable !== true}
              onClick={() => importMutation.mutate()}>Review &amp; import</Button>}>
              Existing banners were detected in settings/banners. Review the
              read-only inventory below before import; the original document will not be modified.
              {legacy.data?.fingerprint ? ` Fingerprint: ${legacy.data.fingerprint.slice(0, 12)}…` : ""}
              {legacy.data?.importable === false
                ? " Import is blocked: invalid entries or Storage-only banners require reconciliation."
                : ""}
              {!isAdmin ? " Only administrators can approve this import." : ""}
            </Alert>
          )}
          {pane === "legacy" && legacy.data?.content && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography fontWeight={800} sx={{ mb: 1 }}>
                Existing Website banners — read-only inventory
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These entries come from the current Firestore settings/banners document,
                not the saved draft. Compare this read-only inventory against the draft
                cards below before reconciling the source. No legacy asset is modified here.
              </Typography>
              {(["desktop", "mobile"] as const).map(responsive => (
                <Box key={responsive} sx={{ mb: 2 }}>
                  <Typography fontWeight={700} sx={{ mb: 1 }}>
                    {responsive === "desktop" ? "Desktop Website" : "Mobile Website"}
                    {": "}{legacy.data?.content?.[responsive].length ?? 0} valid previews
                  </Typography>
                  <Box sx={{
                    display: "grid", gap: 1.5,
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", lg: "repeat(3,minmax(0,1fr))" },
                  }}>
                    {(legacy.data?.content?.[responsive] ?? []).map((item, index) => (
                      <Paper key={item.id + index} variant="outlined" sx={{ p: 1, minWidth: 0 }}>
                        <ArtworkPreview src={item.url} alt={`Legacy ${responsive} banner ${index + 1}`}
                          shape={responsive === "desktop" ? "landscape" : "portrait"}/>
                        <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>
                          {item.linkUrl || "No destination link"}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              ))}
              {(legacy.data?.invalidEntries ?? []).length > 0 && (
                <Alert severity={requiresReconciliation ? "warning" : "info"}>
                  {requiresReconciliation
                    ? "These banners have invalid original links. Choose Draft to keep the image without the unsafe link, or Trash to archive it outside the next release."
                    : "These older banners contain invalid links; the current draft fingerprint is already synchronized."}
                </Alert>
              )}
              {(legacy.data?.invalidEntries ?? []).map(problem => (
                <Box key={problem.layout + problem.index} sx={{ p: 1.5, mt: 1, border: 1, borderColor: "error.main", borderRadius: 2 }}>
                  <Typography fontWeight={700}>
                    {problem.layout}[{problem.index}]: {problem.reason}
                  </Typography>
                  {problem.previewUrl && (
                    <ArtworkPreview src={problem.previewUrl}
                      alt={`Legacy ${problem.layout} banner needing review`}
                      shape={problem.layout === "web" ? "landscape" : "portrait"}/>
                  )}
                  {requiresReconciliation && (
                    <Stack direction="row" gap={1} sx={{ mt: 1 }}>
                      <Button size="small"
                        variant={legacyActions[`${problem.layout}:${problem.index}`] === "draft" ? "contained" : "outlined"}
                        disabled={busy || !problem.previewUrl}
                        onClick={() => setLegacyActions(old => ({
                          ...old, [`${problem.layout}:${problem.index}`]: "draft",
                        }))}>
                        Add to Draft
                      </Button>
                      <Button size="small" color="warning"
                        variant={legacyActions[`${problem.layout}:${problem.index}`] === "trash" ? "contained" : "outlined"}
                        disabled={busy}
                        onClick={() => setLegacyActions(old => ({
                          ...old, [`${problem.layout}:${problem.index}`]: "trash",
                        }))}>
                        Send to Trash
                      </Button>
                    </Stack>
                  )}
                </Box>
              ))}
              {requiresReconciliation && (
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Valid banners will be kept automatically. Your current Draft
                    artwork and edits are preserved. The original Firestore source
                    is never modified; Trash decisions are archived for recovery.
                  </Typography>
                  <Button variant="contained"
                    disabled={!isAdmin || busy || changed || !legacy.data?.fingerprint || !allDecided}
                    onClick={() => reconcileMutation.mutate()}>
                    Sync to Draft
                  </Button>
                  {!allDecided && <Typography color="warning.main" variant="caption">
                    Choose Draft or Trash for each banner highlighted in red.
                  </Typography>}
                </Stack>
              )}
            </Paper>
          )}
          {pane === "draft" && !legacyRequiresImport && !draft.data && (
            <Alert severity="info">
              No editable Website banner draft exists yet. New artwork can be
              entered below; verify old Storage fallback assets before first publication.
            </Alert>
          )}
          {pane === "draft" && <>
          {legacyConflict && <Alert severity="warning"
            action={<Button onClick={() => setPane("legacy")}>Revisar heredados</Button>}>
            Hay diferencias con el sistema anterior. Sincroniza desde Heredados
            antes de publicar el borrador.
          </Alert>}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" color={changed ? "warning" : "default"}
                  label={changed ? "UNSAVED CHANGES" : `DRAFT #${revision}`} />
                <Chip size="small" color={published.data ? "success" : "default"}
                  label={published.data ? `API RELEASE #${published.data.revision}` : "NOT PUBLISHED"} />
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button startIcon={<Save size={16} />} disabled={disabled || !changed || legacyRequiresImport}
                  onClick={() => saveMutation.mutate()}>Save draft</Button>
                <Button variant="contained" startIcon={<Rocket size={16} />}
                  disabled={disabled || !isAdmin || changed || !draft.data ||
                    published.data?.draftRevision === revision || Boolean(draft.error) ||
                    legacyConflict}
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
              gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "repeat(3,minmax(0,1fr))", lg: "repeat(4,minmax(0,1fr))", xl: "repeat(5,minmax(0,1fr))" },
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
                      <Button size="small" color="warning"
                        title={changed ? "Guarda los cambios antes de mover a Papelera" : "Mover a Papelera"}
                        disabled={disabled || changed}
                        onClick={() => setTrashCandidate({layout, bannerId: card.id})}>Papelera</Button>
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
          </>}
          {pane === "published" && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={800}>Última publicación aprobada en FastAPI</Typography>
              {published.isPending && <CircularProgress size={24}/>}
              {published.error && <Alert severity="error">{String(published.error)}</Alert>}
              {!published.isPending && !published.data && <Alert severity="info">
                No hay publicaciones. Puedes crear la primera desde Borradores.
              </Alert>}
              {published.data && (["desktop", "mobile"] as const).map(responsive => (
                <Box key={responsive} sx={{ mt: 3 }}>
                  <Typography fontWeight={700}>
                    {responsive === "desktop" ? "Escritorio" : "Web móvil"}
                    {": "}{published.data?.content[responsive].length ?? 0} banners
                  </Typography>
                  <Box sx={{
                    mt: 1, display: "grid", gap: 1.5,
                    gridTemplateColumns: { xs: "1fr", md: "repeat(3,minmax(0,1fr))" },
                  }}>
                    {published.data.content[responsive].map((card, index) => (
                      <Paper key={card.id + index} variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
                        <ArtworkPreview src={card.url} alt={`Publicado ${responsive} ${index + 1}`}
                          shape={responsive === "mobile" ? "portrait" : "landscape"}/>
                        <Stack direction="row" sx={{ mt: 1 }} justifyContent="space-between">
                          <Typography fontWeight={700}>Banner {index + 1}</Typography>
                          <Chip size="small" label={card.active ? "Habilitado" : "Oculto"}
                            color={card.active ? "success" : "default"}/>
                        </Stack>
                        <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>
                          {card.linkUrl || "Sin enlace"}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              ))}
              <Button sx={{ mt: 2 }} variant="outlined"
                onClick={() => setPane("draft")}>Editar en Borradores</Button>
            </Paper>
          )}
          {pane === "trash" && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={800}>Papelera de banners Website</Typography>
              {archived.isPending && <CircularProgress size={24}/>}
              {archived.error && <Alert severity="error">{String(archived.error)}</Alert>}
              {archived.data?.length === 0 && (
                <Typography color="text.secondary">No hay banners en la papelera.</Typography>
              )}
              <Box sx={{
                mt: 2, display: "grid", gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "repeat(3,minmax(0,1fr))" },
              }}>
                {archived.data?.map(item => (
                  <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
                    <ArtworkPreview src={item.banner.url} alt="Banner archivado"
                      shape={item.layout === "mobile" ? "portrait" : "landscape"}/>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {item.layout === "mobile" ? "Web móvil" : "Escritorio"}
                      {" · "}{new Date(item.deletedAt).toLocaleString()}
                    </Typography>
                    <Button size="small" variant="outlined" sx={{ mt: 1 }}
                      disabled={busy || changed || !draft.data}
                      onClick={() => restoreMutation.mutate(item.id)}>
                      Restaurar al borrador
                    </Button>
                  </Paper>
                ))}
              </Box>
            </Paper>
          )}
          {pane === "published" && <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>Historial de publicaciones</Typography>
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
          </Paper>}
        </>
      )}
      <BannerEditorDialog editor={editor} onClose={() => setEditor(null)}
        onCommit={(value) => {
          if (editor) {
            replaceAt(editor.index, value);
            setEditor(null);
          }
        }} />
      <Dialog open={Boolean(trashCandidate)} onClose={() => setTrashCandidate(null)}>
        <DialogTitle>¿Mover banner a Papelera?</DialogTitle>
        <DialogContent>
          El banner quedará archivado y se podrá restaurar al borrador.
          La publicación actual no cambiará hasta que publiques otra revisión.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrashCandidate(null)}>Cancelar</Button>
          <Button color="warning" variant="contained" disabled={busy || changed}
            onClick={() => { if (trashCandidate) trashMutation.mutate(trashCandidate); }}>
            Mover a papelera
          </Button>
        </DialogActions>
      </Dialog>
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
