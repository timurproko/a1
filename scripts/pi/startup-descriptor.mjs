import { createHash } from "node:crypto";

export const STARTUP_EAGER_ENTRIES = Object.freeze([
  "dist/features/launch/runtime-selection.js",
  "dist/foundation/lifecycle/session-selection.js",
  "dist/features/owned-ui/project-trust-prompt.js",
  "dist/features/owned-ui/session-fork-prompt.js",
  "dist/features/owned-ui/run.js",
  "dist/composition/owned-ui.js",
]);

/** Build one immutable descriptor consumed by interactive launch and warmup. */
export function createStartupDescriptor({ artifact, entries = STARTUP_EAGER_ENTRIES }) {
  const content = {
    schema: "a1-startup-descriptor-v1",
    entries: [...entries],
    generatedArtifact: { path: artifact.path, sha256: artifact.sha256 },
    dependencyLayerIdentity: {
      source: "A1_RELEASE_LAYERS",
      encoding: "ordered-comma-separated-layer-ids-v1",
    },
    compileCacheNamespace: {
      strategy: "node-abi-version-and-ordered-layer-sha256-v1",
    },
  };
  return Object.freeze({
    ...content,
    identity: createHash("sha256").update(JSON.stringify(content)).digest("hex"),
  });
}

/** Serialize a stable executable descriptor with literal dynamic-import edges. */
export function serializeStartupDescriptor(descriptor) {
  const imports = descriptor.entries.map(entry => {
    const relative = `../../${entry.slice("dist/".length)}`;
    return `    import(${JSON.stringify(relative)}),`;
  }).join("\n");
  return [
    `export const STARTUP_DESCRIPTOR = Object.freeze(${JSON.stringify(descriptor, null, 2)});`,
    "",
    "export function loadDeclaredStartupGraph() {",
    "  return Promise.all([",
    imports,
    "  ]);",
    "}",
    "",
  ].join("\n");
}
