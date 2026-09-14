import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, readFile, writeFile, readdir, rename, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, relative, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { archiveFailure, archivePaths, assertRepositoryPath, inspectTasks, completePreparationTask, assertArchiveDiff, SHA } from "./openspec-archive-policy.mjs";

const execute = promisify(execFile);
const MAX_BLOB = 8 * 1024 * 1024;
const MAX_TREE = 32 * 1024 * 1024;
export const OPENSPEC_VERSION = "1.11.0";

export async function loadArchiveTool(packageRoot, { deadline = Infinity } = {}) {
  const root = resolve(packageRoot);
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  if (pkg.name !== "@fission-ai/openspec" || pkg.version !== OPENSPEC_VERSION) throw archiveFailure("openspec-version");
  const parser = await import(pathToFileURL(join(root, "dist/core/parsers/requirement-blocks.js")).href);
  const apply = await import(pathToFileURL(join(root, "dist/core/specs-apply.js")).href);
  const fences = await import(pathToFileURL(join(root, "dist/core/parsers/code-fence.js")).href);
  const yaml = createRequire(join(root, "package.json"))("yaml");
  async function command(cwd, args) {
    // Security: candidate configuration cannot inherit tokens, registered stores, or code-loading flags.
    const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: tmpdir(), TMP: tmpdir(),
      HOME: join(cwd, ".tool-home"), USERPROFILE: join(cwd, ".tool-home"), XDG_CONFIG_HOME: join(cwd, ".tool-home"),
      NO_COLOR: "1", CI: "true", OPENSPEC_TELEMETRY: "0" };
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw archiveFailure("archive-deadline");
    try {
      const result = await execute(process.execPath, [join(root, "bin/openspec.js"), ...args], { cwd, env, timeout: Math.min(30_000, remaining), maxBuffer: MAX_BLOB });
      return args.includes("--json") ? JSON.parse(result.stdout) : result.stdout;
    } catch { throw archiveFailure("openspec-operation", args[0]); }
  }
  return { ...parser, ...apply, ...fences, yaml, command };
}

export async function snapshotOpenSpec(reader, sha) {
  const response = await reader.get(`${reader.prefix}/git/trees/${sha}?recursive=1`);
  if (response.truncated || !Array.isArray(response.tree) || response.tree.length > 20_000) throw archiveFailure("repository-tree");
  const entries = new Map();
  for (const item of response.tree.filter(item => item.path === "openspec" || item.path.startsWith("openspec/"))) {
    assertRepositoryPath(item.path);
    if (!SHA.test(item.sha ?? "") || !(item.type === "tree" && item.mode === "040000"
      || item.type === "blob" && ["100644", "100755"].includes(item.mode))) throw archiveFailure("unsafe-openspec-tree");
    if (item.type === "blob") entries.set(item.path, item.sha);
  }
  const cache = new Map();
  let bytes = 0;
  async function blob(path) {
    const id = entries.get(path);
    if (!id) return null;
    if (!cache.has(id)) {
      const value = await reader.get(`${reader.prefix}/git/blobs/${id}`);
      if (value.encoding !== "base64" || value.size > MAX_BLOB || typeof value.content !== "string") throw archiveFailure("spec-blob");
      const data = Buffer.from(value.content, "base64");
      if (data.length !== value.size || data.length > MAX_BLOB || (bytes += data.length) > MAX_TREE) throw archiveFailure("spec-blob-size");
      const hash = createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");
      if (hash !== id) throw archiveFailure("spec-blob-identity");
      cache.set(id, data);
    }
    return cache.get(id);
  }
  return { entries, blob };
}

function requirementMap(tool, content) {
  const parts = content ? tool.extractRequirementsSection(content) : { bodyBlocks: [] };
  const map = new Map();
  for (const block of parts.bodyBlocks) {
    const name = tool.normalizeRequirementName(block.name);
    if (map.has(name)) throw archiveFailure("sync-duplicate-requirement");
    map.set(name, block);
  }
  return map;
}
const normalized = block => block?.raw.replaceAll("\r\n", "\n").trim();

