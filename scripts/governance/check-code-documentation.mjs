import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatCodeDocumentationDiagnostics,
  inspectCodeDocumentation,
  loadTrackedCodeDocumentationSources,
} from "./code-documentation-policy.mjs";
import { PROJECT_OWNERS } from "./project-structure-policy.mjs";

const rootArgument = process.argv.indexOf("--root");
const repository = resolve(rootArgument >= 0
  ? process.argv[rootArgument + 1]
  : fileURLToPath(new URL("../..", import.meta.url)));
const ledger = JSON.parse(await readFile(resolve(repository, "config/baselines/pinned-pi-source-port-ledger.json"), "utf8"));
const synchronizedDestinations = new Set(ledger.records.map(record => record.localDestination));
const sources = await loadTrackedCodeDocumentationSources(repository);
const diagnostics = inspectCodeDocumentation({ sources, owners: PROJECT_OWNERS, synchronizedDestinations });
const output = formatCodeDocumentationDiagnostics(diagnostics);

if (diagnostics.length === 0) process.stdout.write(output);
else {
  process.stderr.write(output);
  process.exitCode = 1;
}
