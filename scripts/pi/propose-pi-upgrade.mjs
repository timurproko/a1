/**
 * Proposes a Pi upgrade as a reviewable working tree: bumps both pinned packages to the newest
 * published version that is newer than the pin and not skipped (or `--version`), evaluates the
 * candidate in isolation, three-way merges each vendored copy that follows upstream (old upstream,
 * new upstream, A1 copy) and records the upstream delta of each copy A1 keeps, regenerates the
 * source ledger and provenance headers, re-resolves the inventories, refreshes the public API and
 * feature adoption baselines, re-pins the startup graph, refreshes parity evidence, runs the
 * gates, and writes the pull-request body, the resolution report, and the OpenSpec scaffold under
 * `--output`. It never resolves a conflict, drops an inventory entry, records a disposition, or
 * merges anything; a failed step is recorded and the run continues so the pull request names every
 * problem, and a gate that cannot run while conflict markers remain is recorded as blocked. With
 * `--refresh` it re-runs the derived steps and gates on the checked-out proposal branch without
 * bumping, evaluating, or merging. With no newer version it writes `changed=false` and exits.
 */
import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { evaluatePiCandidate } from "../governance/pi-candidate-evaluator.mjs";
import { readPinnedPiIdentity } from "../governance/pinned-pi-identity.mjs";
import { compareVersions, matrixReviewItems } from "./pi-feature-adoption-matrix.mjs";
import { collectPiPublicApi, diffPublicApi, publicApiReviewItems, summarizeCompileOutput } from "./pi-public-api.mjs";
import { carriesProvenanceHeader, splitProvenanceHeader } from "./pinned-pi-source-header.mjs";
import { MARKER_BLOCKED_STEPS, REFRESH_STEPS, UPGRADE_STEPS, branchName, changeId, renderUpgradeBody, renderUpgradeChange } from "./pi-upgrade-report.mjs";

const execute = promisify(execFile);
const repository = fileURLToPath(new URL("../..", import.meta.url));
const output = resolve(argumentValue("--output") ?? join(repository, ".artifacts", "pi-upgrade"));
const requestedVersion = argumentValue("--version");
const requestedCommit = argumentValue("--commit");
const skippedVersions = argumentValues("--skip");
const refresh = process.argv.includes("--refresh");
const baseRef = argumentValue("--base") ?? "origin/develop";
const PI_PACKAGES = ["@earendil-works/pi-coding-agent", "@earendil-works/pi-tui"];
const CONFLICT_MARKER = /^(?:<{7} |={7}$|>{7} |\|{7} )/m;
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

await mkdir(output, { recursive: true });
// Invariant: on a refresh the tree already carries the candidate, so the previous identity is the base branch's.
const previous = refresh ? await baseIdentity() : await readPinnedPiIdentity(repository);
const selection = refresh
  ? { version: (await readPinnedPiIdentity(repository)).version, skipped: [] }
  : await selectVersion(previous.version);
const version = selection.version;
if (version === null || version === previous.version) {
  const skipped = selection.skipped.length === 0 ? "" : ` (skipped: ${selection.skipped.join(", ")})`;
  await finish({ changed: false, previous, version: previous.version, skipped: selection.skipped, message: `Pi ${previous.version} is current${skipped}` });
  process.exit(0);
}
if (refresh && compareVersions(version, previous.version) <= 0) throw new Error(`refresh expects a proposal branch pinning a version newer than ${previous.version}; the tree pins ${version}`);
const commit = requestedCommit ?? (refresh ? (await readPinnedPiIdentity(repository)).commit : await resolveCommit(version));
const steps = [];
const report = {
  schema: "a1-pi-upgrade-proposal-v2",
  mode: refresh ? "refresh" : "propose",
  refreshedAt: refresh ? new Date().toISOString().slice(0, 10) : undefined,
  previous: { version: previous.version, commit: previous.commit },
  version,
  commit,
  branch: branchName(version),
  change: changeId(version),
  skipped: selection.skipped,
  steps,
  merge: { clean: [], conflicted: [], unchanged: [], kept: [] },
  inventories: { reanchored: [], moved: [], orphaned: [], unmapped: [] },
  publicApi: null,
  features: null,
  compile: null,
  changelog: null,
  reviewItems: [],
};
if (commit === null) report.reviewItems.push("The upstream commit could not be resolved from the registry or the release tag; pass --commit to the sync.");

