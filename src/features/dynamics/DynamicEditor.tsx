import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { Dynamic } from "../../api/types";
import { ApiError } from "../../api/errors";
import { adminQueryKeys } from "../content/api";
import { ManagedImageField } from "../media/ManagedImageField";
import { deleteDynamic, dynamicsQueryKeys, putDynamic } from "./api";
import {
  defaultDynamicForm,
  dynamicFromForm,
  dynamicToForm,
  FIELD_TYPES,
  newField,
  validateDynamicForm,
  type DynamicFormState,
} from "./model";

interface DynamicEditorProps {
  dynamic: Dynamic | null;
  allDynamics: Dynamic[];
  etag: string;
  onDeleted: () => void;
  onSaved: (dynamicId: string) => void;
}

function mutationMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === "conflict") {
      return "The Draft changed while you were editing. Reload the campaigns and retry your change.";
    }
    if (error.kind === "validation") return error.message;
    return error.message || "The Admin API rejected this operation.";
  }
  return error instanceof Error ? error.message : "Unexpected error.";
}

function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Box component="section" className="dynamics-editor-section">
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{title}</Typography>
        {description ? <Typography variant="caption" color="text.secondary">{description}</Typography> : null}
      </Box>
      <Divider />
      {children}
    </Box>
  );
}

