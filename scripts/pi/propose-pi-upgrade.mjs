/**
 * Proposes a Pi upgrade as a reviewable working tree: bumps both pinned packages to the newest
 * published version (or `--version`), evaluates the candidate in isolation, three-way merges each
 * vendored copy (old upstream, new upstream, A1 copy), regenerates the source ledger and provenance
 * headers, re-resolves the inventories, refreshes parity evidence, runs the gates, and writes the
 * pull-request body, the resolution report, and the OpenSpec scaffold under `--output`. It never
 * resolves a conflict, drops an inventory entry, or merges anything; a failed step is recorded and
 * the run continues so the pull request names every problem. With no newer version it writes
 * `changed=false` and exits.
 */
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { evaluatePiCandidate } from "../governance/pi-candidate-evaluator.mjs";
import { readPinnedPiIdentity } from "../governance/pinned-pi-identity.mjs";
import { carriesProvenanceHeader, splitProvenanceHeader } from "./pinned-pi-source-header.mjs";
import { UPGRADE_STEPS, branchName, changeId, renderUpgradeBody, renderUpgradeChange } from "./pi-upgrade-report.mjs";

const execute = promisify(execFile);
const repository = fileURLToPath(new URL("../..", import.meta.url));
const output = resolve(argumentValue("--output") ?? join(repository, ".artifacts", "pi-upgrade"));
const requestedVersion = argumentValue("--version");
const requestedCommit = argumentValue("--commit");
const PI_PACKAGES = ["@earendil-works/pi-coding-agent", "@earendil-works/pi-tui"];
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

await mkdir(output, { recursive: true });
const previous = await readPinnedPiIdentity(repository);
const version = requestedVersion ?? (await run(npm, ["view", "@earendil-works/pi-coding-agent", "version"])).stdout.trim();
if (version === previous.version) {
  await finish({ changed: false, previous, version, message: `Pi ${version} is current` });
  process.exit(0);
}
const commit = requestedCommit ?? await resolveCommit(version);
const steps = [];
const report = {
  schema: "a1-pi-upgrade-proposal-v1",
  previous: { version: previous.version, commit: previous.commit },
  version,
  commit,
  branch: branchName(version),
  change: changeId(version),
  steps,
  merge: { clean: [], conflicted: [], unchanged: [] },
  inventories: { reanchored: [], moved: [], orphaned: [], unmapped: [] },
  changelog: null,
  reviewItems: [],
};
if (commit === null) report.reviewItems.push("The upstream commit could not be resolved from the registry or the release tag; pass --commit to the sync.");

// Rationale: the old upstream sources exist only in the installed package, so they are captured before the bump.
const ledger = JSON.parse(await readFile(join(repository, "config", "baselines", "pinned-pi-source-port-ledger.json"), "utf8"));
const ownedRecords = ledger.records.filter(record => record.classification === "owned-presentation" && carriesProvenanceHeader(record.localDestination));
const oldUpstream = new Map();
for (const record of ownedRecords) oldUpstream.set(record.id, await upstreamSource(record).catch(() => null));

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
  return `${report.merge.clean.length} clean, ${report.merge.conflicted.length} conflicted, ${report.merge.unchanged.length} unchanged`;
});
await step("ledger", async () => {
  await run(process.execPath, ["scripts/pi/update-pinned-pi-source-ledger.mjs", ...(commit === null ? [] : ["--commit", commit])]);
  return "source ledger and provenance headers regenerated";
});
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
await step("parity", async () => { await run(npm, ["run", "sync:pi-ui"]); return "component, event-frame, and settings evidence regenerated"; });
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
if (commit !== null) {
  const files = renderUpgradeChange({ previous, version, commit, foundationSpec: await readFile(specPath, "utf8"), date: new Date().toISOString().slice(0, 10) });
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(repository, path)), { recursive: true });
    await writeFile(join(repository, path), content);
  }
}
await finish({ changed: true, ...report, body: renderUpgradeBody(report) });

async function step(name, work) {
  if (!UPGRADE_STEPS.includes(name)) throw new Error(`unknown upgrade step ${name}`);
  try {
    const detail = await work();
    steps.push({ name, passed: true, detail: bounded(detail) });
  } catch (error) {
    steps.push({ name, passed: false, detail: bounded(error?.stderr || error?.stdout || (error instanceof Error ? error.message : String(error))) });
  }
  process.stdout.write(`${steps.at(-1).passed ? "pass" : "FAIL"} ${name}: ${steps.at(-1).detail}\n`);
}

async function finish(result) {
  await writeFile(join(output, "report.json"), `${JSON.stringify(result, null, 2)}\n`);
  if (result.body) await writeFile(join(output, "body.md"), result.body);
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `changed=${result.changed}\nversion=${result.version}\nbranch=${result.branch ?? ""}\n`, { flag: "a" });
  }
  process.stdout.write(`${result.changed ? `Proposed Pi ${result.version} on ${result.branch}` : result.message}; report in ${output}\n`);
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

function bounded(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > 400 ? `${text.slice(0, 397)}...` : text;
}

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}
