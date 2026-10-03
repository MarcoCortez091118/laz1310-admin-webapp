import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ApiError } from "../../api/errors";
import type { Station } from "../../api/types";
import { adminQueryKeys } from "../content/api";
import { putStation } from "./api";
import {
  apiTime,
  createProgram,
  createScheduleEntry,
  displayTime,
  type Program,
  removeProgram,
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

export function ProgramEditor({
  station,
  program,
  etag,
  onSaved,
  onDeleted,
  onReload,
}: {
  station: Station;
  program: Program | null;
  etag: string;
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
      queryClient.setQueryData(adminQueryKeys.draft, result);
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview });
      onSaved(workingProgram.id);
    },
  });

  const remove = useMutation({
    mutationFn: async () => putStation(removeProgram(station, workingProgram.id), etag),
    onSuccess: (result) => {
      queryClient.setQueryData(adminQueryKeys.draft, result);
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview });
      onDeleted();
    },
  });

  const error = save.error ?? remove.error;
  const conflict = error instanceof ApiError && error.kind === "conflict";
  const imageUrl = workingProgram.imageUrl?.trim();

  function updateSchedule(id: string, patch: Partial<ScheduleEntry>) {
    setWorkingSchedule((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  }

  return (
    <article className="panel program-editor">
      <div className="editor-heading">
        <div>
          <p className="eyebrow">{existing ? "Edit program" : "New program"}</p>
          <h2>{workingProgram.name || "Untitled program"}</h2>
          <p className="muted program-editor-intro">
            Program metadata and its schedule are saved atomically as one Station Draft mutation.
          </p>
        </div>
        {existing ? (
          <button
            className="danger-button"
            disabled={remove.isPending || save.isPending}
            onClick={() => {
              if (
                window.confirm(
                  `Delete "${workingProgram.name}" and all of its schedule entries from the Draft?`,
                )
              ) {
                remove.mutate();
              }
            }}
            type="button"
          >
            <Trash2 size={16} />
            Delete
          </button>
        ) : null}
      </div>

      {conflict ? (
        <div className="conflict-banner">
          <div>
            <strong>The Draft changed while you were editing.</strong>
            <span>Reload the current revision before saving. Nothing will be overwritten.</span>
          </div>
          <button
            onClick={() => {
              void onReload();
              save.reset();
              remove.reset();
            }}
            type="button"
          >
            <RefreshCw size={16} />
            Reload Draft
          </button>
        </div>
      ) : error ? (
        <div className="error-banner">
          <div>
            <strong>Unable to update this program.</strong>
            <span>{error instanceof Error ? error.message : "Unknown error"}</span>
            {error instanceof ApiError && error.requestId ? (
              <code>Request ID: {error.requestId}</code>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="program-workbench">
        <div className="program-form-column">
          <section className="program-section">
            <div className="program-section-heading">
              <div className="program-section-icon"><ImageIcon size={17} /></div>
              <div>
                <strong>Program details</strong>
                <span>Information displayed in the mobile app.</span>
              </div>
            </div>

            <div className="program-form-grid">
              <label>
                Program name
                <input
                  maxLength={160}
                  onChange={(event) => {
                    const name = event.target.value;
                    setWorkingProgram((current) => ({
                      ...current,
                      name,
                      slug: slugTouched ? current.slug : slugify(name),
                    }));
                  }}
                  placeholder="El Show de LA Z"
                  value={workingProgram.name}
                />
              </label>
              <label>
                Slug
                <input
                  disabled={existing}
                  maxLength={100}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setWorkingProgram((current) => ({
                      ...current,
                      slug: event.target.value,
                    }));
                  }}
                  placeholder="el-show-de-la-z"
                  value={workingProgram.slug}
                />
                <small>{existing ? "Existing program slugs remain stable." : "Generated from the name; you may edit it before saving."}</small>
              </label>
              <label>
                Host
                <input
                  maxLength={160}
                  onChange={(event) =>
                    setWorkingProgram((current) => ({
                      ...current,
                      hostName: event.target.value,
                    }))
                  }
                  placeholder="Host name"
                  value={workingProgram.hostName ?? ""}
                />
              </label>
              <label>
                Artwork URL
                <input
                  inputMode="url"
                  maxLength={2048}
                  onChange={(event) =>
                    setWorkingProgram((current) => ({
                      ...current,
                      imageUrl: event.target.value,
                    }))
                  }
                  placeholder="https://.../program.webp"
                  value={workingProgram.imageUrl ?? ""}
                />
                <small>HTTPS only. Media Library integration will replace manual URLs later.</small>
              </label>
              <label className="field-span">
                Description
                <textarea
                  maxLength={5000}
                  onChange={(event) =>
                    setWorkingProgram((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe the program for listeners."
                  rows={4}
                  value={workingProgram.description ?? ""}
                />
              </label>
              <label className="program-switch field-span">
                <input
                  checked={workingProgram.isActive ?? true}
                  onChange={(event) =>
                    setWorkingProgram((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>
                  <strong>Active program</strong>
                  <small>Inactive programs remain in the Draft but are omitted from the active schedule.</small>
                </span>
              </label>
            </div>
          </section>

          <section className="program-section">
            <div className="program-section-heading split-heading">
              <div className="program-section-heading-copy">
                <div className="program-section-icon"><CalendarClock size={17} /></div>
                <div>
                  <strong>Weekly schedule</strong>
                  <span>Station timezone: {station.timezone ?? "America/Detroit"}</span>
                </div>
              </div>
              <button
                className="secondary-button"
                onClick={() =>
                  setWorkingSchedule((current) => [
                    ...current,
                    createScheduleEntry(workingProgram.id),
                  ])
                }
                type="button"
              >
                <Plus size={15} />
                Add time
              </button>
            </div>

            {workingSchedule.length ? (
              <div className="schedule-editor-list">
                {workingSchedule.map((entry) => (
                  <div className="schedule-editor-row" key={entry.id}>
                    <label>
                      <span>Day</span>
                      <select
                        onChange={(event) =>
                          updateSchedule(entry.id, { weekday: Number(event.target.value) })
                        }
                        value={entry.weekday}
                      >
                        {WEEKDAYS.map((day, index) => (
                          <option key={day} value={index}>{day}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Starts</span>
                      <input
                        onChange={(event) =>
                          updateSchedule(entry.id, { startsAt: apiTime(event.target.value) })
                        }
                        type="time"
                        value={displayTime(entry.startsAt)}
                      />
                    </label>
                    <label>
                      <span>Ends</span>
                      <input
                        onChange={(event) =>
                          updateSchedule(entry.id, { endsAt: apiTime(event.target.value) })
                        }
                        type="time"
                        value={displayTime(entry.endsAt)}
                      />
                    </label>
                    <label className="schedule-active">
                      <input
                        checked={entry.isActive ?? true}
                        onChange={(event) =>
                          updateSchedule(entry.id, { isActive: event.target.checked })
                        }
                        type="checkbox"
                      />
                      <span>Active</span>
                    </label>
                    <button
                      aria-label="Remove schedule entry"
                      className="icon-button danger-ghost"
                      onClick={() =>
                        setWorkingSchedule((current) =>
                          current.filter((item) => item.id !== entry.id),
                        )
                      }
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="schedule-empty">
                <CalendarClock size={22} />
                <strong>No schedule yet</strong>
                <span>Add one or more broadcast times. Overnight schedules are supported.</span>
              </div>
            )}
          </section>
        </div>

        <aside className="program-preview-card" aria-label="Mobile program preview">
          <div className="program-preview-art">
            {imageUrl?.startsWith("https://") ? (
              <img alt="" referrerPolicy="no-referrer" src={imageUrl} />
            ) : (
              <div className="program-preview-placeholder">
                <span>LA Z</span>
                <small>PROGRAM ARTWORK</small>
              </div>
            )}
            <span className={workingProgram.isActive ?? true ? "program-state active" : "program-state"}>
              {workingProgram.isActive ?? true ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="program-preview-copy">
            <p className="eyebrow">Mobile preview</p>
            <h3>{workingProgram.name || "Program name"}</h3>
            <p>{workingProgram.hostName || "Host not assigned"}</p>
            <div className="program-preview-schedule">
              {workingSchedule.length ? workingSchedule.map((entry) => (
                <span key={entry.id}>
                  {WEEKDAYS[entry.weekday].slice(0, 3)} · {displayTime(entry.startsAt)}–{displayTime(entry.endsAt)}
                </span>
              )) : <span>No schedule assigned</span>}
            </div>
          </div>
        </aside>
      </div>

      <div className="editor-actions">
        <span className="muted">
          Saving updates Draft only and is protected by <code>{etag}</code>.
        </span>
        <button
          disabled={save.isPending || remove.isPending}
          onClick={() => save.mutate()}
          type="button"
        >
          {save.isPending ? "Saving…" : existing ? "Save program" : "Create program"}
        </button>
      </div>
    </article>
  );
}
