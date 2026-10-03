import { FileImage, ShieldCheck, Upload, X } from "lucide-react";
import { useId, useState } from "react";
import { ApiError } from "../../api/errors";
import type { MediaAsset } from "../../api/types";
import {
  formatBytes,
  MAX_ALT_LENGTH,
  MEDIA_ACCEPT,
  validateAltText,
  validateMediaFile,
} from "./model";
import { useUploadMediaMutation } from "./queries";

export function MediaUploadPanel({
  onUploaded,
  compact = false,
}: {
  onUploaded?: (asset: MediaAsset) => void;
  compact?: boolean;
}) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const upload = useUploadMediaMutation();

  function chooseFile(next: File | null) {
    upload.reset();
    setLocalError(null);
    if (!next) {
      setFile(null);
      return;
    }
    const issue = validateMediaFile(next);
    if (issue) {
      setFile(null);
      setLocalError(issue);
      return;
    }
    setFile(next);
    if (!alt.trim()) {
      setAlt(next.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
    }
  }

  function submit() {
    const fileIssue = file ? validateMediaFile(file) : "Choose an image to upload.";
    const altIssue = validateAltText(alt);
    const issue = fileIssue ?? altIssue;
    if (issue || !file) {
      setLocalError(issue);
      return;
    }

    setLocalError(null);
    upload.mutate(
      { file, alt },
      {
        onSuccess: (result) => {
          onUploaded?.(result.data);
          setFile(null);
          setAlt("");
        },
      },
    );
  }

  const apiError = upload.error instanceof ApiError ? upload.error : null;
  const errorMessage = localError ?? (upload.error instanceof Error ? upload.error.message : null);

  return (
    <section className={`media-upload-panel ${compact ? "compact" : ""}`}>
      <div className="media-upload-heading">
        <div>
          <p className="eyebrow">Upload</p>
          <h2>{compact ? "Add image" : "Upload a managed image"}</h2>
          <p className="muted">
            JPEG, PNG, or WebP · up to 5 MiB. The backend re-encodes every accepted image to WebP.
          </p>
        </div>
        <span className="media-security-pill">
          <ShieldCheck size={15} /> Metadata stripped
        </span>
      </div>

      <div
        className={`media-dropzone ${dragging ? "dragging" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          chooseFile(event.dataTransfer.files.item(0));
        }}
      >
        <input
          accept={MEDIA_ACCEPT.join(",")}
          id={inputId}
          onChange={(event) => chooseFile(event.target.files?.item(0) ?? null)}
          type="file"
        />
        {file ? (
          <div className="media-file-summary">
            <FileImage size={24} />
            <div>
              <strong>{file.name}</strong>
              <span>{file.type} · {formatBytes(file.size)}</span>
            </div>
            <button
              aria-label="Remove selected file"
              className="icon-button"
              onClick={() => chooseFile(null)}
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <label htmlFor={inputId}>
            <Upload size={24} />
            <strong>Drop an image here or choose a file</strong>
            <span>Actual image bytes are verified by FastAPI; file extensions are not trusted.</span>
          </label>
        )}
      </div>

      <label className="media-alt-field">
        Image description
        <textarea
          maxLength={MAX_ALT_LENGTH}
          onChange={(event) => {
            setAlt(event.target.value);
            setLocalError(null);
          }}
          placeholder="Describe what appears in the image for accessibility and editorial context."
          rows={compact ? 2 : 3}
          value={alt}
        />
        <small>{alt.length}/{MAX_ALT_LENGTH} characters · required</small>
      </label>

      {errorMessage ? (
        <div className="error-banner media-upload-error">
          <div>
            <strong>Upload blocked</strong>
            <span>{errorMessage}</span>
            {apiError?.kind === "rate-limited" && apiError.retryAfterSeconds ? (
              <span>Retry after {apiError.retryAfterSeconds} seconds.</span>
            ) : null}
            {apiError?.requestId ? <code>Request ID: {apiError.requestId}</code> : null}
          </div>
        </div>
      ) : null}

      <div className="media-upload-actions">
        <span className="muted">
          Animated images and unsafe/oversized dimensions are rejected server-side.
        </span>
        <button disabled={!file || upload.isPending} onClick={submit} type="button">
          <Upload size={16} />
          {upload.isPending ? "Uploading…" : "Upload image"}
        </button>
      </div>
    </section>
  );
}
