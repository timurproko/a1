import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  formatCodeDocumentationDiagnostics,
  inspectCodeDocumentation,
  loadCodeDocumentationSources,
  loadTrackedCodeDocumentationSources,
} from "./code-documentation-policy.mjs";
import { PROJECT_OWNERS } from "./project-structure-policy.mjs";
import { assertValidationImpact, isDocumentationPolicyPath } from "../release/validation-impact.mjs";

const execFileAsync = promisify(execFile);
const repository = resolve(valueAfter("--root") ?? fileURLToPath(new URL("../..", import.meta.url)));
const mode = valueAfter("--mode") ?? "full";
if (mode !== "changed" && mode !== "full") throw new TypeError(`unsupported code documentation mode: ${mode}`);
const startedAt = Date.now();
const ledger = JSON.parse(await readFile(resolve(repository, "config/baselines/pinned-pi-source-port-ledger.json"), "utf8"));
const synchronizedDestinations = new Set(ledger.records.map(record => record.localDestination));
let sources;
let diagnosticPaths;
if (mode === "full") sources = await loadTrackedCodeDocumentationSources(repository);
else {
  const selectionPath = valueAfter("--selection");
  if (!selectionPath) throw new TypeError("changed code documentation mode requires --selection");
  const selection = assertValidationImpact(JSON.parse(await readFile(resolve(repository, selectionPath), "utf8")));
  diagnosticPaths = new Set(selection.documentation.paths);
  const contextPaths = await documentationContextPaths(repository, selection.documentation.paths);
  sources = await loadCodeDocumentationSources(repository, contextPaths);
}
const diagnostics = inspectCodeDocumentation({ sources, owners: PROJECT_OWNERS, synchronizedDestinations, diagnosticPaths });
const result = {
  schema: "a1-code-documentation-outcome-v1",
  mode,
  passed: diagnostics.length === 0,
  filesInspected: mode === "full" ? sources.filter(source => isDocumentationPolicyPath(source.path)).length : diagnosticPaths.size,
  contextFiles: sources.length,
  fullRepositoryScans: mode === "full" ? 1 : 0,
  durationMs: Math.max(0, Date.now() - startedAt),
  diagnostics,
};
const resultPath = valueAfter("--result");
if (resultPath) {
  const path = resolve(repository, resultPath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(result, null, 2)}\n`);
}
const output = formatCodeDocumentationDiagnostics(diagnostics);
if (diagnostics.length === 0) process.stdout.write(output);
else {
  process.stderr.write(output);
  process.exitCode = 1;
}

async function documentationContextPaths(root, changedPaths) {
  const roots = Object.values(PROJECT_OWNERS)
    .filter(owner => changedPaths.some(path => path === owner.sourceRoot || path.startsWith(`${owner.sourceRoot}/`)))
    .map(owner => owner.sourceRoot);
  const context = new Set(changedPaths);
  if (roots.length > 0) {
    const { stdout } = await execFileAsync("git", ["ls-files", "-z", "--", ...roots], {
      cwd: root,
      encoding: "buffer",
      maxBuffer: 32 * 1024 * 1024,
    });
    for (const path of stdout.toString("utf8").split("\0").filter(Boolean)) context.add(path.replaceAll("\\", "/"));
  }
  return [...context].filter(isDocumentationPolicyPath).sort();
}

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} requires a value`);
  return value;
}
