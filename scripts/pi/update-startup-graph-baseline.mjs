/**
 * Re-pins the totals in `config/startup-graph-baseline.json` to what the tree measures: the owned
 * startup reachability (files and source bytes) from `startup-graph-policy.mjs` and the Pi public
 * artifact (loaded files and evaluated bytes) from the manifest `build-startup-public.mjs` wrote
 * under `dist/`. Optional modules and pinned dynamic imports are reviewed and untouched. A Pi
 * upgrade moves these numbers on every version and they carry no decision, so the proposal
 * driver runs this as a step; `--check` reports without writing.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectStartupReachability } from "../governance/startup-graph-policy.mjs";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const checkOnly = process.argv.includes("--check");
const baselinePath = join(repository, "config", "startup-graph-baseline.json");
const manifestPath = join(repository, "dist", "integrations", "pi", "startup-public.manifest.json");

const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
const reachability = await inspectStartupReachability(repository);
if (reachability.errors.length > 0) throw new Error(reachability.errors.join("; "));
const manifest = JSON.parse(await readFile(manifestPath, "utf8").catch(() => { throw new Error(`startup public manifest is missing (run the build first): ${manifestPath}`); }));
const next = {
  ...baseline,
  ownedReachability: { ...baseline.ownedReachability, maximumFiles: reachability.totals.files, maximumSourceBytes: reachability.totals.sourceBytes },
  piPublicArtifact: { ...baseline.piPublicArtifact, maximumLoadedFiles: manifest.totals.loadedFiles, maximumEvaluatedBytes: manifest.totals.evaluatedBytes },
};
const summary = `startup graph ${next.ownedReachability.maximumFiles} files / ${next.ownedReachability.maximumSourceBytes} bytes; Pi artifact ${next.piPublicArtifact.maximumLoadedFiles} files / ${next.piPublicArtifact.maximumEvaluatedBytes} bytes`;
if (JSON.stringify(next) === JSON.stringify(baseline)) {
  console.log(`Startup graph baseline is current (${summary})`);
} else if (checkOnly) {
  console.error(`startup graph baseline drift: ${summary}`);
  process.exitCode = 1;
} else {
  await writeFile(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Wrote config/startup-graph-baseline.json (${summary})`);
}
