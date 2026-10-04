import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Dynamic } from "../../api/types";
import { ApiError } from "../../api/errors";
import { adminQueryKeys } from "../content/api";
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
    <article className="panel dynamic-editor">
      <div className="dynamic-editor-heading">
        <div>
          <p className="eyebrow">{dynamic ? "Edit campaign" : "New campaign"}</p>
          <h2>{dynamic?.title ?? "Create a Dynamic"}</h2>
          <p className="muted">Writes update only the Draft. Publish remains a separate immutable release step.</p>
        </div>
        <code>{form.id}</code>
      </div>

      {error ? <div className="dynamic-error" role="alert">{error}</div> : null}

      <form
        className="dynamic-form"
        onSubmit={(event) => {
          event.preventDefault();
          const validation = validateDynamicForm(form, allDynamics, originalId);
          setClientError(validation);
          if (!validation) void saveMutation.mutateAsync();
        }}
      >
        <fieldset disabled={busy}>
          <legend>Campaign identity</legend>
          <div className="dynamic-grid two">
            <label>
              <span>Title</span>
              <input maxLength={160} onChange={(event) => update("title", event.target.value)} required value={form.title} />
            </label>
            <label>
              <span>Slug</span>
              <input
                maxLength={100}
                onChange={(event) => update("slug", event.target.value.toLowerCase())}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="gana-boletos"
                required
                value={form.slug}
              />
            </label>
            <label>
              <span>Artwork label</span>
              <input maxLength={80} onChange={(event) => update("artworkLabel", event.target.value)} required value={form.artworkLabel} />
            </label>
            <label>
              <span>Context</span>
              <input maxLength={100} onChange={(event) => update("context", event.target.value)} required value={form.context} />
            </label>
          </div>

          <label>
            <span>Description</span>
            <textarea maxLength={5000} onChange={(event) => update("description", event.target.value)} required rows={4} value={form.description} />
          </label>
          <label>
            <span>Instructions</span>
            <textarea maxLength={5000} onChange={(event) => update("instructions", event.target.value)} required rows={4} value={form.instructions} />
          </label>
          <label>
            <span>Image URL</span>
            <input onChange={(event) => update("imageUrl", event.target.value)} placeholder="https://..." required type="url" value={form.imageUrl} />
          </label>

          <div className="dynamic-grid three">
            <label>
              <span>Starts at</span>
              <input onChange={(event) => update("startsAt", event.target.value)} required type="datetime-local" value={form.startsAt} />
            </label>
            <label>
              <span>Ends at</span>
              <input onChange={(event) => update("endsAt", event.target.value)} required type="datetime-local" value={form.endsAt} />
            </label>
            <label>
              <span>Campaign timezone</span>
              <input onChange={(event) => update("timezone", event.target.value)} placeholder="America/Detroit" required value={form.timezone} />
            </label>
          </div>
          <p className="dynamic-help">Start and end are interpreted in the campaign IANA timezone and persisted as UTC by the API.</p>

          <div className="dynamic-grid two compact">
            <label>
              <span>Editorial status</span>
              <select onChange={(event) => update("status", event.target.value as "active" | "closed")} value={form.status}>
                <option value="active">Active — window controls availability</option>
                <option value="closed">Closed — manual override</option>
              </select>
            </label>
            <label className="dynamic-check">
              <input checked={form.featured} onChange={(event) => update("featured", event.target.checked)} type="checkbox" />
              <span>Featured campaign</span>
            </label>
          </div>
        </fieldset>

        <fieldset disabled={busy}>
          <legend>Participation</legend>
          <div className="dynamic-mode-tabs" role="group" aria-label="Participation mode">
            <button className={form.participationType === "form" ? "selected" : ""} onClick={() => update("participationType", "form")} type="button">Native form</button>
            <button className={form.participationType === "external_url" ? "selected" : ""} onClick={() => update("participationType", "external_url")} type="button">External URL</button>
          </div>

          {form.participationType === "external_url" ? (
            <label>
              <span>External registration URL</span>
              <input onChange={(event) => update("participationUrl", event.target.value)} placeholder="https://..." required type="url" value={form.participationUrl} />
              <small>External mode cannot collect local fields or require Firebase authentication.</small>
            </label>
          ) : (
            <>
              <label className="dynamic-check inline">
                <input checked={form.requiresAuth} onChange={(event) => update("requiresAuth", event.target.checked)} type="checkbox" />
                <span>Require authenticated Firebase user</span>
              </label>
              {!fieldContactValid ? (
                <p className="dynamic-warning">Anonymous forms must include a required email or phone field.</p>
              ) : null}

              <div className="dynamic-fields-heading">
                <div>
                  <strong>Form fields</strong>
                  <span>{form.fields.length}/12</span>
                </div>
                <button
                  disabled={form.fields.length >= 12}
                  onClick={() => update("fields", [...form.fields, newField()])}
                  type="button"
                >
                  <Plus size={15} /> Add field
                </button>
              </div>

              <div className="dynamic-fields">
                {form.fields.map((field, index) => (
                  <div className="dynamic-field-row" key={field.rowId}>
                    <input
                      aria-label={`Field ${index + 1} key`}
                      maxLength={40}
                      onChange={(event) =>
                        update(
                          "fields",
                          form.fields.map((item) => item.rowId === field.rowId ? { ...item, key: event.target.value.toLowerCase() } : item),
                        )
                      }
                      pattern="[a-z][a-z0-9_]{0,39}"
                      placeholder="field_key"
                      required
                      value={field.key}
                    />
                    <select
                      aria-label={`Field ${index + 1} type`}
                      onChange={(event) =>
                        update(
                          "fields",
                          form.fields.map((item) => item.rowId === field.rowId ? { ...item, type: event.target.value as typeof field.type } : item),
                        )
                      }
                      value={field.type}
                    >
                      {FIELD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <input
                      aria-label={`Field ${index + 1} label`}
                      maxLength={100}
                      onChange={(event) =>
                        update(
                          "fields",
                          form.fields.map((item) => item.rowId === field.rowId ? { ...item, label: event.target.value } : item),
                        )
                      }
                      placeholder="Visible label"
                      required
                      value={field.label}
                    />
                    <label className="dynamic-field-required">
                      <input
                        checked={field.required}
                        onChange={(event) =>
                          update(
                            "fields",
                            form.fields.map((item) => item.rowId === field.rowId ? { ...item, required: event.target.checked } : item),
                          )
                        }
                        type="checkbox"
                      />
                      Required
                    </label>
                    <button
                      aria-label={`Remove ${field.key || `field ${index + 1}`}`}
                      className="icon-button"
                      onClick={() => update("fields", form.fields.filter((item) => item.rowId !== field.rowId))}
                      type="button"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </fieldset>

        <fieldset disabled={busy}>
          <legend>Consent</legend>
          <div className="dynamic-grid two">
            <label>
              <span>Terms URL</span>
              <input onChange={(event) => update("termsUrl", event.target.value)} required type="url" value={form.termsUrl} />
            </label>
            <label>
              <span>Privacy URL</span>
              <input onChange={(event) => update("privacyUrl", event.target.value)} required type="url" value={form.privacyUrl} />
            </label>
            <label>
              <span>Consent version</span>
              <input maxLength={64} onChange={(event) => update("consentVersion", event.target.value)} pattern="[A-Za-z0-9._-]+" required value={form.consentVersion} />
            </label>
          </div>
          <p className="dynamic-help">Increment consentVersion whenever applicable terms or privacy conditions change.</p>
        </fieldset>

        <div className="dynamic-editor-actions">
          {dynamic ? (
            <button
              className="danger-button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Remove “${dynamic.title}” from the Draft? Existing participations are retained.`)) {
                  void deleteMutation.mutateAsync();
                }
              }}
              type="button"
            >
              <Trash2 size={16} /> Remove from Draft
            </button>
          ) : <span />}
          <button disabled={busy} type="submit">
            <Save size={16} /> {saveMutation.isPending ? "Saving…" : "Save to Draft"}
          </button>
        </div>
      </form>
    </article>
  );
}