export function DynamicEditor({
  dynamic,
  allDynamics,
  etag,
  onDeleted,
  onSaved,
}: DynamicEditorProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DynamicFormState>(() =>
    dynamic ? dynamicToForm(dynamic) : defaultDynamicForm(),
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const originalId = dynamic?.id;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const error = validateDynamicForm(form, allDynamics, originalId);
      if (error) throw new Error(error);
      return putDynamic(form.id, dynamicFromForm(form), etag);
    },
    onSuccess: async () => {
      setClientError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dynamicsQueryKeys.list }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.draft }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview }),
      ]);
      onSaved(form.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDynamic(form.id, etag),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dynamicsQueryKeys.list }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.draft }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview }),
      ]);
      onDeleted();
    },
  });

  const mutationError = saveMutation.error ?? deleteMutation.error;
  const error = clientError ?? (mutationError ? mutationMessage(mutationError) : null);
  const busy = saveMutation.isPending || deleteMutation.isPending;

  const fieldContactValid = useMemo(
    () =>
      form.requiresAuth ||
      form.participationType === "external_url" ||
      form.fields.some(
        (field) => field.required && (field.type === "email" || field.type === "phone"),
      ),
    [form.fields, form.participationType, form.requiresAuth],
  );

  function update<K extends keyof DynamicFormState>(key: K, value: DynamicFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setClientError(null);
  }

  return (
    <Paper variant="outlined" className="dynamics-editor-shell">
      <Box className="dynamics-editor-hero">
        <Box className="dynamics-editor-preview">
          {form.imageUrl ? <img src={form.imageUrl} alt={form.artworkLabel || form.title || "Campaign artwork"} referrerPolicy="no-referrer" /> : <span>No artwork</span>}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800, letterSpacing: ".12em" }}>
              {dynamic ? "Edit campaign" : "New campaign"}
            </Typography>
            <Chip label="Draft only" size="small" color="warning" variant="outlined" />
            {form.featured ? <Chip label="Featured" size="small" color="primary" /> : null}
          </Stack>
          <Typography variant="h5" sx={{ mt: 0.25, fontWeight: 800 }} noWrap>{form.title || "Create a Dynamic"}</Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
            Writes update only the Draft. Publish remains a separate immutable release step.
          </Typography>
          <Typography component="code" variant="caption" color="text.secondary" display="block" sx={{ mt: 1, overflowWrap: "anywhere" }}>
            {form.id}
          </Typography>
        </Box>
      </Box>

      {error ? <Alert severity="error" sx={{ mx: 2.5, mt: 2 }}>{error}</Alert> : null}

      <Box
        component="form"
        className="dynamics-editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          const validation = validateDynamicForm(form, allDynamics, originalId);
          setClientError(validation);
          if (!validation) void saveMutation.mutateAsync();
        }}
      >
        <fieldset disabled={busy} className="dynamics-editor-fieldset">
          <FormSection title="Campaign identity" description="Public-facing metadata and promotional artwork.">
            <Box className="dynamics-editor-grid two">
              <TextField label="Title" value={form.title} onChange={(event) => update("title", event.target.value)} required inputProps={{ maxLength: 160 }} />
              <TextField label="Slug" value={form.slug} onChange={(event) => update("slug", event.target.value.toLowerCase())} required inputProps={{ maxLength: 100, pattern: "[a-z0-9]+(?:-[a-z0-9]+)*" }} helperText="Lowercase letters, numbers and hyphens." />
              <TextField label="Artwork label" value={form.artworkLabel} onChange={(event) => update("artworkLabel", event.target.value)} required inputProps={{ maxLength: 80 }} />
              <TextField label="Context" value={form.context} onChange={(event) => update("context", event.target.value)} required inputProps={{ maxLength: 100 }} />
            </Box>
            <TextField label="Description" value={form.description} onChange={(event) => update("description", event.target.value)} required multiline minRows={3} inputProps={{ maxLength: 5000 }} />
            <TextField label="Instructions" value={form.instructions} onChange={(event) => update("instructions", event.target.value)} required multiline minRows={3} inputProps={{ maxLength: 5000 }} />
            <ManagedImageField
              value={form.imageUrl}
              label="Campaign artwork"
              pickerTitle="Choose campaign artwork"
              required
              description="Upload the promotional image. FastAPI stores the processed asset and its managed Storage URL is assigned automatically."
              onChange={(url) => update("imageUrl", url ?? "")}
            />
          </FormSection>

          <FormSection title="Schedule & availability" description="Dates are interpreted in the selected IANA timezone and persisted as UTC.">
            <Box className="dynamics-editor-grid three">
              <TextField label="Starts at" value={form.startsAt} onChange={(event) => update("startsAt", event.target.value)} required type="datetime-local" InputLabelProps={{ shrink: true }} />
              <TextField label="Ends at" value={form.endsAt} onChange={(event) => update("endsAt", event.target.value)} required type="datetime-local" InputLabelProps={{ shrink: true }} />
              <TextField label="Campaign timezone" value={form.timezone} onChange={(event) => update("timezone", event.target.value)} required placeholder="America/Detroit" />
            </Box>
            <Box className="dynamics-editor-grid two compact">
              <TextField select label="Editorial status" value={form.status} onChange={(event) => update("status", event.target.value as "active" | "closed")}>
                <MenuItem value="active">Active — window controls availability</MenuItem>
                <MenuItem value="closed">Closed — manual override</MenuItem>
              </TextField>
              <FormControlLabel control={<Switch checked={form.featured} onChange={(event) => update("featured", event.target.checked)} />} label="Featured campaign" />
            </Box>
          </FormSection>

          <FormSection title="Participation" description="Choose an in-app form or send listeners to an external HTTPS registration page.">
            <ToggleButtonGroup
              exclusive
              value={form.participationType}
              onChange={(_event, value: "form" | "external_url" | null) => { if (value) update("participationType", value); }}
              size="small"
              color="primary"
            >
              <ToggleButton value="form">Native form</ToggleButton>
              <ToggleButton value="external_url">External URL</ToggleButton>
            </ToggleButtonGroup>

            {form.participationType === "external_url" ? (
              <TextField
                label="External registration URL"
                value={form.participationUrl}
                onChange={(event) => update("participationUrl", event.target.value)}
                required
                type="url"
                helperText="External mode cannot collect local fields or require Firebase authentication."
              />
            ) : (
              <Stack spacing={2}>
                <FormControlLabel control={<Switch checked={form.requiresAuth} onChange={(event) => update("requiresAuth", event.target.checked)} />} label="Require authenticated Firebase user" />
                {!fieldContactValid ? <Alert severity="warning">Anonymous forms must include a required email or phone field.</Alert> : null}

                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Form fields</Typography>
                    <Typography variant="caption" color="text.secondary">{form.fields.length}/12 configured</Typography>
                  </Box>
                  <Button size="small" variant="outlined" startIcon={<Plus size={15} />} disabled={form.fields.length >= 12} onClick={() => update("fields", [...form.fields, newField()])}>
                    Add field
                  </Button>
                </Stack>

                <Stack spacing={1}>
                  {form.fields.map((field, index) => (
                    <Paper variant="outlined" className="dynamics-field-row-mui" key={field.rowId}>
                      <TextField
                        size="small"
                        label="Field key"
                        value={field.key}
                        onChange={(event) => update("fields", form.fields.map((item) => item.rowId === field.rowId ? { ...item, key: event.target.value.toLowerCase() } : item))}
                        required
                        inputProps={{ maxLength: 40, pattern: "[a-z][a-z0-9_]{0,39}" }}
                      />
                      <TextField
                        size="small"
                        select
                        label="Type"
                        value={field.type}
                        onChange={(event) => update("fields", form.fields.map((item) => item.rowId === field.rowId ? { ...item, type: event.target.value as typeof field.type } : item))}
                      >
                        {FIELD_TYPES.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                      </TextField>
                      <TextField
                        size="small"
                        label="Visible label"
                        value={field.label}
                        onChange={(event) => update("fields", form.fields.map((item) => item.rowId === field.rowId ? { ...item, label: event.target.value } : item))}
                        required
                        inputProps={{ maxLength: 100 }}
                      />
                      <FormControlLabel control={<Switch size="small" checked={field.required} onChange={(event) => update("fields", form.fields.map((item) => item.rowId === field.rowId ? { ...item, required: event.target.checked } : item))} />} label="Required" />
                      <Tooltip title={`Remove ${field.key || `field ${index + 1}`}`}>
                        <IconButton color="error" onClick={() => update("fields", form.fields.filter((item) => item.rowId !== field.rowId))}>
                          <X size={17} />
                        </IconButton>
                      </Tooltip>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            )}
          </FormSection>

          <FormSection title="Consent & policy" description="Increment consentVersion whenever applicable legal terms change.">
            <Box className="dynamics-editor-grid two">
              <TextField label="Terms URL" value={form.termsUrl} onChange={(event) => update("termsUrl", event.target.value)} required type="url" />
              <TextField label="Privacy URL" value={form.privacyUrl} onChange={(event) => update("privacyUrl", event.target.value)} required type="url" />
              <TextField label="Consent version" value={form.consentVersion} onChange={(event) => update("consentVersion", event.target.value)} required inputProps={{ maxLength: 64, pattern: "[A-Za-z0-9._-]+" }} />
            </Box>
          </FormSection>
        </fieldset>

        <Box className="dynamics-editor-actions-mui">
          {dynamic ? (
            <Button
              color="error"
              variant="outlined"
              startIcon={<Trash2 size={16} />}
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Remove “${dynamic.title}” from the Draft? Existing participations are retained.`)) {
                  void deleteMutation.mutateAsync();
                }
              }}
            >
              Remove from Draft
            </Button>
          ) : <span />}
          <Button type="submit" variant="contained" startIcon={<Save size={16} />} disabled={busy}>
            {saveMutation.isPending ? "Saving…" : "Save to Draft"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