function purpose(tool, content) {
  if (!content) return null;
  const lines = content.replaceAll("\r\n", "\n").split("\n");
  const masked = tool.buildCodeFenceMask(lines);
  const starts = lines.flatMap((line, index) => !masked[index] && /^## Purpose\s*$/.test(line) ? [index] : []);
  if (starts.length > 1) throw archiveFailure("sync-purpose-conflict");
  if (!starts.length) return null;
  const start = starts[0];
  const end = lines.findIndex((line, index) => index > start && !masked[index] && /^#{1,2} /.test(line));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n").trim();
}

export function verifySyncBaseline(tool, baseline, current, delta) {
  const declaredPurpose = purpose(tool, delta);
  if (current && declaredPurpose !== null && declaredPurpose !== purpose(tool, current)) throw archiveFailure("sync-purpose-conflict");
  if (!baseline && !current && (!declaredPurpose || declaredPurpose.length < 50)) throw archiveFailure("sync-purpose-missing");
  const before = requirementMap(tool, baseline);
  const now = requirementMap(tool, current);
  const plan = tool.parseDeltaSpec(delta);
  if (plan.skippedHeaders.length) throw archiveFailure("sync-skipped-heading");
  const expected = new Map(now);
  const changed = new Set();
  const desired = new Map(plan.modified.map(block => [tool.normalizeRequirementName(block.name), block]));
  for (const operation of plan.renamed) {
    const from = tool.normalizeRequirementName(operation.from);
    const to = tool.normalizeRequirementName(operation.to);
    const original = before.get(from);
    if (!original || changed.has(from) || changed.has(to)) throw archiveFailure("sync-rename");
    const renamed = { ...original, name: to, raw: original.raw.replace(original.headerLine, `### Requirement: ${to}`) };
    const target = desired.get(to) ?? renamed;
    if (now.has(from)) {
      if (normalized(now.get(from)) !== normalized(original) || now.has(to)) throw archiveFailure("sync-baseline-conflict");
    } else if (normalized(now.get(to)) !== normalized(target)) throw archiveFailure("sync-baseline-conflict");
    expected.delete(from);
    expected.set(to, target);
    changed.add(from);
    changed.add(to);
  }
  for (const block of plan.modified) {
    const name = tool.normalizeRequirementName(block.name);
    const renamed = plan.renamed.find(item => tool.normalizeRequirementName(item.to) === name);
    const oldName = renamed ? tool.normalizeRequirementName(renamed.from) : name;
    const original = before.get(oldName);
    if (!original || !renamed && changed.has(name)) throw archiveFailure("sync-modified-missing");
    if (tool.findMissingCurrentScenarios(original, block).length) throw archiveFailure("sync-scenario-loss");
    if (!renamed && normalized(now.get(name)) !== normalized(original) && normalized(now.get(name)) !== normalized(block)) {
      throw archiveFailure("sync-baseline-conflict");
    }
    expected.set(name, block);
    changed.add(name);
  }
  for (const nameValue of plan.removed) {
    const name = tool.normalizeRequirementName(nameValue);
    if (!before.has(name) || changed.has(name)) throw archiveFailure("sync-removal");
    if (now.has(name) && normalized(now.get(name)) !== normalized(before.get(name))) throw archiveFailure("sync-baseline-conflict");
    expected.delete(name);
    changed.add(name);
  }
  for (const block of plan.added) {
    const name = tool.normalizeRequirementName(block.name);
    if (changed.has(name) || now.has(name) && normalized(now.get(name)) !== normalized(block)) throw archiveFailure("sync-addition-conflict");
    expected.set(name, block);
    changed.add(name);
  }
  if (!changed.size) throw archiveFailure("sync-empty-delta");
  return expected;
}

export function verifySyncResult(tool, content, expected) {
  const actual = requirementMap(tool, content);
  if (actual.size !== expected.size || [...expected].some(([name, block]) => normalized(actual.get(name)) !== normalized(block))) {
    throw archiveFailure("sync-result-mismatch");
  }
}

function sandboxPath(root, value) {
  const target = resolve(value);
  const rel = relative(root, target);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw archiveFailure("artifact-path");
  return rel.replaceAll("\\", "/");
}

export async function prepareArchive({ reader, evidence, tool, date, expectedArchive = null }) {
  const change = evidence.implementation.change;
  const active = `openspec/changes/${change}/`;
  const source = await snapshotOpenSpec(reader, evidence.pull.head.sha);
  const target = await snapshotOpenSpec(reader, evidence.targetSha);
  const baseline = await snapshotOpenSpec(reader, evidence.acceptance.value.specBaseSha);
  const sourceEntries = [...source.entries].filter(([path]) => path.startsWith(active));
  const targetEntries = [...target.entries].filter(([path]) => path.startsWith(active));
  if (!sourceEntries.length || JSON.stringify(sourceEntries) !== JSON.stringify(targetEntries)) throw archiveFailure("active-change-drift");
  if (source.entries.has(`${active}acceptance.md`)) throw archiveFailure("existing-acceptance-review-required");
  // Platform: OpenSpec canonicalizes Windows short temp paths before resolving artifacts.
  const root = await realpath(await mkdtemp(join(tmpdir(), "openspec-archive-")));
  const original = new Map();
  try {
    for (const path of target.entries.keys()) {
      if (path === "openspec/config.yaml" || path.startsWith("openspec/specs/") || path.startsWith(active)) {
        const data = await target.blob(path);
        original.set(path, data);
        await mkdir(join(root, path, ".."), { recursive: true });
        await writeFile(join(root, path), data);
      }
    }
    const config = tool.yaml.parse(original.get("openspec/config.yaml")?.toString() ?? "");
    if (config?.schema !== "spec-driven" || config.store || config.schemas) throw archiveFailure("unsupported-openspec-root");
    const status = await tool.command(root, ["status", "--change", change, "--json"]);
    if (status.schemaName !== "spec-driven" || status.planningHome?.kind !== "repo"
      || status.artifacts?.some(item => !["done", "skipped"].includes(item.status))) throw archiveFailure("artifacts-incomplete");
    if (sandboxPath(root, status.changeRoot) !== active.slice(0, -1)) throw archiveFailure("artifact-path");
    const context = await tool.command(root, ["instructions", "archive", "--change", change, "--json"]);
    if (context.changeName !== change) throw archiveFailure("archive-instructions");
    const instructions = await tool.command(root, ["instructions", "specs", "--change", change, "--json"]);
    if (instructions.artifactId !== "specs" || instructions.changeName !== change
      || instructions.rules && Object.keys(instructions.rules).length) throw archiveFailure("unsupported-spec-rules");
    const taskPath = `${active}tasks.md`;
    const taskText = original.get(taskPath)?.toString();
    const mapping = evidence.implementation.archivePreparationTasks ?? {};
    inspectTasks(taskText, mapping);
    await tool.command(root, ["validate", change, "--type", "change", "--strict", "--no-interactive"]);
    const deltaPaths = status.artifactPaths.specs?.existingOutputPaths ?? [];
    const capabilities = deltaPaths.map(path => {
      const rel = sandboxPath(root, path);
      if (!rel.startsWith(`${active}specs/`) || !rel.endsWith("/spec.md")) throw archiveFailure("delta-path");
      return rel.slice(`${active}specs/`.length, -"/spec.md".length);
    });
    if (!capabilities.length && status.artifacts.find(item => item.id === "specs")?.status !== "skipped") throw archiveFailure("delta-missing");
    const paths = archivePaths(change, date, capabilities);
    if (expectedArchive && paths.archive !== expectedArchive) throw archiveFailure("archive-date-identity");
    if ([...target.entries.keys()].some(path => path.startsWith(paths.archive))) throw archiveFailure("archive-target-collision");
    const planned = new Map();
    const plannedText = new Map();
    await mkdir(join(root, "openspec/specs"), { recursive: true });
    let allSynced = true;
    for (const capability of capabilities) {
      const path = `openspec/specs/${capability}/spec.md`;
      const current = original.get(path)?.toString() ?? null;
      const old = (await baseline.blob(path))?.toString() ?? null;
      const delta = original.get(`${active}specs/${capability}/spec.md`)?.toString();
      try {
        const expected = verifySyncBaseline(tool, old, current, delta);
        const built = await tool.buildUpdatedSpec({ id: capability, exists: current !== null,
          sourceRoot: join(root, active, "specs"), source: join(root, active, "specs", capability, "spec.md"),
          targetRoot: join(root, "openspec/specs"), target: join(root, path) }, change, { silent: true });
        verifySyncResult(tool, built.rebuilt, expected);
        planned.set(path, expected);
        plannedText.set(path, built.rebuilt);
        try { verifySyncResult(tool, current, expected); } catch { allSynced = false; }
      } catch (error) { throw archiveFailure(error.archiveCode ?? "sync-preflight", capability); }
    }
    const acceptanceText = `# Recorded implementation acceptance\n\nVerdict: accepted. Archive preparation is not archive-PR integration.\n\n`
      + `Source PR: https://github.com/${reader.repository}/pull/${evidence.pull.number}\n`
      + `Accepted head: ${evidence.pull.head.sha}\nImplementation merge: ${evidence.pull.merge_commit_sha}\n`
      + `Validation: https://github.com/${reader.repository}/actions/runs/${evidence.validation.runId}\n`
      + `Acceptance: https://github.com/${reader.repository}/pull/${evidence.pull.number}#issuecomment-${evidence.acceptance.id}\n`
      + `Author: ${evidence.acceptance.author}\nRecorded: ${evidence.acceptance.createdAt}\n\n`
      + `\`\`\`openspec-acceptance\n${JSON.stringify(evidence.acceptance.value, null, 2)}\n\`\`\`\n`;
    await writeFile(join(root, active, "acceptance.md"), acceptanceText);
    const withEvidence = completePreparationTask(taskText, mapping, "recordEvidence");
    await writeFile(join(root, taskPath), withEvidence);
    await tool.command(root, ["archive", change, "--yes", "--json", ...(allSynced ? ["--skip-specs"] : [])]);
    const archives = await readdir(join(root, "openspec/changes/archive"));
    if (archives.length !== 1) throw archiveFailure("archive-move");
    const actualArchive = `openspec/changes/archive/${archives[0]}/`;
    if (actualArchive !== paths.archive) await rename(join(root, actualArchive), join(root, paths.archive));
    for (const [path, expected] of planned) {
      let content = null;
      try { content = await readFile(join(root, path), "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
      verifySyncResult(tool, content, expected);
      const intended = allSynced ? original.get(path)?.toString() : plannedText.get(path);
      if (content !== null && content.replaceAll("\r\n", "\n").trim() !== intended?.replaceAll("\r\n", "\n").trim()) {
        throw archiveFailure("sync-unrelated-content-change", path.slice("openspec/specs/".length, -"/spec.md".length));
      }
      if (content !== null) await tool.command(root, ["validate", path.slice("openspec/specs/".length, -"/spec.md".length), "--type", "spec", "--strict", "--no-interactive"]);
    }
    for (const [path, data] of original) {
      if (path.startsWith(active) && path !== taskPath) {
        if (!(await readFile(join(root, paths.archive, path.slice(active.length)))).equals(data)) throw archiveFailure("archive-artifact-loss");
      }
    }
    const finalTasks = completePreparationTask(withEvidence, mapping, "stageArchive");
    await writeFile(join(root, paths.archive, "tasks.md"), finalTasks);
    const after = new Map();
    async function collect(directory) {
      for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
        const path = `${directory}/${entry.name}`;
        if (entry.isSymbolicLink()) throw archiveFailure("unsafe-generated-file");
        if (entry.isDirectory()) await collect(path);
        else if (entry.isFile()) after.set(path, await readFile(join(root, path)));
        else throw archiveFailure("unsafe-generated-file");
      }
    }
    await collect("openspec");
    const changes = [];
    for (const path of new Set([...original.keys(), ...after.keys()])) {
      if (original.get(path)?.equals(after.get(path) ?? Buffer.alloc(0)) && after.has(path)) continue;
      changes.push({ filename: path, status: !after.has(path) ? "removed" : !original.has(path) ? "added" : "modified", data: after.get(path) ?? null });
    }
    assertArchiveDiff(changes, paths);
    return { paths, changes, sourceEntries, targetSha: evidence.targetSha, acceptanceText };
  } finally { await rm(root, { recursive: true, force: true }); }
}