// Rationale: the old upstream sources exist only in the installed package, so they are captured before the bump.
const ledger = JSON.parse(await readFile(join(repository, "config", "baselines", "pinned-pi-source-port-ledger.json"), "utf8"));
const ownedRecords = ledger.records.filter(record => record.classification === "owned-presentation" && carriesProvenanceHeader(record.localDestination));
const oldUpstream = new Map();
let conflicted = [];
if (!refresh) for (const record of ownedRecords) oldUpstream.set(record.id, await upstreamSource(record).catch(() => null));
const previousPublicApi = refresh
  ? await gitShow(baseRef, "config/baselines/pinned-pi-public-api.json").then(JSON.parse, () => null)
  : await readFile(join(repository, "config", "baselines", "pinned-pi-public-api.json"), "utf8").then(JSON.parse, () => null);

await step("bump", async () => {
  const manifestPath = join(repository, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  for (const name of PI_PACKAGES) {
    if (manifest.dependencies?.[name] === undefined) throw new Error(`${name} is not a dependency`);
    manifest.dependencies[name] = version;
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await run(npm, ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"]);
  return `pinned ${PI_PACKAGES.join(" and ")} at ${version}`;
});
await step("evaluator", async () => {
  const candidate = await evaluatePiCandidate({ packages: Object.fromEntries(PI_PACKAGES.map(name => [name, version])), timeoutMs: 600_000 }, { repository });
  await writeFile(join(output, "candidate-report.json"), `${JSON.stringify(candidate, null, 2)}\n`);
  const compileOutput = candidate.stages.find(stage => stage.stage === "compile" && !stage.passed)?.output;
  if (compileOutput !== undefined) {
    // Rationale: the evaluator's bounded detail names one error; the reviewer needs every file that failed to compile.
    await writeFile(join(output, "candidate-compile.txt"), compileOutput);
    report.compile = summarizeCompileOutput(compileOutput);
  }
  if (!candidate.passed) throw new Error(candidate.migrations.map(item => `${item.stage}: ${item.message}`).join("; "));
  return candidate.stages.map(stage => stage.stage).join(", ");
});
await step("install", async () => { await run(npm, ["ci", "--ignore-scripts"]); return "installed the candidate dependency set"; });
await step("build", async () => { await run(npm, ["run", "build"]); return "built"; });
await step("merge", async () => {
  for (const record of ownedRecords) {
    const before = oldUpstream.get(record.id);
    const after = await upstreamSource(record).catch(() => null);
    const ownedPath = join(repository, record.localDestination);
    if (before === null || after === null) { report.merge.conflicted.push(record.localDestination); report.reviewItems.push(`${record.localDestination}: upstream source unavailable for the three-way merge`); continue; }
    if (before === after) { report.merge.unchanged.push(record.localDestination); continue; }
    if (record.upgradeStrategy === "keep-owned") {
      // Invariant: a copy A1 keeps on purpose is never merged; its upstream delta is evidence for the reviewer, not a change to the tree.
      const lines = await recordKeptDelta(record, before, after);
      report.merge.kept.push({ path: record.localDestination, lines });
      report.reviewItems.push(`${record.localDestination}: upstream changed (${lines} delta lines), A1 version kept; see kept/${keptFileName(record)} in the artifact for anything worth carrying over`);
      continue;
    }
    const { body } = splitProvenanceHeader(await readFile(ownedPath, "utf8"));
    const scratch = await mkdtemp(join(tmpdir(), "pi-merge-"));
    try {
      const paths = { owned: join(scratch, "owned.ts"), base: join(scratch, "base.ts"), theirs: join(scratch, "theirs.ts") };
      await Promise.all([writeFile(paths.owned, body), writeFile(paths.base, before), writeFile(paths.theirs, after)]);
      const merged = await execute("git", ["merge-file", "-p", "--diff3", "-L", "a1", "-L", `pi ${previous.version}`, "-L", `pi ${version}`, paths.owned, paths.base, paths.theirs], { cwd: repository, maxBuffer: 64 * 1024 * 1024 })
        .then(result => ({ conflicts: 0, text: result.stdout }), error => typeof error.code === "number" && error.code > 0 && error.code < 128 && typeof error.stdout === "string"
          ? { conflicts: error.code, text: error.stdout }
          : Promise.reject(error));
      await writeFile(ownedPath, merged.text);
      (merged.conflicts > 0 ? report.merge.conflicted : report.merge.clean).push(record.localDestination);
      if (merged.conflicts > 0) report.reviewItems.push(`${record.localDestination}: ${merged.conflicts} conflict ${merged.conflicts === 1 ? "hunk" : "hunks"} between A1's deviations and the upstream change`);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  }
  return `${report.merge.clean.length} clean, ${report.merge.conflicted.length} conflicted, ${report.merge.unchanged.length} unchanged, ${report.merge.kept.length} kept`;
});
await step("ledger", async () => {
  await run(process.execPath, ["scripts/pi/update-pinned-pi-source-ledger.mjs", ...(commit === null ? [] : ["--commit", commit])]);
  return "source ledger and provenance headers regenerated";
});
// Invariant: a conflict marker is a syntax error, so the gates that compile the tree are blocked by the conflicted copies rather than run to fail.
conflicted = await conflictedCopies();
await step("inventories", async () => {
  const reportPath = join(output, "inventory-report.json");
  await run(process.execPath, ["scripts/pi/sync-pi-inventories.mjs", "--report", reportPath, ...(commit === null ? [] : ["--commit", commit])]);
  const resolved = JSON.parse(await readFile(reportPath, "utf8"));
  report.inventories = {
    reanchored: [...resolved.modal.reanchored, ...resolved.presenters.reanchored, ...resolved.behaviors.reanchored],
    moved: resolved.behaviors.moved,
    orphaned: [...resolved.modal.orphaned, ...resolved.presenters.orphaned, ...resolved.behaviors.orphaned],
    unmapped: resolved.modal.unmappedComponents,
  };
  for (const id of report.inventories.orphaned) report.reviewItems.push(`inventory entry ${id}: source anchor no longer exists (orphaned)`);
  for (const name of report.inventories.unmapped) report.reviewItems.push(`interactive component ${name}: not in the modal transition graph (unmapped)`);
  return `${report.inventories.reanchored.length} re-anchored, ${report.inventories.moved.length} moved, ${report.inventories.orphaned.length} orphaned, ${report.inventories.unmapped.length} unmapped`;
});
await step("public-api", async () => {
  const next = await collectPiPublicApi({ packagesRoot: join(repository, "node_modules"), sourceRoot: join(repository, "src") });
  await writeFile(join(output, "public-api.json"), `${JSON.stringify(next, null, 2)}\n`);
  await writeFile(join(repository, "config", "baselines", "pinned-pi-public-api.json"), `${JSON.stringify(next, null, 2)}\n`);
  if (previousPublicApi === null) throw new Error("no previous public API baseline to compare against; the candidate surface was recorded");
  report.publicApi = diffPublicApi(previousPublicApi, next);
  report.reviewItems.push(...publicApiReviewItems(report.publicApi));
  return `${report.publicApi.added.length} added, ${report.publicApi.removed.length} removed, ${report.publicApi.changed.length} changed`;
});
await step("matrix", async () => {
  const reportPath = join(output, "feature-matrix-report.json");
  await run(process.execPath, ["scripts/pi/update-pi-feature-adoption-matrix.mjs", "--report", reportPath]);
  const resolved = JSON.parse(await readFile(reportPath, "utf8"));
  const matrix = JSON.parse(await readFile(join(repository, "config", "baselines", "pi-feature-adoption-matrix.json"), "utf8"));
  const rows = new Map(matrix.rows.map(row => [row.id, row]));
  report.features = {
    created: resolved.created.map(id => ({ id, feature: rows.get(id)?.feature ?? id, summary: rows.get(id)?.summary })),
    retired: resolved.retired,
    pending: resolved.pending,
  };
  report.reviewItems.push(...matrixReviewItems(resolved));
  if (resolved.pending.length > 0) report.reviewItems.push(`${resolved.pending.length} feature matrix ${resolved.pending.length === 1 ? "row is" : "rows are"} pending a disposition: ${resolved.pending.join(", ")}`);
  return `${resolved.created.length} new upstream ${resolved.created.length === 1 ? "feature" : "features"}, ${resolved.retired.length} retired, ${resolved.pending.length} pending`;
});
await step("startup-graph", async () => {
  await run(process.execPath, ["scripts/pi/update-startup-graph-baseline.mjs"]);
  const build = steps.find(candidate => candidate.name === "build");
  if (build?.status === "failed") {
    // Rationale: the build validates the baseline it just moved; a build that failed only on the old totals passes now.
    await run(npm, ["run", "build"]);
    build.status = "passed";
    build.detail = "failed against the previous startup baseline; passed after the startup-graph re-pin";
  }
  return "startup graph and Pi artifact totals re-pinned";
});
await step("parity", async () => { await run(npm, ["run", "sync:pi-ui"]); return "component and event-frame evidence regenerated"; });
await step("typecheck", async () => { await run(npm, ["run", "typecheck"]); return "clean"; });
await step("architecture", async () => { await run(npm, ["run", "check:architecture"]); return "clean"; });
await step("engine-conformance", async () => { await run(process.execPath, ["scripts/pi/run-pi-engine-conformance.mjs"]); return "passed"; });
await step("parity-suites", async () => {
  await run("npx", ["vitest", "run", "test/features/owned-ui", "test/integrations/pi/components", "test/repository-governance"]);
  return "passed";
});
report.changelog = await upstreamChangelog(version).catch(() => null);
report.reviewItems.push(...await staleIdentityMentions(previous));

const specPath = join(repository, "openspec", "specs", "owned-pi-ui-foundation", "spec.md");
const changeRoot = join(repository, "openspec", "changes", changeId(version));
// Invariant: an existing scaffold belongs to the reviewer who may have edited it; only a missing one is written.
if (commit !== null && !await exists(changeRoot)) {
  const files = renderUpgradeChange({ previous, version, commit, foundationSpec: await readFile(specPath, "utf8"), date: new Date().toISOString().slice(0, 10) });
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(repository, path)), { recursive: true });
    await writeFile(join(repository, path), content);
  }
}
await finish({ changed: true, ...report, body: renderUpgradeBody(report) });

async function step(name, work) {
  if (!UPGRADE_STEPS.includes(name)) throw new Error(`unknown upgrade step ${name}`);
  if (refresh && !REFRESH_STEPS.includes(name)) {
    steps.push({ name, status: "skipped", detail: "not re-run on a refresh" });
  } else if (MARKER_BLOCKED_STEPS.includes(name) && conflicted.length > 0) {
    steps.push({ name, status: "blocked", detail: `conflict markers remain in ${conflicted.join(", ")}` });
  } else {
    try {
      const detail = await work();
      steps.push({ name, status: "passed", detail: bounded(detail) });
    } catch (error) {
      steps.push({ name, status: "failed", detail: bounded(error?.stderr || error?.stdout || (error instanceof Error ? error.message : String(error))) });
    }
  }
  const last = steps.at(-1);
  process.stdout.write(`${last.status} ${name}: ${last.detail}\n`);
}

async function finish(result) {
  await writeFile(join(output, "report.json"), `${JSON.stringify(result, null, 2)}\n`);
  if (result.body) await writeFile(join(output, "body.md"), result.body);
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `changed=${result.changed}\nversion=${result.version}\nbranch=${result.branch ?? ""}\nmode=${refresh ? "refresh" : "propose"}\nskipped=${(result.skipped ?? []).join(",")}\n`, { flag: "a" });
  }
  process.stdout.write(`${result.changed ? `${refresh ? "Refreshed" : "Proposed"} Pi ${result.version} on ${result.branch}` : result.message}; report in ${output}\n`);
}

