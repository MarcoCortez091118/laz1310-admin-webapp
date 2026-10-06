import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CalendarClock,
  Clock3,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ApiError } from "../../api/errors";
import type { Station } from "../../api/types";
import { adminQueryKeys } from "../content/api";
import { ManagedImageField } from "../media/ManagedImageField";
import {
  programsQueryKeys,
  putStation,
  type ProgramPublicationState,
} from "./api";
import { ProgramLifecycleActions } from "./ProgramLifecycleActions";
import {
  apiTime,
  createProgram,
  createScheduleEntry,
  displayTime,
  type Program,
  type ScheduleEntry,
  schedulesForProgram,
  upsertProgram,
  WEEKDAYS,
} from "./model";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function optional(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function publicationLabel(status: ProgramPublicationState | null): string {
  if (status === "live") return "Live";
  if (status === "changes_pending") return "Changes pending";
  return "Draft";
}

function publicationColor(status: ProgramPublicationState | null): "success" | "warning" | "default" {
  if (status === "live") return "success";
  if (status === "changes_pending") return "warning";
  return "default";
}

export function ProgramEditor({
  station,
  program,
  etag,
  isAdmin,
  publicationStatus,
  onSaved,
  onDeleted,
  onReload,
}: {
  station: Station;
  program: Program | null;
  etag: string;
  isAdmin: boolean;
  publicationStatus: ProgramPublicationState | null;
  onSaved: (programId: string) => void;
  onDeleted: () => void;
  onReload: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const existing = program !== null;
  const initial = useMemo(() => program ?? createProgram(), [program]);
  const [workingProgram, setWorkingProgram] = useState<Program>(initial);
  const [workingSchedule, setWorkingSchedule] = useState<ScheduleEntry[]>(() =>
    program ? schedulesForProgram(station, program.id) : [],
  );
  const [slugTouched, setSlugTouched] = useState(existing);
  const [dirty, setDirty] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Program = {
        ...workingProgram,
        slug: workingProgram.slug.trim().toLowerCase(),
        name: workingProgram.name.trim(),
        description: optional(workingProgram.description),
        hostName: optional(workingProgram.hostName),
        imageUrl: optional(workingProgram.imageUrl),
        isActive: workingProgram.isActive ?? true,
      };
      const schedule = workingSchedule.map((entry) => ({
        ...entry,
        showId: payload.id,
        startsAt: apiTime(displayTime(entry.startsAt)),
        endsAt: apiTime(displayTime(entry.endsAt)),
        isActive: entry.isActive ?? true,
      }));

      const nextStation = upsertProgram(station, payload, schedule);
      return putStation(nextStation, etag);
    },
    onSuccess: (result) => {
      setDirty(false);
      queryClient.setQueryData(adminQueryKeys.draft, result);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview }),
        queryClient.invalidateQueries({ queryKey: programsQueryKeys.status }),
      ]);
      onSaved(workingProgram.id);
    },
  });

  const error = save.error;
  const conflict = error instanceof ApiError && error.kind === "conflict";
  const imageUrl = workingProgram.imageUrl?.trim();
  const busy = save.isPending;

  function updateProgram(patch: Partial<Program>) {
    setDirty(true);
    setWorkingProgram((current) => ({ ...current, ...patch }));
  }

  function updateSchedule(id: string, patch: Partial<ScheduleEntry>) {
    setDirty(true);
    setWorkingSchedule((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  }

  return (
    <Paper className="program-mui-editor" elevation={0}>
      <Stack spacing={2.25}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "flex-start" }}
          spacing={1.5}
        >
          <Box>
            <Typography variant="overline" color="primary.main" fontWeight={800} letterSpacing="0.1em">
              {existing ? "Edit program" : "New program"}
            </Typography>
            <Typography variant="h5" fontWeight={850} sx={{ letterSpacing: "-0.035em" }}>
              {workingProgram.name || "Untitled program"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Save writes Program + Schedule to Draft. Publish is a separate operation that creates
              an immutable Mobile release for this program only.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {existing ? (
              <Chip
                color={publicationColor(publicationStatus)}
                label={publicationLabel(publicationStatus)}
                size="small"
              />
            ) : null}
            <Chip
              color={workingProgram.isActive ?? true ? "success" : "default"}
              label={workingProgram.isActive ?? true ? "Active" : "Inactive"}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${workingSchedule.length} slot${workingSchedule.length === 1 ? "" : "s"}`}
              size="small"
              variant="outlined"
            />
          </Stack>
        </Stack>

        {conflict ? (
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                size="small"
                startIcon={<RefreshCw size={15} />}
                onClick={() => {
                  void onReload();
                  save.reset();
                }}
              >
                Reload Draft
              </Button>
            }
          >
            The Draft changed while you were editing. Reload the current revision before saving;
            nothing will be overwritten.
          </Alert>
        ) : error ? (
          <Alert severity="error">
            <strong>Unable to save this program to Draft.</strong>{" "}
            {error instanceof Error ? error.message : "Unknown error"}
            {error instanceof ApiError && error.requestId ? ` · Request ID ${error.requestId}` : ""}
          </Alert>
        ) : null}

        {existing ? (
          <ProgramLifecycleActions
            stationId={station.id ?? ""}
            programId={workingProgram.id}
            title={workingProgram.name || "Program"}
            etag={etag}
            isAdmin={isAdmin}
            dirty={dirty}
            busy={busy}
            onDeleted={onDeleted}
          />
        ) : null}

        <Box className="program-editor-mui-workbench">
          <Stack spacing={2} minWidth={0}>
            <Paper className="program-editor-section" variant="outlined">
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
                <Box className="program-editor-section-icon"><ImageIcon size={17} /></Box>
                <Box>
                  <Typography fontWeight={800}>Program details</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Listener-facing metadata delivered by the published release.
                  </Typography>
                </Box>
              </Stack>

              <Box className="program-editor-fields">
                <TextField
                  label="Program name"
                  required
                  value={workingProgram.name}
                  inputProps={{ maxLength: 160 }}
                  onChange={(event) => {
                    const name = event.target.value;
                    setDirty(true);
                    setWorkingProgram((current) => ({
                      ...current,
                      name,
                      slug: slugTouched ? current.slug : slugify(name),
                    }));
                  }}
                  placeholder="El Show de LA Z"
                />
                <TextField
                  label="Slug"
                  required
                  disabled={existing}
                  value={workingProgram.slug}
                  inputProps={{ maxLength: 100, pattern: "[a-z0-9]+(?:-[a-z0-9]+)*" }}
                  helperText={
                    existing
                      ? "Existing program slugs remain stable."
                      : "Generated from the name; editable before first save."
                  }
                  onChange={(event) => {
                    setSlugTouched(true);
                    updateProgram({ slug: event.target.value.toLowerCase() });
                  }}
                  placeholder="el-show-de-la-z"
                />
                <TextField
                  label="Host"
                  value={workingProgram.hostName ?? ""}
                  inputProps={{ maxLength: 160 }}
                  onChange={(event) => updateProgram({ hostName: event.target.value })}
                  placeholder="Host name"
                />
                <Box className="program-field-span">
                  <ManagedImageField
                    value={workingProgram.imageUrl}
                    label="Program artwork"
                    pickerTitle="Choose program artwork"
                    description="Upload artwork or choose an existing managed asset."
                    onChange={(url) => updateProgram({ imageUrl: url })}
                  />
                </Box>
                <TextField
                  className="program-field-span"
                  label="Description"
                  multiline
                  minRows={4}
                  value={workingProgram.description ?? ""}
                  inputProps={{ maxLength: 5000 }}
                  onChange={(event) => updateProgram({ description: event.target.value })}
                  placeholder="Describe the program for listeners."
                />
                <Box className="program-field-span">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={workingProgram.isActive ?? true}
                        onChange={(event) => updateProgram({ isActive: event.target.checked })}
                      />
                    }
                    label="Active program"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", ml: 6 }}>
                    Active controls whether this program is emitted by public Radio endpoints after
                    publication. It does not mean the Draft is already live.
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Paper className="program-editor-section" variant="outlined">
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                spacing={1.5}
                sx={{ mb: 2 }}
              >
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box className="program-editor-section-icon"><CalendarClock size={17} /></Box>
                  <Box>
                    <Typography fontWeight={800}>Weekly schedule</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Station timezone: {station.timezone ?? "America/Detroit"}
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Plus size={15} />}
                  onClick={() => {
                    setDirty(true);
                    setWorkingSchedule((current) => [
                      ...current,
                      createScheduleEntry(workingProgram.id),
                    ]);
                  }}
                >
                  Add time
                </Button>
              </Stack>

              <Alert severity="info" icon={<Clock3 size={18} />} sx={{ mb: 1.5 }}>
                Monday = 0 and Sunday = 6 in the API. Overnight slots are supported; active slots
                across the station cannot overlap, including Sunday → Monday.
              </Alert>

              {workingSchedule.length ? (
                <Stack spacing={1}>
                  {workingSchedule.map((entry, index) => (
                    <Paper className="program-schedule-editor-row" variant="outlined" key={entry.id}>
                      <Typography variant="caption" color="text.secondary" fontWeight={800}>
                        SLOT {index + 1}
                      </Typography>
                      <TextField
                        select
                        size="small"
                        label="Day"
                        value={entry.weekday}
                        onChange={(event) =>
                          updateSchedule(entry.id, { weekday: Number(event.target.value) })
                        }
                      >
                        {WEEKDAYS.map((day, weekday) => (
                          <MenuItem key={day} value={weekday}>{day}</MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        size="small"
                        label="Starts"
                        type="time"
                        value={displayTime(entry.startsAt)}
                        InputLabelProps={{ shrink: true }}
                        onChange={(event) =>
                          updateSchedule(entry.id, { startsAt: apiTime(event.target.value) })
                        }
                      />
                      <TextField
                        size="small"
                        label="Ends"
                        type="time"
                        value={displayTime(entry.endsAt)}
                        InputLabelProps={{ shrink: true }}
                        onChange={(event) =>
                          updateSchedule(entry.id, { endsAt: apiTime(event.target.value) })
                        }
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={entry.isActive ?? true}
                            onChange={(event) =>
                              updateSchedule(entry.id, { isActive: event.target.checked })
                            }
                          />
                        }
                        label="Active"
                      />
                      <Tooltip title="Remove schedule slot">
                        <IconButton
                          color="error"
                          onClick={() => {
                            setDirty(true);
                            setWorkingSchedule((current) =>
                              current.filter((item) => item.id !== entry.id),
                            );
                          }}
                        >
                          <Trash2 size={17} />
                        </IconButton>
                      </Tooltip>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Box className="program-schedule-empty-mui">
                  <CalendarClock size={24} />
                  <Typography fontWeight={800}>No schedule yet</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add one or more weekly broadcast windows. The program can exist without a schedule.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Stack>

          <Paper className="program-mobile-preview-mui" variant="outlined">
            <Box className="program-mobile-preview-art">
              {imageUrl?.startsWith("https://") ? (
                <img alt="" referrerPolicy="no-referrer" src={imageUrl} />
              ) : (
                <Box className="program-mobile-preview-placeholder">
                  <strong>LA Z</strong>
                  <span>PROGRAM ARTWORK</span>
                </Box>
              )}
              <Chip
                className="program-preview-status-chip"
                color={workingProgram.isActive ?? true ? "success" : "default"}
                label={workingProgram.isActive ?? true ? "Active" : "Inactive"}
                size="small"
              />
            </Box>
            <Box sx={{ p: 2 }}>
              <Typography variant="overline" color="primary.main" fontWeight={800}>
                Mobile preview
              </Typography>
              <Typography variant="h6" fontWeight={850} sx={{ mt: 0.25 }}>
                {workingProgram.name || "Program name"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {workingProgram.hostName || "Host not assigned"}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={0.75}>
                {workingSchedule.length ? workingSchedule.map((entry) => (
                  <Stack direction="row" spacing={0.75} alignItems="center" key={entry.id}>
                    <Clock3 size={13} />
                    <Typography variant="caption" color="text.secondary">
                      {WEEKDAYS[entry.weekday].slice(0, 3)} · {displayTime(entry.startsAt)}–{displayTime(entry.endsAt)}
                    </Typography>
                  </Stack>
                )) : (
                  <Typography variant="caption" color="text.secondary">No schedule assigned</Typography>
                )}
              </Stack>
            </Box>
          </Paper>
        </Box>

        <Box className="program-editor-sticky-actions">
          <Box>
            <Typography variant="caption" color="text.secondary">
              Draft write protected by ETag
            </Typography>
            <Typography
              variant="caption"
              component="code"
              sx={{ display: "block", color: "text.disabled" }}
            >
              {etag}
            </Typography>
          </Box>
          <Button
            disabled={busy || (existing && !dirty)}
            variant="contained"
            startIcon={<Save size={16} />}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Saving…" : existing ? "Save Draft" : "Create Draft"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
