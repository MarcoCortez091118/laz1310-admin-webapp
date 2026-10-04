import { describe, expect, it } from "vitest";
import {
  formatBytes,
  MAX_MEDIA_BYTES,
  validateAltText,
  validateMediaFile,
} from "./model";

describe("media model", () => {
  it("accepts the image media types supported by FastAPI", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateMediaFile({ type, size: 1024 })).toBeNull();
    }
  });

  it("rejects unsupported MIME types before upload", () => {
    expect(validateMediaFile({ type: "image/gif", size: 1024 })).toBe(
      "Choose a JPEG, PNG, or WebP image.",
    );
  });

  it("rejects files larger than the backend 5 MiB limit", () => {
    expect(validateMediaFile({ type: "image/jpeg", size: MAX_MEDIA_BYTES + 1 })).toBe(
      "Images must be between 1 byte and 5 MiB.",
    );
  });

  it("requires meaningful alt text", () => {
    expect(validateAltText("   ")).toBe("Image description is required.");
    expect(validateAltText("LA Z morning show artwork")).toBeNull();
  });

  it("enforces the backend alt text length limit", () => {
    expect(validateAltText("a".repeat(501))).toBe(
      "Image description must be 500 characters or fewer.",
    );
  });

  it("formats stored asset sizes for editorial display", () => {
    expect(formatBytes(900)).toBe("900 B");
    expect(formatBytes(1536)).toBe("1.5 KiB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MiB");
  });
});