/**
 * The newest published version newer than the pin that is not skipped, walking down from the
 * newest; `--version` names one directly and ignores skips. Prereleases are never proposed.
 */
async function selectVersion(pinned) {
  if (requestedVersion !== undefined) return { version: requestedVersion, skipped: [] };
  const published = JSON.parse((await run(npm, ["view", "@earendil-works/pi-coding-agent", "versions", "--json"])).stdout);
  const candidates = (Array.isArray(published) ? published : [published])
    .filter(candidate => !candidate.includes("-") && compareVersions(candidate, pinned) > 0)
    .sort((left, right) => compareVersions(right, left));
  const skipped = [];
  for (const candidate of candidates) {
    if (skippedVersions.includes(candidate)) { skipped.push(candidate); continue; }
    return { version: candidate, skipped };
  }
  return { version: null, skipped };
}

/** The pinned identity of the base branch, read from git so a refresh compares against what `develop` pins. */
async function baseIdentity() {
  const manifest = JSON.parse(await gitShow(baseRef, "package.json"));
  const baseline = JSON.parse(await gitShow(baseRef, "config/baselines/pinned-pi-interactive-baseline.json"));
  const pinned = manifest.dependencies?.["@earendil-works/pi-coding-agent"];
  if (typeof pinned !== "string" || typeof baseline?.upstream?.commit !== "string") throw new Error(`${baseRef} does not pin Pi`);
  return { version: pinned, commit: baseline.upstream.commit };
}

