import { createHash } from "node:crypto";
import { posix } from "node:path";

export function createStartupPublicManifest({ generated, metafile, entry, external, rewrittenConsumers, licenses = [] }) {
  const outputInputs = Object.values(metafile.outputs ?? {}).find(output => output.entryPoint)?.inputs ?? {};
  const inputs = Object.entries(metafile.inputs).map(([path, value]) => ({
    path: normalizeStartupInput(path),
    group: startupInputGroup(path),
    sourceBytes: value.bytes,
    evaluatedBytes: outputInputs[path]?.bytesInOutput ?? 0,
  })).sort((left, right) => left.path.localeCompare(right.path));
  const manifest = {
    schema: "a1-startup-public-artifact-v1",
    publicEntry: "@earendil-works/pi-coding-agent",
    output: {
      path: entry,
      bytes: generated.byteLength,
      sha256: createHash("sha256").update(generated).digest("hex"),
    },
    external: [...external],
    rewrittenConsumers: [...rewrittenConsumers].sort(),
    licenses: [...licenses].sort((left, right) => left.name.localeCompare(right.name) || left.version.localeCompare(right.version)),
    totals: {
      files: inputs.length,
      loadedFiles: inputs.filter(input => input.evaluatedBytes > 0).length,
      sourceBytes: inputs.reduce((total, input) => total + input.sourceBytes, 0),
      evaluatedBytes: inputs.reduce((total, input) => total + input.evaluatedBytes, 0),
    },
    inputs,
  };
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  const unsafe = serialized.match(/([A-Za-z]:[\\/]|\/Users\/|\\Users\\|process\.env|HOME=)/);
  if (unsafe !== null) throw new Error(`startup public artifact report contains non-normalized or sensitive input: ${unsafe[0]}`);
  return { manifest, serialized };
}

export function validateStartupPublicBaseline(manifest, baseline) {
  if (baseline?.schema !== "a1-startup-graph-baseline-v1") return ["startup graph baseline schema is invalid"];
  const errors = [];
  if (manifest.totals.loadedFiles > baseline.piPublicArtifact.maximumLoadedFiles) {
    errors.push(`Pi startup artifact has ${manifest.totals.loadedFiles} loaded files; maximum is ${baseline.piPublicArtifact.maximumLoadedFiles}`);
  }
  if (manifest.totals.evaluatedBytes > baseline.piPublicArtifact.maximumEvaluatedBytes) {
    errors.push(`Pi startup artifact has ${manifest.totals.evaluatedBytes} evaluated bytes; maximum is ${baseline.piPublicArtifact.maximumEvaluatedBytes}`);
  }
  return errors;
}

export function normalizeStartupInput(path) {
  const normalized = path.replaceAll("\\", "/").replace(/^\.\//, "");
  const nodeModules = normalized.lastIndexOf("node_modules/");
  if (nodeModules >= 0) return normalized.slice(nodeModules);
  const relative = posix.normalize(normalized);
  if (relative.startsWith("../") || relative.startsWith("/") || /^[A-Za-z]:/.test(relative)) {
    throw new Error(`startup artifact input is outside the package: ${path}`);
  }
  return relative;
}

export function startupInputGroup(path) {
  const normalized = path.replaceAll("\\", "/");
  if (normalized.includes("node_modules/@earendil-works/pi-coding-agent/")) return "pi-public";
  if (normalized.includes("node_modules/@earendil-works/")) return "pi-runtime";
  if (normalized.includes("node_modules/")) return "dependency";
  return "a1-generated-source";
}
