import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResourceEditorDialog } from "./ResourceEditorDialog";

describe("ResourceEditorDialog", () => {
  it("provides a labeled editor and closes a clean form", () => {
    const onClose = vi.fn();
    render(
      <ResourceEditorDialog open title="Edit program" onClose={onClose}>
        <input aria-label="Program name" />
      </ResourceEditorDialog>,
    );
    expect(screen.getByRole("dialog", { name: "Edit program" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close editor" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("requires explicit discard for unsaved edits", () => {
    const onClose = vi.fn();
    render(
      <ResourceEditorDialog open dirty title="New campaign" onClose={onClose}>
        <input aria-label="Title" />
      </ResourceEditorDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close editor" }));
    expect(screen.getByText("Discard unsaved changes?")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close editor" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