async function gitShow(ref, path) {
  return (await execute("git", ["show", `${ref}:${path}`], { cwd: repository, maxBuffer: 64 * 1024 * 1024 })).stdout;
}

async function resolveCommit(target) {
  const fromRegistry = (await run(npm, ["view", `@earendil-works/pi-coding-agent@${target}`, "gitHead"]).catch(() => ({ stdout: "" }))).stdout.trim();
  if (/^[0-9a-f]{40}$/.test(fromRegistry)) return fromRegistry;
  const fromTag = (await run("gh", ["api", `repos/earendil-works/pi/git/ref/tags/v${target}`, "--jq", ".object.sha"]).catch(() => ({ stdout: "" }))).stdout.trim();
  return /^[0-9a-f]{40}$/.test(fromTag) ? fromTag : null;
}

async function upstreamSource(record) {
  const packageRoot = join(repository, "node_modules", ...record.package.split("/"));
  const sourceMap = JSON.parse(await readFile(join(packageRoot, "dist", record.sourceMap), "utf8"));
  if (sourceMap.sources?.length !== 1 || sourceMap.sourcesContent?.length !== 1) throw new Error(`invalid source map: ${record.sourceMap}`);
  return sourceMap.sourcesContent[0].replaceAll("\r\n", "\n");
}

