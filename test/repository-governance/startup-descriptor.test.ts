import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  STARTUP_EAGER_ENTRIES,
  createStartupDescriptor,
  serializeStartupDescriptor,
} from "../../scripts/pi/startup-descriptor.mjs";

describe("startup descriptor", () => {
  it("is byte-stable and changes identity for every bound input class", () => {
    const input = { artifact: { path: "dist/integrations/pi/startup-public.js", sha256: "a".repeat(64) } };
    const first = createStartupDescriptor(input);
    const second = createStartupDescriptor(input);
    expect(serializeStartupDescriptor(first)).toBe(serializeStartupDescriptor(second));
    expect(createStartupDescriptor({ artifact: { ...input.artifact, sha256: "b".repeat(64) } }).identity).not.toBe(first.identity);
    expect(createStartupDescriptor({ ...input, entries: [...STARTUP_EAGER_ENTRIES, "dist/extra.js"] }).identity).not.toBe(first.identity);
    expect(first.dependencyLayerIdentity.source).toBe("A1_RELEASE_LAYERS");
    expect(first.compileCacheNamespace.strategy).toContain("ordered-layer-sha256");
  });

  it("binds the built artifact and exposes the same literal graph to launch and warmup", async () => {
    const [source, manifest, ui, warmup] = await Promise.all([
      readFile("dist/foundation/startup/startup-descriptor.js", "utf8"),
      readFile("dist/integrations/pi/startup-public.manifest.json", "utf8").then(JSON.parse),
      readFile("bin/ui.js", "utf8"),
      readFile("bin/warmup.js", "utf8"),
    ]);
    const encoded = /^export const STARTUP_DESCRIPTOR = Object\.freeze\(([\s\S]*?)\);$/m.exec(source)?.[1];
    expect(encoded).toBeDefined();
    const descriptor = JSON.parse(encoded!);
    expect(descriptor.entries).toEqual(STARTUP_EAGER_ENTRIES);
    expect(descriptor.generatedArtifact).toEqual({ path: manifest.output.path, sha256: manifest.output.sha256 });
    expect(ui).toContain("descriptor.loadDeclaredStartupGraph()");
    expect(warmup).toContain("descriptor.loadDeclaredStartupGraph()");
    expect(ui).not.toContain('import("../dist/features/launch/runtime-selection.js")');
    expect(warmup).not.toContain('import("../dist/features/launch/runtime-selection.js")');
  });
});
