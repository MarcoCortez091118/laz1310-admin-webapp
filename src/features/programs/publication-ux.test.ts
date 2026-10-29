import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");

describe("Programs publication workflow visibility", () => {
  it("keeps Draft save separate from selective publication but exposes both together", () => {
    const editor = read("./ProgramEditor.tsx");
    expect(editor).toContain("Paso 1: Activa el programa. Paso 2: Guarda el borrador. Paso 3: Pulsa Publicar programa");
    expect(editor).toContain("Guardar borrador");
    expect(editor).toContain("<ProgramLifecycleActions");
    expect(editor.indexOf("Guardar borrador")).toBeLessThan(editor.lastIndexOf("<ProgramLifecycleActions"));
    expect(editor).toContain("dirty={dirty}");
    expect(editor).toContain("etag={etag}");
  });

  it("publishes through the guarded FastAPI endpoint with admin permissions", () => {
    const actions = read("./ProgramLifecycleActions.tsx");
    const api = read("./api.ts");
    expect(actions).toContain("disabled={!isAdmin || pending || dirty}");
    expect(actions).toContain("Publicar programa");
    expect(actions).toContain("Confirmar publicación");
    expect(actions).toContain("publishProgram(stationId, programId, normalized, etag)");
    expect(api).toContain("/publish");
    expect(api).toContain("{ ifMatch: etag, signal }");
  });

  it("never equates draft Active with published Live", () => {
    const page = read("./ProgramsPage.tsx");
    const editor = read("./ProgramEditor.tsx");
    expect(page).toContain("publicationStatus = useProgramPublicationStatusQuery()");
    expect(editor).toContain("Guarda y publica");
    expect(editor).toContain("isActive: event.target.checked");
  });
});