/** Write the upstream delta of a kept copy to the artifact and return its line count. */
async function recordKeptDelta(record, before, after) {
  const scratch = await mkdtemp(join(tmpdir(), "pi-kept-"));
  try {
    const paths = { before: join(scratch, "before.ts"), after: join(scratch, "after.ts") };
    await Promise.all([writeFile(paths.before, before), writeFile(paths.after, after)]);
    const delta = await execute("git", ["diff", "--no-index", "--", paths.before, paths.after], { cwd: repository, maxBuffer: 64 * 1024 * 1024 })
      .then(result => result.stdout, error => typeof error.stdout === "string" ? error.stdout : Promise.reject(error));
    await mkdir(join(output, "kept"), { recursive: true });
    await writeFile(join(output, "kept", keptFileName(record)), delta);
    return delta.split("\n").filter(line => /^[+-]/.test(line) && !/^(\+\+\+|---) /.test(line)).length;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

function keptFileName(record) {
  return `${record.id.replace(/[^0-9A-Za-z]+/g, "-")}.diff`;
}

/** The owned copies that carry conflict markers, from the merge or from the reviewer's head on a refresh. */
async function conflictedCopies() {
  const paths = [];
  for (const record of ownedRecords) {
    const text = await readFile(join(repository, record.localDestination), "utf8").catch(() => "");
    if (CONFLICT_MARKER.test(text)) paths.push(record.localDestination);
  }
  return paths;
}

async function upstreamChangelog(target) {
  const path = join(repository, "node_modules", "@earendil-works", "pi-coding-agent", "CHANGELOG.md");
  const text = await readFile(path, "utf8");
  const start = text.indexOf(`## [${target}]`);
  if (start === -1) return null;
  const next = text.indexOf("\n## [", start + 1);
  return text.slice(start, next === -1 ? text.length : next).trim().split("\n").slice(0, 40).join("\n");
}

/** Files outside the regenerated set that still name the previous pin, for the reviewer to decide on. */
async function staleIdentityMentions(identity) {
  const result = await run("git", ["grep", "-l", "-e", identity.version, "-e", identity.commit.slice(0, 7), "--", "src", "test", "docs", "scripts", "config"]).catch(() => ({ stdout: "" }));
  const files = result.stdout.split("\n").map(line => line.trim()).filter(Boolean);
  return files.length === 0 ? [] : [`${files.length} files still mention ${identity.version} or ${identity.commit.slice(0, 7)}: ${files.slice(0, 12).join(", ")}${files.length > 12 ? ", ..." : ""}`];
}

function run(command, args) {
  // Platform: npm, npx, and gh are .cmd shims on Windows and need a shell; git and node do not.
  return execute(command, args, { cwd: repository, maxBuffer: 64 * 1024 * 1024, shell: process.platform === "win32" && [npm, "npx", "gh"].includes(command), windowsHide: true });
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function bounded(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > 400 ? `${text.slice(0, 397)}...` : text;
}

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function argumentValues(flag) {
  const values = [];
  for (const [index, argument] of process.argv.entries()) if (argument === flag && process.argv[index + 1] !== undefined) values.push(process.argv[index + 1]);
  return values;
}
