import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  CalendarDays,
  Clock3,
  ListMusic,
  Plus,
  Radio,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Station } from "../../api/types";
import { useStaff } from "../auth/StaffGate";
import { useDraftQuery } from "../content/queries";
import type { ProgramPublicationState } from "./api";
import { ProgramEditor } from "./ProgramEditor";
import {
  displayTime,
  programsForStation,
  type Program,
  schedulesForProgram,
  WEEKDAYS,
} from "./model";
import { ProgramsTrashDialog } from "./ProgramsTrashDialog";
import { useProgramPublicationStatusQuery } from "./queries";
import "./programs.css";

type ProgramStatus = "all" | "active" | "inactive";
type ProgramsView = "catalog" | "schedule";

function scheduleSummary(station: Station, program: Program): string {
  const entries = schedulesForProgram(station, program.id);
  if (!entries.length) return "No schedule assigned";
  return (
    entries
      .slice(0, 3)
      .map(
        (entry) =>
          `${WEEKDAYS[entry.weekday].slice(0, 3)} ${displayTime(entry.startsAt)}–${displayTime(entry.endsAt)}`,
      )
      .join(" · ") + (entries.length > 3 ? ` +${entries.length - 3}` : "")
  );
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

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  helper: string;
}) {
  return (
    <Paper className="program-mui-metric" elevation={0}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box className="program-mui-metric-icon">{icon}</Box>
        <Box minWidth={0}>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography variant="h5" fontWeight={800} sx={{ mt: 0.25, letterSpacing: "-0.03em" }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">{helper}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export function ProgramsPage() {
  const staff = useStaff();
  const isAdmin = staff.roles.includes("admin");
  const draft = useDraftQuery();
  const publicationStatus = useProgramPublicationStatusQuery();
  const stations = useMemo(() => draft.data?.data.catalog?.stations ?? [], [draft.data]);
  const [stationId, setStationId] = useState<string>("");
  const [selection, setSelection] = useState<string | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProgramStatus>("all");
  const [view, setView] = useState<ProgramsView>("catalog");
  const [trashOpen, setTrashOpen] = useState(false);

  useEffect(() => {
    const firstStationId = stations[0]?.id;
    if (!stationId && firstStationId) setStationId(firstStationId);
  }, [stationId, stations]);

  const station = useMemo(
    () => stations.find((item) => item.id === stationId) ?? stations[0] ?? null,
    [stationId, stations],
  );

  const publicationByKey = useMemo(
    () =>
      new Map(
        (publicationStatus.data?.data ?? []).map((item) => [
          `${item.stationId}:${item.programId}`,
          item.status,
        ]),
      ),
    [publicationStatus.data],
  );

  const programPublication = (programId: string): ProgramPublicationState | null => {
    if (!station?.id) return null;
    return publicationByKey.get(`${station.id}:${programId}`) ?? "draft";
  };

  const allPrograms = useMemo(() => (station ? programsForStation(station) : []), [station]);

  const programs = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return allPrograms
      .filter((program) => {
        const active = program.isActive ?? true;
        const matchStatus = status === "all" || (status === "active" ? active : !active);
        const matchSearch =
          !normalized ||
          program.name.toLowerCase().includes(normalized) ||
          (program.hostName ?? "").toLowerCase().includes(normalized) ||
          program.slug.toLowerCase().includes(normalized);
        return matchStatus && matchSearch;
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [allPrograms, search, status]);

  const selected = useMemo(
    () =>
      selection && selection !== "new"
        ? allPrograms.find((program) => program.id === selection) ?? null
        : null,
    [allPrograms, selection],
  );

  const weeklySchedule = useMemo(() => {
    if (!station) {
      return WEEKDAYS.map(
        () => [] as Array<{
          id: string;
          showId: string;
          startsAt: string;
          endsAt: string;
          isActive?: boolean;
        }>,
      );
    }
    return WEEKDAYS.map((_, weekday) =>
      (station.schedule ?? [])
        .filter((entry) => entry.id && entry.showId && entry.weekday === weekday)
        .map((entry) => ({
          id: entry.id ?? "",
          showId: entry.showId,
          startsAt: entry.startsAt,
          endsAt: entry.endsAt,
          isActive: entry.isActive,
        }))
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    );
  }, [station]);

  if (draft.isPending) {
    return (
      <Box className="modern-page">
        <Stack spacing={2}>
          <Skeleton height={44} width="35%" />
          <Skeleton height={96} variant="rounded" />
          <Skeleton height={420} variant="rounded" />
        </Stack>
      </Box>
    );
  }

  if (draft.error || !draft.data) {
    return (
      <Box className="modern-page">
        <Alert
          severity="error"
          action={<Button color="inherit" onClick={() => void draft.refetch()} size="small">Retry</Button>}
        >
          {draft.error instanceof Error ? draft.error.message : "Unable to load the Programs Draft."}
        </Alert>
      </Box>
    );
  }

  const etag = draft.data.etag;
  if (!etag) {
    return (
      <Box className="modern-page">
        <Alert severity="warning">
          Draft ETag is missing. Program writes are disabled because optimistic concurrency cannot
          be enforced safely.
        </Alert>
      </Box>
    );
  }

  if (!stations.length || !station) {
    return (
      <Box className="modern-page">
        <Paper className="program-empty-state" elevation={0}>
          <Radio size={28} />
          <Typography variant="h5" fontWeight={800}>Create a station before adding programs.</Typography>
          <Typography color="text.secondary">
            Programs and weekly schedule entries belong to a radio station and cannot exist without one.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const activeCount = allPrograms.filter((program) => program.isActive ?? true).length;
  const inactiveCount = allPrograms.length - activeCount;
  const scheduleSlots = (station.schedule ?? []).length;
  const scheduledPrograms = new Set((station.schedule ?? []).map((entry) => entry.showId)).size;
  const liveCount = allPrograms.filter((program) => programPublication(program.id) === "live").length;
  const pendingCount = allPrograms.filter(
    (program) => programPublication(program.id) === "changes_pending",
  ).length;

  return (
    <Box className="modern-page programs-mui-page">
      <Stack spacing={2.25}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "flex-end" }}
          spacing={2}
        >
          <Box>
            <Typography variant="overline" color="primary.main" fontWeight={800} letterSpacing="0.12em">
              Content · Draft #{draft.data.data.revision ?? "—"}
            </Typography>
            <Typography variant="h4" fontWeight={850} sx={{ letterSpacing: "-0.04em" }}>
              Programs
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 800 }}>
              Save changes to Draft, then publish each Program independently. Active/Inactive is an
              operational flag; Draft/Live/Changes pending describes what Mobile actually receives.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              startIcon={<Trash2 size={17} />}
              variant="outlined"
              onClick={() => setTrashOpen(true)}
            >
              Trash
            </Button>
            <Button
              startIcon={<Plus size={17} />}
              variant="contained"
              onClick={() => {
                setSelection("new");
                setView("catalog");
              }}
            >
              New program
            </Button>
          </Stack>
        </Stack>

        {publicationStatus.error ? (
          <Alert severity="warning" action={<Button color="inherit" onClick={() => void publicationStatus.refetch()}>Retry</Button>}>
            Publication state could not be loaded. Draft editing remains available, but Live status
            cannot be verified until this request succeeds.
          </Alert>
        ) : null}

        <Box className="program-mui-metrics">
          <MetricCard
            icon={<UsersRound size={18} />}
            label="Active programs"
            value={activeCount}
            helper={`${inactiveCount} inactive · ${liveCount} live · ${pendingCount} pending`}
          />
          <MetricCard
            icon={<CalendarDays size={18} />}
            label="Scheduled programs"
            value={scheduledPrograms}
            helper={`${scheduleSlots} weekly slot${scheduleSlots === 1 ? "" : "s"}`}
          />
          <MetricCard
            icon={<Clock3 size={18} />}
            label="Station timezone"
            value={station.timezone ?? "America/Detroit"}
            helper="Schedule uses local station time"
          />
          <Paper className="program-mui-metric program-station-control" elevation={0}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Station</Typography>
            <FormControl fullWidth size="small">
              <Select
                value={station.id ?? ""}
                onChange={(event) => {
                  setStationId(event.target.value);
                  setSelection(null);
                }}
              >
                {stations.map((item) => (
                  <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        </Box>

        <Paper className="program-toolbar-mui" elevation={0}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", lg: "center" }}
          >
            <TextField
              size="small"
              placeholder="Search program, host, or slug"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ minWidth: { xs: "100%", lg: 330 } }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search size={17} /></InputAdornment>,
              }}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={status}
                onChange={(_, next: ProgramStatus | null) => next && setStatus(next)}
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="active">Active</ToggleButton>
                <ToggleButton value="inactive">Inactive</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={view}
                onChange={(_, next: ProgramsView | null) => next && setView(next)}
              >
                <ToggleButton value="catalog"><ListMusic size={15} />&nbsp;Catalog</ToggleButton>
                <ToggleButton value="schedule"><CalendarDays size={15} />&nbsp;Week</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>
        </Paper>

        {view === "schedule" ? (
          <Paper className="program-week-board" elevation={0}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Weekly schedule</Typography>
                <Typography variant="body2" color="text.secondary">
                  {station.name} · {station.timezone ?? "America/Detroit"}
                </Typography>
              </Box>
              <Chip label={`${scheduleSlots} slots`} size="small" />
            </Stack>
            <Box className="program-week-grid">
              {weeklySchedule.map((entries, weekday) => (
                <Box className="program-day-column" key={WEEKDAYS[weekday]}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                    {WEEKDAYS[weekday]}
                  </Typography>
                  <Stack spacing={1}>
                    {entries.length ? entries.map((entry) => {
                      const show = allPrograms.find((program) => program.id === entry.showId);
                      const publication = show ? programPublication(show.id) : null;
                      return (
                        <Card key={entry.id} className="program-schedule-card" variant="outlined">
                          <CardActionArea
                            onClick={() => {
                              if (show) {
                                setSelection(show.id);
                                setView("catalog");
                              }
                            }}
                            disabled={!show}
                          >
                            <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
                              <Stack spacing={0.5}>
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                  <Clock3 size={14} />
                                  <Typography variant="caption" fontWeight={800}>
                                    {displayTime(entry.startsAt)}–{displayTime(entry.endsAt)}
                                  </Typography>
                                </Stack>
                                <Typography variant="body2" fontWeight={750} noWrap>
                                  {show?.name ?? "Missing program reference"}
                                </Typography>
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                  {show ? (
                                    <Chip
                                      size="small"
                                      color={publicationColor(publication)}
                                      label={publicationLabel(publication)}
                                    />
                                  ) : null}
                                  {!entry.isActive ? <Chip label="Inactive slot" size="small" /> : null}
                                </Stack>
                              </Stack>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      );
                    }) : (
                      <Typography variant="caption" color="text.disabled">No programming</Typography>
                    )}
                  </Stack>
                </Box>
              ))}
            </Box>
          </Paper>
        ) : (
          <Box className="programs-mui-layout">
            <Box className="programs-mui-list" aria-label="Programs catalog">
              {programs.length ? programs.map((program) => {
                const active = program.isActive ?? true;
                const publication = programPublication(program.id);
                return (
                  <Card
                    key={program.id}
                    className={selection === program.id ? "program-mui-card selected" : "program-mui-card"}
                    variant="outlined"
                  >
                    <CardActionArea onClick={() => setSelection(program.id)}>
                      <Box className="program-mui-art-wrap">
                        {program.imageUrl ? (
                          <CardMedia component="img" height="130" image={program.imageUrl} alt="" />
                        ) : (
                          <Box className="program-mui-placeholder">LA Z</Box>
                        )}
                        <Chip
                          className="program-mui-status-chip"
                          color={publicationColor(publication)}
                          label={publicationLabel(publication)}
                          size="small"
                        />
                      </Box>
                      <CardContent sx={{ p: 1.75 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ flex: 1 }}>
                            {program.name}
                          </Typography>
                          <Chip
                            size="small"
                            color={active ? "success" : "default"}
                            variant="outlined"
                            label={active ? "Active" : "Inactive"}
                          />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {program.hostName || "No host assigned"}
                        </Typography>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1.25 }}>
                          <CalendarDays size={14} />
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {scheduleSummary(station, program)}
                          </Typography>
                        </Stack>
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ mt: 0.75, display: "block" }}
                          noWrap
                        >
                          /{program.slug}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              }) : (
                <Paper className="program-empty-state compact" elevation={0}>
                  <ListMusic size={24} />
                  <Typography fontWeight={800}>No programs found</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Adjust filters or create a new program.
                  </Typography>
                </Paper>
              )}
            </Box>

            <Box minWidth={0}>
              {selection === "new" || selected ? (
                <ProgramEditor
                  etag={etag}
                  isAdmin={isAdmin}
                  key={`${station.id ?? "station"}-${selection ?? "none"}-${draft.data.data.revision ?? 0}`}
                  onDeleted={() => setSelection(null)}
                  onReload={async () => draft.refetch()}
                  onSaved={(programId) => setSelection(programId)}
                  program={selection === "new" ? null : selected}
                  publicationStatus={selected ? programPublication(selected.id) : null}
                  station={station}
                />
              ) : (
                <Paper className="program-empty-state editor" elevation={0}>
                  <ListMusic size={28} />
                  <Typography variant="h6" fontWeight={800}>Select a program to edit</Typography>
                  <Typography color="text.secondary" textAlign="center" maxWidth={520}>
                    Save to Draft, then publish that Program independently. Mobile only reads the
                    immutable published release.
                  </Typography>
                </Paper>
              )}
            </Box>
          </Box>
        )}
      </Stack>

      <ProgramsTrashDialog
        etag={etag}
        isAdmin={isAdmin}
        onClose={() => setTrashOpen(false)}
        open={trashOpen}
      />
    </Box>
  );
}
