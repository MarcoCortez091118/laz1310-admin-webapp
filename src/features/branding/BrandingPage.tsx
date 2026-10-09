import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Image as ImageIcon,
  Palette,
  Rocket,
  Save,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { ApiError } from "../../api/errors";
import { useStaff } from "../auth/StaffGate";
import {
  adminQueryKeys,
  publishConfiguration,
  putConfiguration,
} from "../content/api";
import {
  useConfigurationPublicationStatusQuery,
  useDraftQuery,
} from "../content/queries";
import { MediaPickerDialog } from "../media/MediaPickerDialog";

interface BrandingTheme {
  primary: string;
  background: string;
  logoUrl?: string | null;
  backgroundImageUrl?: string | null;
  backgroundEnabled?: boolean;
}

interface BrandingConfiguration {
  maintenance: boolean;
  versions: unknown;
  features: unknown;
  navigation: string[];
  theme: BrandingTheme;
}

function publicationLabel(
  status: "draft" | "live" | "changes_pending" | undefined,
) {
  if (status === "live") return { label: "LIVE", color: "success" as const };
  if (status === "changes_pending") {
    return { label: "CHANGES PENDING", color: "warning" as const };
  }
  return { label: "DRAFT", color: "info" as const };
}

function BrandingEditor({
  configuration,
  revision,
  etag,
}: {
  configuration: BrandingConfiguration;
  revision: number;
  etag: string;
}) {
  const queryClient = useQueryClient();
  const staff = useStaff();
  const admin = staff.roles.includes("admin");
  const statusQuery = useConfigurationPublicationStatusQuery();
  const [pickerOpen, setPickerOpen] = useState(false);

  const initialImageUrl = configuration.theme.backgroundImageUrl ?? null;
  const initialEnabled = configuration.theme.backgroundEnabled ?? true;
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [enabled, setEnabled] = useState(initialEnabled);

  const dirty =
    imageUrl !== initialImageUrl ||
    enabled !== initialEnabled;

  const save = useMutation({
    mutationFn: () =>
      putConfiguration(
        {
          ...configuration,
          theme: {
            ...configuration.theme,
            backgroundImageUrl: imageUrl,
            backgroundEnabled: enabled,
          },
        },
        etag,
      ),
    onSuccess: (result) => {
      queryClient.setQueryData(adminQueryKeys.draft, result);
      void queryClient.invalidateQueries({
        queryKey: adminQueryKeys.configurationStatus,
      });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview });
    },
  });

  const publish = useMutation({
    mutationFn: () =>
      publishConfiguration("Publish Mobile branding", etag),
    onSuccess: (result) => {
      queryClient.setQueryData(adminQueryKeys.publicState, result);
      void queryClient.invalidateQueries({
        queryKey: adminQueryKeys.configurationStatus,
      });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.releases });
    },
  });

  const status = statusQuery.data?.data.status;
  const publication = publicationLabel(status);
  const error = save.error ?? publish.error ?? statusQuery.error;
  const conflict = error instanceof ApiError && error.kind === "conflict";
  const canPublish =
    admin &&
    !dirty &&
    !save.isPending &&
    !publish.isPending &&
    (status === "draft" || status === "changes_pending");

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ md: "center" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              color={dirty ? "warning" : publication.color}
              label={dirty ? "UNSAVED CHANGES" : publication.label}
              size="small"
            />
            <Typography color="text.secondary" variant="body2">
              Draft #{revision}
              {statusQuery.data?.data.releaseId
                ? ` · Release ${statusQuery.data.data.releaseId.slice(0, 8)}`
                : ""}
            </Typography>
          </Stack>
          <Typography color="text.secondary" variant="body2">
            Mobile · global branded background
          </Typography>
        </Stack>
      </Paper>

      {error ? (
        <Alert severity={conflict ? "warning" : "error"}>
          {error instanceof Error
            ? error.message
            : "Unable to update Branding."}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.25 }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ sm: "center" }}
            spacing={1.5}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Palette size={20} />
                <Typography variant="h6" fontWeight={800}>
                  App background
                </Typography>
              </Stack>
              <Typography color="text.secondary" variant="body2" mt={0.5}>
                Published artwork is used throughout Mobile. Weather detail keeps
                its own live weather scene.
              </Typography>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={enabled}
                  onChange={(_, checked) => setEnabled(checked)}
                />
              }
              label={enabled ? "Enabled" : "Disabled"}
            />
          </Stack>

          <Box
            sx={{
              aspectRatio: "1 / 1",
              bgcolor: "#111",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              display: "grid",
              maxHeight: 520,
              overflow: "hidden",
              placeItems: "center",
              position: "relative",
            }}
          >
            {enabled && imageUrl ? (
              <Box
                alt="Mobile branded background preview"
                component="img"
                referrerPolicy="no-referrer"
                src={imageUrl}
                sx={{
                  height: "100%",
                  objectFit: "cover",
                  width: "100%",
                }}
              />
            ) : (
              <Stack
                alignItems="center"
                color="rgba(255,255,255,0.7)"
                spacing={1}
              >
                <ImageIcon size={34} />
                <Typography fontWeight={700}>
                  {enabled
                    ? "Mobile will use its bundled fallback background"
                    : "Global background disabled"}
                </Typography>
              </Stack>
            )}

            {enabled ? (
              <Button
                onClick={() => setPickerOpen(true)}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.94)",
                  position: "absolute",
                  right: 14,
                  top: 14,
                  "&:hover": { bgcolor: "#fff" },
                }}
                variant="outlined"
              >
                {imageUrl ? "Change image" : "Choose image"}
              </Button>
            ) : null}
          </Box>

          {imageUrl ? (
            <Button
              color="error"
              onClick={() => setImageUrl(null)}
              size="small"
              startIcon={<Trash2 size={15} />}
              sx={{ alignSelf: "flex-start" }}
            >
              Use bundled fallback instead
            </Button>
          ) : null}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {[
              {
                label: "Dark",
                overlay: "rgba(5,1,1,0.18)",
                background: "#050101",
                color: "#FEFEFE",
              },
              {
                label: "Light",
                overlay: "rgba(254,254,254,0.52)",
                background: "#FEFEFE",
                color: "#111111",
              },
            ].map((preview) => (
              <Paper
                key={preview.label}
                variant="outlined"
                sx={{
                  bgcolor: preview.background,
                  borderRadius: 3,
                  flex: 1,
                  minHeight: 230,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {enabled && imageUrl ? (
                  <Box
                    alt=""
                    aria-hidden
                    component="img"
                    src={imageUrl}
                    sx={{
                      height: "100%",
                      objectFit: "cover",
                      position: "absolute",
                      width: "100%",
                    }}
                  />
                ) : null}
                {enabled ? (
                  <Box
                    sx={{
                      bgcolor: preview.overlay,
                      inset: 0,
                      position: "absolute",
                    }}
                  />
                ) : null}
                <Stack
                  justifyContent="space-between"
                  sx={{ height: "100%", minHeight: 230, p: 2, position: "relative" }}
                >
                  <Chip
                    label={preview.label}
                    size="small"
                    sx={{ alignSelf: "flex-start" }}
                  />
                  <Box>
                    <Typography color={preview.color} fontWeight={900} variant="h5">
                      LA Z 1310
                    </Typography>
                    <Typography
                      color={preview.color}
                      sx={{ opacity: 0.76 }}
                      variant="body2"
                    >
                      Theme preview
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Paper>

      <MediaPickerDialog
        currentUrl={imageUrl}
        description="Select a managed image for the global Mobile background."
        onClose={() => setPickerOpen(false)}
        onSelect={(asset) => {
          setImageUrl(asset.url);
          setPickerOpen(false);
        }}
        open={pickerOpen}
        title="Choose Mobile background"
      />

      <Paper
        elevation={3}
        sx={{
          position: "sticky",
          bottom: 16,
          borderRadius: 3,
          p: 1.5,
          bgcolor: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(12px)",
          zIndex: 4,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ md: "center" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box>
            <Typography fontWeight={800} variant="body2">
              {dirty
                ? "Save the Draft before publishing."
                : status === "live"
                  ? "Branding is live in Mobile."
                  : "Saved Branding changes are ready to publish."}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              Publish Branding updates only App Configuration; unrelated Draft
              content remains unpublished.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              disabled={!dirty || save.isPending || publish.isPending}
              onClick={() => save.mutate()}
              startIcon={<Save size={16} />}
              variant="outlined"
            >
              {save.isPending ? "Saving…" : "Save draft"}
            </Button>
            <Button
              disabled={!canPublish}
              onClick={() => publish.mutate()}
              startIcon={<Rocket size={16} />}
              variant="contained"
            >
              {publish.isPending ? "Publishing…" : "Publish branding"}
            </Button>
          </Stack>
        </Stack>

        {!admin ? (
          <Typography
            color="text.secondary"
            display="block"
            mt={1}
            variant="caption"
          >
            Administrator role is required to publish Branding.
          </Typography>
        ) : null}
      </Paper>
    </Stack>
  );
}

export function BrandingPage() {
  const draft = useDraftQuery();

  if (draft.isPending) {
    return (
      <section className="page-stack">
        <div className="panel">Loading Branding…</div>
      </section>
    );
  }

  if (draft.error || !draft.data) {
    return (
      <section className="page-stack">
        <article className="panel">
          <p className="eyebrow">System</p>
          <h1>Unable to load Branding.</h1>
          <p className="muted">
            {draft.error instanceof Error
              ? draft.error.message
              : "Admin API unavailable."}
          </p>
        </article>
      </section>
    );
  }

  const etag = draft.data.etag;
  const configuration = draft.data.data.catalog?.configuration as
    | BrandingConfiguration
    | undefined;

  if (!etag || !configuration) {
    return (
      <section className="page-stack">
        <article className="panel">
          <h1>Branding configuration unavailable</h1>
          <p className="muted">
            Draft configuration or ETag is missing, so Branding writes are
            disabled safely.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <header className="page-heading split-heading">
        <div>
          <p className="eyebrow">
            System / Draft #{draft.data.data.revision ?? "—"}
          </p>
          <h1>Branding</h1>
          <p className="muted">
            Manage release-controlled visual branding delivered to Mobile
            without publishing a new app binary.
          </p>
        </div>
      </header>

      <BrandingEditor
        configuration={configuration}
        etag={etag}
        key={draft.data.data.revision ?? 0}
        revision={draft.data.data.revision ?? 0}
      />
    </section>
  );
}
