import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const REQUIRED_MODAL_SURFACES = [
  "selector.shared-lifecycle",
  "settings.root", "settings.theme", "settings.thinking", "settings.images",
  "models.select", "models.scope", "trust.project",
  "session.fork", "tree.root", "tree.summary-choice", "tree.summary-instructions",
  "session.resume", "session.delete-confirm", "session.rename", "session.missing-cwd",
  "auth.login-type", "auth.login-provider", "auth.login-dialog", "auth.logout-provider",
  "command.import-confirm",
  "extension.select", "extension.confirm", "extension.input", "extension.editor",
  "extension.custom-editor", "extension.custom-overlay",
] as const;

type Surface = {
  id: string;
  upstream: string;
  component: string;
  destination: string;
  status: "implemented" | "planned";
  tests: string[];
};

describe("pinned Pi modal surface inventory", () => {
  it("enumerates every source-traced built-in, nested, authentication, session, and extension modal branch", async () => {
    const inventory = JSON.parse(await readFile(
      "openspec/changes/build-owned-pi-ui-foundation/evidence/modal-surface-inventory.json",
      "utf8",
    )) as { policy: { genericFixtureSatisfiesSpecializedSurface: boolean; requiredTransitions: string[] }; surfaces: Surface[] };
    expect(inventory.policy.genericFixtureSatisfiesSpecializedSurface).toBe(false);
    expect(inventory.policy.requiredTransitions).toEqual([
      "open", "active", "complete-or-save", "cancel", "failure", "focus-restoration", "resize", "dispose",
    ]);
    expect(inventory.surfaces.map(surface => surface.id).sort()).toEqual([...REQUIRED_MODAL_SURFACES].sort());
    expect(new Set(inventory.surfaces.map(surface => surface.id)).size).toBe(inventory.surfaces.length);
    for (const surface of inventory.surfaces) {
      expect(surface.upstream, surface.id).toMatch(/\.ts:/);
      expect(surface.component, surface.id).not.toBe("");
      expect(surface.destination, surface.id).toMatch(/^src\//);
      if (surface.status === "implemented") {
        expect(surface.tests.length, surface.id).toBeGreaterThan(0);
        expect(surface.tests.every(test => test.startsWith("test/") && !test.includes("generic-selector")), surface.id).toBe(true);
      }
    }
  });

  it("keeps incomplete modal routes explicitly open instead of reporting exhaustive parity", async () => {
    const inventory = JSON.parse(await readFile(
      "openspec/changes/build-owned-pi-ui-foundation/evidence/modal-surface-inventory.json",
      "utf8",
    )) as { surfaces: Surface[] };
    expect(inventory.surfaces.filter(surface => surface.status === "planned").map(surface => surface.id)).toEqual([
      "tree.summary-choice",
      "tree.summary-instructions",
      "auth.login-type",
    ]);
  });
});
