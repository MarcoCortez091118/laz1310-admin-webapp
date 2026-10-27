import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, FormControlLabel,
  MenuItem, Stack, Switch, TextField, Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, Undo2, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "../../../api/errors";
import { useStaff } from "../../auth/StaffGate";
import { isoToZonedInput, zonedInputToIso } from "../../dynamics/model";
import { WebsiteArtworkField } from "../../media/WebsiteArtworkField";
import {
  getPopupDraft, getPopupLegacy, getPopupPublication, getPopupReleases,
  importPopupLegacy, popupKeys, publishPopup, rollbackPopup, savePopupDraft,
  type PopupContent, type PopupDraft, type PopupPublication, type PopupRelease,
  type PopupPlacement,
} from "./popupApi";

const DEFAULT: PopupContent = {
  enabled: false, delay: 3, images: [], placements: ["home"],
  startsAt: null, endsAt: null, timezone: "America/Detroit",
};

function optionally<T>(load: () => Promise<{ data: T }>): Promise<T | null> {
  return load().then(response => response.data).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });
}

const SLOTS: { id: PopupPlacement; label: string }[] = [
  { id: "home", label: "Home Page" },
  { id: "programacion", label: "Programación" },
  { id: "actividades", label: "Actividades" },
];

export function WebsitePopupPage() {
  const staff = useStaff();
  const isAdmin = staff.roles.includes("admin");
  const qc = useQueryClient();
  const [content, setContent] = useState<PopupContent>(DEFAULT);
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetRelease, setTargetRelease] = useState("");
  const query = useQuery({
    queryKey: popupKeys.draft,
    retry: false,
    queryFn: async () => {
      const legacy = (await getPopupLegacy()).data;
      const [draft, publication, releases] = await Promise.all([
        optionally<PopupDraft>(getPopupDraft),
        optionally<PopupPublication>(getPopupPublication),
        optionally<{ items: PopupRelease[] }>(getPopupReleases),
      ]);
      return { legacy, draft, publication, releases: releases?.items ?? [] };
    },
  });

  useEffect(() => {
    if (!query.data || dirty) return;
    const value = query.data.draft?.content ?? query.data.legacy.content ?? DEFAULT;
    setContent(value);
    setFrom(value.startsAt ? isoToZonedInput(value.startsAt, value.timezone) : "");
    setUntil(value.endsAt ? isoToZonedInput(value.endsAt, value.timezone) : "");
  }, [query.data, dirty]);

  const mutation = useMutation({
    mutationFn: async (operation: "save" | "import" | "publish" | "rollback") => {
      const snapshot = query.data;
      if (!snapshot) throw new Error("No hay datos de Popup disponibles.");
      if (operation === "import") {
        if (!isAdmin || !snapshot.legacy.fingerprint) throw new Error("Importación no autorizada.");
        return importPopupLegacy(snapshot.legacy.fingerprint);
      }
      if (operation === "save") {
        if (Boolean(from) !== Boolean(until)) {
          throw new Error("Selecciona fecha de inicio y fecha de fin, o deja ambas vacías.");
        }
        const startsAt = from ? zonedInputToIso(from, content.timezone) : null;
        const endsAt = until ? zonedInputToIso(until, content.timezone) : null;
        if ((from && !startsAt) || (until && !endsAt)) {
          throw new Error("Fecha no válida para la zona horaria elegida.");
        }
        return savePopupDraft({ ...content, startsAt, endsAt }, snapshot.draft?.revision ?? 0);
      }
      if (!isAdmin || dirty || !snapshot.draft) {
        throw new Error("Sólo administradores pueden publicar una revisión guardada.");
      }
      if (operation === "publish") return publishPopup(snapshot.draft.revision);
      if (!snapshot.publication || !targetRelease) {
        throw new Error("Selecciona una publicación anterior.");
      }
      return rollbackPopup(snapshot.publication.revision, targetRelease);
    },
    onSuccess: async () => {
      setError(null);
      setDirty(false);
      await qc.invalidateQueries({ queryKey: ["admin", "website", "popup"] });
    },
    onError: (cause: unknown) => setError(
      cause instanceof Error ? cause.message : "Error de API; vuelve a cargar.",
    ),
  });

  const loaded = query.data;
  const needsImport = !loaded?.draft && Boolean(loaded?.legacy.sourceExists);
  const canEdit = Boolean(loaded?.draft) || !needsImport;
  const selectedWindow = Boolean(from) || Boolean(until);
  const previousReleases = (loaded?.releases ?? []).filter(
    release => release.releaseId !== loaded?.publication?.releaseId,
  );

  function patch(update: Partial<PopupContent>) {
    setContent(previous => ({ ...previous, ...update }));
    setDirty(true);
    setError(null);
  }

  if (query.isPending) return <CircularProgress size={28} />;
  if (query.isError || !loaded) {
    return <Alert severity="error" action={
      <Button color="inherit" onClick={() => void query.refetch()}>Reintentar</Button>
    }>
      No fue posible obtener la configuración Pop Up desde FastAPI.
      Los endpoints necesitan el despliegue de la API Popup V1; no se guardará
      información directamente en Firebase.
    </Alert>;
  }

  return (
    <Stack spacing={2.5}>
      <Alert severity="info">
        Pop Up pertenece a Website. El editor utiliza únicamente la API FastAPI y
        conserva borrador, publicación y rollback independientes de la App.
        La web pública heredada seguirá mostrando su configuración anterior
        hasta habilitar su lector nuevo mediante canary.
      </Alert>
      {needsImport && (
        <Alert severity="warning" action={isAdmin ? (
          <Button disabled={mutation.isPending} color="inherit"
            onClick={() => mutation.mutate("import")}>Importar</Button>
        ) : undefined}>
          Se encontró un Pop Up heredado. Un administrador debe importar
          su configuración para evitar sobrescribirla accidentalmente.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip label={loaded.draft ? `Borrador v${loaded.draft.revision}` : "Sin borrador"} />
        <Chip color={loaded.publication ? "success" : "default"}
          label={loaded.publication
            ? `Publicación v${loaded.publication.revision}`
            : "Sin publicar"} />
        {dirty && <Chip color="warning" label="Cambios sin guardar" />}
      </Stack>
      <Box component="fieldset" disabled={!canEdit || mutation.isPending}
        sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <FormControlLabel control={
              <Switch checked={content.enabled}
                onChange={(_event, checked) => patch({ enabled: checked })} />
            } label="Pop Up habilitado" />
            <TextField label="Retardo (segundos)" size="small" type="number"
              value={content.delay} inputProps={{ min: 0, max: 60 }}
              onChange={event => patch({ delay: Number(event.target.value) })}
              sx={{ width: { md: 210 } }} />
            <TextField label="Zona horaria" size="small"
              value={content.timezone}
              helperText="Ejemplo: America/Detroit"
              onChange={event => patch({ timezone: event.target.value })} />
          </Stack>
          <Typography fontWeight={800}>Ubicaciones dentro del Website</Typography>
          <Stack direction="row" gap={2} flexWrap="wrap">
            {SLOTS.map(slot => (
              <FormControlLabel key={slot.id}
                label={slot.label}
                control={<Switch checked={content.placements.includes(slot.id)}
                  onChange={(_event, checked) => patch({
                    placements: checked
                      ? [...content.placements, slot.id]
                      : content.placements.filter(item => item !== slot.id),
                  })} />}
              />
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            La ubicación se guarda en el borrador API; el posicionamiento efectivo
            en cada página depende del lector Website a implementar.
          </Typography>
          <Typography fontWeight={800}>Vigencia opcional</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField label="Inicio" type="datetime-local" fullWidth
              InputLabelProps={{ shrink: true }}
              value={from} onChange={event => { setFrom(event.target.value); setDirty(true); }} />
            <TextField label="Fin" type="datetime-local" fullWidth
              InputLabelProps={{ shrink: true }}
              value={until} onChange={event => { setUntil(event.target.value); setDirty(true); }} />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {selectedWindow
              ? "Ambas fechas son obligatorias; la API aplica los límites usando hora UTC."
              : "Sin fechas: vigencia abierta hasta que se deshabilite o se publique otra revisión."}
          </Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={800}>Imágenes y enlaces</Typography>
            <Button variant="outlined" startIcon={<Plus size={16} />}
              disabled={content.images.length >= 20}
              onClick={() => patch({ images: [...content.images, { url: "", link: "" }] })}>
              Agregar imagen
            </Button>
          </Stack>
          {content.images.map((image, index) => (
            <Card variant="outlined" key={index}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={750}>Imagen {index + 1}</Typography>
                    <Button color="error" startIcon={<Trash2 size={16} />}
                      onClick={() => patch({
                        images: content.images.filter((_, i) => i !== index),
                      })}>Eliminar</Button>
                  </Stack>
                  <WebsiteArtworkField folder="banners" url={image.url}
                    title={`Pop Up ${index + 1}`}
                    onChange={url => patch({
                      images: content.images.map((row, i) =>
                        i === index ? { ...row, url } : row),
                    })} />
                  <TextField label="URL de imagen HTTPS" fullWidth value={image.url}
                    onChange={event => patch({
                      images: content.images.map((row, i) =>
                        i === index ? { ...row, url: event.target.value } : row),
                    })} />
                  <TextField label="Enlace opcional HTTPS" fullWidth value={image.link}
                    onChange={event => patch({
                      images: content.images.map((row, i) =>
                        i === index ? { ...row, link: event.target.value } : row),
                    })} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
        <Button variant="contained" startIcon={<Save size={16} />}
          disabled={mutation.isPending || !canEdit}
          onClick={() => mutation.mutate("save")}>Guardar borrador</Button>
        <Button variant="outlined" startIcon={<UploadCloud size={16} />}
          disabled={mutation.isPending || !isAdmin || dirty || !loaded.draft}
          onClick={() => mutation.mutate("publish")}>Publicar revisión</Button>
        <Button variant="text" disabled={mutation.isPending}
          onClick={() => {
            setDirty(false);
            setError(null);
            void query.refetch();
          }}>Descartar cambios / Recargar</Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Las publicaciones sólo se aplicarán al nuevo lector de Website. No se modifican
        las rutas, la colección antigua ni la publicación de la App.
      </Typography>
      {isAdmin && previousReleases.length > 0 && (
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField select size="small" label="Versión anterior" fullWidth
            value={targetRelease} onChange={event => setTargetRelease(event.target.value)}>
            {previousReleases.map(release => (
              <MenuItem key={release.releaseId} value={release.releaseId}>
                Revisión {release.revision} · {release.action}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" startIcon={<Undo2 size={16} />}
            disabled={mutation.isPending || dirty || !targetRelease}
            onClick={() => mutation.mutate("rollback")}>Restaurar publicación</Button>
        </Stack>
      )}
    </Stack>
  );
}
