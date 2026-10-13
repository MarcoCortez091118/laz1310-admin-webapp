import { describe, expect, it } from "vitest";
import { editorCloseBehavior } from "./editorCloseBehavior";

describe("editorCloseBehavior", () => {
  it("closes immediately when the editor is clean", () => {
    expect(editorCloseBehavior(false)).toBe("close");
  });

  it("requires confirmation before discarding unsaved changes", () => {
    expect(editorCloseBehavior(true)).toBe("confirm");
  });
});
