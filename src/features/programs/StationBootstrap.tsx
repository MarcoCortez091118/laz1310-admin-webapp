import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Download, Radio, Save } from "lucide-react";
import { useMemo, useState } from "react";
import type { Station } from "../../api/types";
import { listPublishedStations, putStation } from "./api";

interface StationBootstrapProps {
  etag: string;
  onReady: (stationId: string) => Promise<void> | void;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function validHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function StationBootstrap({ etag, onReady }: StationBootstrapProps) {
  const published = useQuery({
    queryKey: ["public", "stations", "program-bootstrap"],
    queryFn: ({ signal }) => listPublishedStations(signal),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [name, setName] = useState("LA Z 1310");
  const [slug, setSlug] = useState("la-z-1310");
  const [frequencyAm, setFrequencyAm] = useState("1310");
  const [timezone, setTimezone] = useState("America/Detroit");
  const [locale, setLocale] = useState("es-US");
  const [streamUrl, setStreamUrl] = useState("https://sh2.radioonlinehd.com:8050/stream");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishedStations = published.data?.data ?? [];
  const firstPublished = publishedStations[0] ?? null;
  const canCreate =
    Boolean(name.trim()) &&
    Boolean(slug.trim()) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    validHttpsUrl(streamUrl);

  const stationPreview = useMemo(
    () => `${frequencyAm.trim() ? `${frequencyAm.trim()} AM · ` : ""}${timezone}`,
    [frequencyAm, timezone],
  );

  async function persist(station: Station) {
    if (!station.id) throw new Error("Station ID is required.");
    setSaving(true);
    setError(null);
    try {
      await putStation(station, etag);
      await onReady(station.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create the station Draft.");
    } finally {
      setSaving(false);
    }
  }

  async function importPublished() {
    if (!firstPublished?.id) return;
    await persist(firstPublished);
  }

  async function createStation() {
    if (!canCreate) return;
    const stationId = globalThis.crypto.randomUUID();
    const streamId = globalThis.crypto.randomUUID();
    const station: Station = {
      id: stationId,
      slug,
      name: name.trim(),
      frequencyAm: frequencyAm.trim() || undefined,
      timezone: timezone.trim(),
      locale: locale.trim(),
      isActive: true,
      streams: [
        {
          id: streamId,
          url: streamUrl.trim(),
          format: "auto",
          priority: 0,
          isActive: true,
        },
      ],
      shows: [],
      schedule: [],
    };
    await persist(station);
  }

  return (
    <Stack spacing={2.25}>
      <Box>
        <Typography variant="overline" color="primary.main" fontWeight={800} letterSpacing="0.12em">
          Content · Programs
        </Typography>
        <Typography variant="h4" fontWeight={850} sx={{ letterSpacing: "-0.04em" }}>
          Programs
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 780 }}>
          Programs belong to a radio station. This Draft currently has no station, so create the LA Z station or restore the already-published station before adding shows.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {published.isPending ? (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CircularProgress size={20} />
              <Typography>Checking the current published release for an existing station…</Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {firstPublished ? (
        <Card variant="outlined" sx={{ borderRadius: 3, borderColor: "primary.light" }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
                <Box>
                  <Typography variant="overline" color="primary.main" fontWeight={800}>
                    Published station found
                  </Typography>
                  <Typography variant="h6" fontWeight={850}>{firstPublished.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {firstPublished.frequencyAm ? `${firstPublished.frequencyAm} AM · ` : ""}
                    {firstPublished.timezone ?? "America/Detroit"} · {firstPublished.shows?.length ?? 0} programs
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress color="inherit" size={16} /> : <Download size={17} />}
                  disabled={saving}
                  onClick={() => void importPublished()}
                >
                  Import published station to Draft
                </Button>
              </Stack>
              <Alert severity="info">
                This reuses the published station UUID, streams, programs and schedule. It does not create a duplicate station and does not publish any new changes.
              </Alert>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" fontWeight={850}>Create LA Z station in Draft</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Use this only when no published station should be restored. The station and stream remain Draft-only until an administrator publishes a release.
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.5 }}>
              <TextField
                label="Station name"
                value={name}
                onChange={(event) => {
                  const next = event.target.value;
                  setName(next);
                  setSlug(slugify(next));
                }}
                required
              />
              <TextField
                label="Slug"
                value={slug}
                onChange={(event) => setSlug(slugify(event.target.value))}
                required
                helperText="Stable API identifier"
              />
              <TextField
                label="AM frequency"
                value={frequencyAm}
                onChange={(event) => setFrequencyAm(event.target.value)}
                placeholder="1310"
              />
              <TextField
                label="Timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                required
                helperText="IANA timezone used by weekly schedules"
              />
              <TextField
                label="Locale"
                value={locale}
                onChange={(event) => setLocale(event.target.value)}
                required
                helperText="Example: es-US"
              />
              <TextField
                label="Live stream URL"
                value={streamUrl}
                onChange={(event) => setStreamUrl(event.target.value)}
                required
                error={Boolean(streamUrl) && !validHttpsUrl(streamUrl)}
                helperText="Required so the active station can be published safely. HTTPS only."
              />
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: "center" }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Radio size={18} />
                <Typography variant="body2" color="text.secondary">{stationPreview}</Typography>
              </Stack>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress color="inherit" size={16} /> : <Save size={17} />}
                disabled={!canCreate || saving}
                onClick={() => void createStation()}
              >
                Create station and continue
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {published.error ? (
        <Alert severity="warning">
          Published stations could not be checked. You can still create a station manually, but verify first that this will not duplicate an existing LA Z station.
        </Alert>
      ) : null}
    </Stack>
  );
}
