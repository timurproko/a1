import { describe, expect, it } from "vitest";
import { createStartupPublicManifest, normalizeStartupInput, startupInputGroup, validateStartupPublicBaseline } from "../../scripts/pi/startup-public-artifact.mjs";

describe("generated public Pi startup artifact evidence", () => {
  it("normalizes identities, groups inputs, orders bytes deterministically, and emits no content", () => {
    const options = {
      generated: new TextEncoder().encode("export const ready = true;\n"),
      metafile: {
        inputs: {
          "node_modules/zeta/index.js": { bytes: 7 },
          "dist/integrations/pi/startup-public.js": { bytes: 5 },
          "node_modules/@earendil-works/pi-coding-agent/dist/index.js": { bytes: 11 },
          "node_modules/@earendil-works/pi-agent-core/dist/index.js": { bytes: 13 },
        },
        outputs: { "dist/generated.js": { entryPoint: "dist/integrations/pi/startup-public.js", inputs: {
          "node_modules/zeta/index.js": { bytesInOutput: 3 },
          "dist/integrations/pi/startup-public.js": { bytesInOutput: 1 },
          "node_modules/@earendil-works/pi-coding-agent/dist/index.js": { bytesInOutput: 4 },
        } } },
      },
      entry: "dist/integrations/pi/startup-public.js",
      external: ["#pi-tui"],
      rewrittenConsumers: ["dist/z.js", "dist/a.js"],
      licenses: [
        { name: "zeta", version: "2.0.0", license: "Apache-2.0" },
        { name: "alpha", version: "1.0.0", license: "MIT" },
      ],
    };
    const first = createStartupPublicManifest(options);
    const second = createStartupPublicManifest(options);
    expect(second.serialized).toBe(first.serialized);
    expect(first.manifest.inputs.map(input => [input.path, input.group, input.sourceBytes, input.evaluatedBytes])).toEqual([
      ["dist/integrations/pi/startup-public.js", "a1-generated-source", 5, 1],
      ["node_modules/@earendil-works/pi-agent-core/dist/index.js", "pi-runtime", 13, 0],
      ["node_modules/@earendil-works/pi-coding-agent/dist/index.js", "pi-public", 11, 4],
      ["node_modules/zeta/index.js", "dependency", 7, 3],
    ]);
    expect(first.manifest.totals).toEqual({ files: 4, loadedFiles: 3, sourceBytes: 36, evaluatedBytes: 8 });
    expect(first.manifest.rewrittenConsumers).toEqual(["dist/a.js", "dist/z.js"]);
    expect(first.manifest.licenses.map(item => item.name)).toEqual(["alpha", "zeta"]);
    expect(validateStartupPublicBaseline(first.manifest, {
      schema: "a1-startup-graph-baseline-v1",
      piPublicArtifact: { maximumLoadedFiles: 2, maximumEvaluatedBytes: 7 },
    })).toEqual([
      "Pi startup artifact has 3 loaded files; maximum is 2",
      "Pi startup artifact has 8 evaluated bytes; maximum is 7",
    ]);
    expect(first.serialized).not.toMatch(/prompt|credential|process\.env|[A-Za-z]:[\\/]/i);
  });

  it("rejects absolute and escaping input identities", () => {
    expect(() => normalizeStartupInput("C:/Users/example/private.js")).toThrow("outside the package");
    expect(() => normalizeStartupInput("../private.js")).toThrow("outside the package");
  });

  it("uses stable module groups", () => {
    expect(startupInputGroup("node_modules/other/index.js")).toBe("dependency");
    expect(startupInputGroup("src/generated.ts")).toBe("a1-generated-source");
  });
});
