import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  FileCheck2,
  Image as ImageIcon,
  Images,
  Link2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ApiError } from "../../api/errors";
import type { Dynamic } from "../../api/types";
import { adminQueryKeys } from "../content/api";
import { MediaPickerDialog } from "../media/MediaPickerDialog";
import { deleteDynamic, putDynamic } from "./api";
import {
  createDynamic,
  createFormField,
  FIELD_TYPES,
  isoToZonedLocal,
  normalizeDynamic,
  slugify,
  type DynamicFormField,
  validateDynamic,
  zonedLocalToIso,
} from "./model";

export function DynamicEditor({
  dynamic,
  etag,
  onSaved,
  onDeleted,
  onReload,
}: {
  dynamic: Dynamic | null;
  etag: string;
  onSaved: (dynamicId: string) => void;
  onDeleted: () => void;
  onReload: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const existing = dynamic !== null;
  const initial = useMemo(() => dynamic ?? createDynamic(), [dynamic]);
  const [working, setWorking] = useState<Dynamic>(initial);
  const [slugTouched, setSlugTouched] = useState(existing);
  const [localIssues, setLocalIssues] = useState<string[]>([]);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const payload = normalizeDynamic(working);
      const issues = validateDynamic(payload);
      if (issues.length) {
        setLocalIssues(issues);
        throw new Error("Resolve the validation issues before saving.");
      }
      setLocalIssues([]);
      return putDynamic(payload, etag);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(adminQueryKeys.draft, result);
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview });
      if (working.id) onSaved(working.id);
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!working.id) throw new Error("Dynamic ID is missing.");
      return deleteDynamic(working.id, etag);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(adminQueryKeys.draft, result);
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview });
      onDeleted();
    },
  });

  const error = save.error ?? remove.error;
  const conflict = error instanceof ApiError && error.kind === "conflict";
  const fields = working.participation.fields ?? [];
  const timezone = working.timezone || "America/Detroit";

  function updateField(index: number, patch: Partial<DynamicFormField>) {
    setWorking((current) => ({
      ...current,
      participation: {
        ...current.participation,
        fields: (current.participation.fields ?? []).map((field, fieldIndex) =>
          fieldIndex === index ? { ...field, ...patch } : field,
        ),
      },
    }));
  }

  function removeField(index: number) {
    setWorking((current) => ({
      ...current,
      participation: {
        ...current.participation,
        fields: (current.participation.fields ?? []).filter((_, fieldIndex) => fieldIndex !== index),
      },
    }));
  }

  function setParticipationMode(mode: "form" | "external_url") {
    setWorking((current) => ({
      ...current,
      participation:
        mode === "form"
          ? {
              type: "form",
              url: null,
              requiresAuth: false,
              fields: current.participation.type === "form" && current.participation.fields?.length
                ? current.participation.fields
                : [createFormField("email")],
            }
          : {
              type: "external_url",
              url: current.participation.type === "external_url" ? current.participation.url : "",
              requiresAuth: false,
              fields: [],
            },
    } as Dynamic));
  }

  const imageUrl = working.imageUrl?.trim();

  return (
    <article className="panel dynamic-editor">
      <div className="editor-heading">
        <div>
          <p className="eyebrow">{existing ? "Edit dynamic" : "New dynamic"}</p>
          <h2>{working.title || "Untitled dynamic"}</h2>
          <p className="muted">
            Saved to Draft only. Mobile receives this campaign after an administrator publishes a release.
          </p>
        </div>
        {existing ? (
          <button
            className="danger-button"
            disabled={remove.isPending || save.isPending}
            onClick={() => {
              if (window.confirm(`Delete “${working.title}” from the Draft? Existing participation records are not deleted by this action.`)) {
                remove.mutate();
              }
            }}
            type="button"
          >
            <Trash2 size={16} /> Delete
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
            <RefreshCw size={16} /> Reload Draft
          </button>
        </div>
      ) : null}

      {localIssues.length ? (
        <div className="error-banner dynamic-validation-banner">
          <div>
            <strong>Campaign configuration is incomplete.</strong>
            <ul>{localIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
          </div>
        </div>
      ) : error && !conflict ? (
        <div className="error-banner">
          <div>
            <strong>Unable to update this dynamic.</strong>
            <span>{error instanceof Error ? error.message : "Unknown error"}</span>
            {error instanceof ApiError && error.requestId ? <code>Request ID: {error.requestId}</code> : null}
          </div>
        </div>
      ) : null}

      <div className="dynamic-workbench">
        <div className="dynamic-form-column">
          <section className="dynamic-section">
            <div className="dynamic-section-heading">
              <span className="dynamic-section-icon"><Sparkles size={17} /></span>
              <div><strong>Campaign identity</strong><span>What listeners see in the app.</span></div>
            </div>
            <div className="dynamic-form-grid">
              <label>
                Title
                <input
                  maxLength={160}
                  onChange={(event) => {
                    const title = event.target.value;
                    setWorking((current) => ({
                      ...current,
                      title,
                      slug: slugTouched ? current.slug : slugify(title),
                    }));
                  }}
                  placeholder="Win tickets with LA Z"
                  value={working.title}
                />
              </label>
              <label>
                Slug
                <input
                  disabled={existing}
                  maxLength={100}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setWorking((current) => ({ ...current, slug: event.target.value }));
                  }}
                  placeholder="win-tickets-with-la-z"
                  value={working.slug}
                />
                <small>{existing ? "Existing slugs stay stable." : "Used in app routing and public URLs."}</small>
              </label>
              <label>
                Artwork label
                <input
                  maxLength={80}
                  onChange={(event) => setWorking((current) => ({ ...current, artworkLabel: event.target.value }))}
                  value={working.artworkLabel ?? ""}
                />
              </label>
              <label>
                Context
                <input
                  maxLength={100}
                  onChange={(event) => setWorking((current) => ({ ...current, context: event.target.value }))}
                  value={working.context ?? ""}
                />
              </label>
              <label className="full-span">
                Description
                <textarea
                  maxLength={5000}
                  onChange={(event) => setWorking((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  value={working.description}
                />
              </label>
              <label className="full-span">
                Instructions
                <textarea
                  maxLength={5000}
                  onChange={(event) => setWorking((current) => ({ ...current, instructions: event.target.value }))}
                  rows={4}
                  value={working.instructions}
                />
              </label>
            </div>
          </section>

          <section className="dynamic-section">
            <div className="dynamic-section-heading">
              <span className="dynamic-section-icon"><ImageIcon size={17} /></span>
              <div><strong>Artwork</strong><span>Use a managed asset whenever possible.</span></div>
            </div>
            <div className="dynamic-artwork-row">
              <div className="dynamic-artwork-preview">
                {imageUrl ? <img alt="Dynamic artwork preview" referrerPolicy="no-referrer" src={imageUrl} /> : <span>LA Z</span>}
              </div>
              <div className="dynamic-artwork-controls">
                <label>
                  Image URL
                  <input
                    onChange={(event) => setWorking((current) => ({ ...current, imageUrl: event.target.value }))}
                    placeholder="https://..."
                    value={working.imageUrl}
                  />
                </label>
                <button className="secondary-button" onClick={() => setMediaPickerOpen(true)} type="button">
                  <Images size={16} /> Choose from Media Library
                </button>
              </div>
            </div>
          </section>

          <section className="dynamic-section">
            <div className="dynamic-section-heading">
              <span className="dynamic-section-icon"><CalendarClock size={17} /></span>
              <div><strong>Schedule</strong><span>Editorial times are entered in the selected IANA timezone.</span></div>
            </div>
            <div className="dynamic-form-grid">
              <label>
                Starts
                <input
                  onChange={(event) => {
                    const iso = zonedLocalToIso(event.target.value, timezone);
                    if (iso) setWorking((current) => ({ ...current, startsAt: iso }));
                  }}
                  type="datetime-local"
                  value={isoToZonedLocal(working.startsAt, timezone)}
                />
              </label>
              <label>
                Ends
                <input
                  onChange={(event) => {
                    const iso = zonedLocalToIso(event.target.value, timezone);
                    if (iso) setWorking((current) => ({ ...current, endsAt: iso }));
                  }}
                  type="datetime-local"
                  value={isoToZonedLocal(working.endsAt, timezone)}
                />
              </label>
              <label className="full-span">
                Timezone
                <input
                  maxLength={64}
                  onChange={(event) => setWorking((current) => ({ ...current, timezone: event.target.value }))}
                  placeholder="America/Detroit"
                  value={working.timezone}
                />
                <small>Example: America/Detroit. FastAPI validates the IANA timezone.</small>
              </label>
            </div>
            <div className="dynamic-toggle-grid">
              <label className="dynamic-toggle-card">
                <input
                  checked={working.featured ?? false}
                  onChange={(event) => setWorking((current) => ({ ...current, featured: event.target.checked }))}
                  type="checkbox"
                />
                <span><strong>Featured</strong><small>Prioritize this campaign in Mobile.</small></span>
              </label>
              <label className="dynamic-toggle-card">
                <input
                  checked={(working.status ?? "active") === "active"}
                  onChange={(event) => setWorking((current) => ({ ...current, status: event.target.checked ? "active" : "closed" }))}
                  type="checkbox"
                />
                <span><strong>Campaign active</strong><small>Closing stops new participation.</small></span>
              </label>
            </div>
          </section>

          <section className="dynamic-section">
            <div className="dynamic-section-heading">
              <span className="dynamic-section-icon"><UsersRound size={17} /></span>
              <div><strong>Participation</strong><span>Choose an internal form or send users to an approved external HTTPS URL.</span></div>
            </div>
            <div className="dynamic-mode-tabs" role="tablist" aria-label="Participation mode">
              <button className={working.participation.type === "form" ? "selected" : ""} onClick={() => setParticipationMode("form")} type="button">Internal form</button>
              <button className={working.participation.type === "external_url" ? "selected" : ""} onClick={() => setParticipationMode("external_url")} type="button">External URL</button>
            </div>

            {working.participation.type === "external_url" ? (
              <label className="dynamic-external-url">
                <span><Link2 size={15} /> Participation URL</span>
                <input
                  onChange={(event) => setWorking((current) => ({
                    ...current,
                    participation: { ...current.participation, url: event.target.value },
                  } as Dynamic))}
                  placeholder="https://..."
                  value={working.participation.url ?? ""}
                />
              </label>
            ) : (
              <div className="dynamic-form-builder">
                <label className="dynamic-toggle-card compact">
                  <input
                    checked={working.participation.requiresAuth ?? false}
                    onChange={(event) => setWorking((current) => ({
                      ...current,
                      participation: { ...current.participation, requiresAuth: event.target.checked },
                    }))}
                    type="checkbox"
                  />
                  <span><strong>Require signed-in user</strong><small>Anonymous forms otherwise require a required email or phone field.</small></span>
                </label>

                <div className="dynamic-field-list">
                  {fields.map((field, index) => (
                    <div className="dynamic-field-row" key={`${field.key}-${index}`}>
                      <label>
                        Key
                        <input maxLength={40} onChange={(event) => updateField(index, { key: event.target.value.toLowerCase() })} value={field.key} />
                      </label>
                      <label>
                        Type
                        <select onChange={(event) => updateField(index, { type: event.target.value as DynamicFormField["type"] })} value={field.type}>
                          {FIELD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </label>
                      <label className="dynamic-field-label">
                        Label
                        <input maxLength={100} onChange={(event) => updateField(index, { label: event.target.value })} value={field.label} />
                      </label>
                      <label className="dynamic-field-required">
                        <input checked={field.required ?? false} onChange={(event) => updateField(index, { required: event.target.checked })} type="checkbox" /> Required
                      </label>
                      <button aria-label={`Remove ${field.label || "field"}`} className="icon-button" onClick={() => removeField(index)} type="button"><X size={16} /></button>
                    </div>
                  ))}
                </div>

                <button
                  className="secondary-button dynamic-add-field"
                  disabled={fields.length >= 12}
                  onClick={() => setWorking((current) => ({
                    ...current,
                    participation: {
                      ...current.participation,
                      fields: [...(current.participation.fields ?? []), createFormField()],
                    },
                  }))}
                  type="button"
                >
                  <Plus size={16} /> Add field
                </button>
              </div>
            )}
          </section>

          <section className="dynamic-section">
            <div className="dynamic-section-heading">
              <span className="dynamic-section-icon"><ShieldCheck size={17} /></span>
              <div><strong>Consent & compliance</strong><span>These URLs are snapshotted with accepted participation evidence.</span></div>
            </div>
            <div className="dynamic-form-grid">
              <label>
                Terms URL
                <input onChange={(event) => setWorking((current) => ({ ...current, termsUrl: event.target.value }))} placeholder="https://..." value={working.termsUrl} />
              </label>
              <label>
                Privacy URL
                <input onChange={(event) => setWorking((current) => ({ ...current, privacyUrl: event.target.value }))} placeholder="https://..." value={working.privacyUrl} />
              </label>
              <label>
                Consent version
                <input maxLength={64} onChange={(event) => setWorking((current) => ({ ...current, consentVersion: event.target.value }))} value={working.consentVersion ?? "1"} />
              </label>
            </div>
          </section>
        </div>

        <aside className="dynamic-preview-column">
          <div className="dynamic-preview-sticky">
            <p className="eyebrow">Mobile preview</p>
            <div className="dynamic-mobile-card">
              <div className="dynamic-mobile-art">
                {imageUrl ? <img alt="" referrerPolicy="no-referrer" src={imageUrl} /> : <span>LA Z</span>}
                <small>{working.artworkLabel || "PROMOCIÓN"}</small>
              </div>
              <div className="dynamic-mobile-copy">
                <span>{working.context || "LA Z 1310"}</span>
                <strong>{working.title || "Untitled dynamic"}</strong>
                <p>{working.description || "Campaign description will appear here."}</p>
                <button type="button" tabIndex={-1}>{working.participation.type === "form" ? "Participate" : "Open promotion"}</button>
              </div>
            </div>
            <div className="dynamic-preview-note"><FileCheck2 size={16} /><span>Preview is local. FastAPI remains authoritative for validation and publication.</span></div>
          </div>
        </aside>
      </div>

      <div className="editor-actions dynamic-editor-actions">
        <span className="muted">{existing ? "Saving creates a new Draft revision." : "New campaigns remain invisible to Mobile until Publish."}</span>
        <button disabled={save.isPending || remove.isPending} onClick={() => save.mutate()} type="button">
          {save.isPending ? "Saving…" : existing ? "Save changes" : "Create dynamic"}
        </button>
      </div>

      <MediaPickerDialog
        currentUrl={working.imageUrl}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(asset) => setWorking((current) => ({ ...current, imageUrl: asset.url }))}
        open={mediaPickerOpen}
      />
    </article>
  );
}
