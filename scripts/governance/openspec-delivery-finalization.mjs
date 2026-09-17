import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, unlink, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { archiveFailure, archivePaths, assertArchiveDiff, assertRepositoryPath, inspectTasks, parseImplementation, SHA } from "./openspec-archive-policy.mjs";
import { parseImplementationAcceptanceScenarios } from "./openspec-acceptance-checklist.mjs";
import { conditionalAcceptanceBytes, deliveryContentDigest, parseConditionalAcceptance,
  verifyConditionalAcceptance } from "./openspec-delivery-policy.mjs";
import { loadArchiveTool } from "./openspec-archive-staging.mjs";

const MAX_FILE = 8 * 1024 * 1024;

async function collect(root, directory = "openspec") {
  const result = new Map();
  async function walk(rel) {
    for (const entry of await readdir(join(root, rel), { withFileTypes: true })) {
      const path = `${rel}/${entry.name}`;
      if (entry.isSymbolicLink()) throw archiveFailure("unsafe-generated-file");
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) {
        const bytes = await readFile(join(root, path));
        if (bytes.length > MAX_FILE) throw archiveFailure("delivery-file-size", path);
        result.set(path, bytes);
      } else throw archiveFailure("unsafe-generated-file");
    }
  }
  await walk(directory);
  return result;
}

function diffEntries(before, after) {
  const changes = [];
  for (const path of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const previous = before.get(path);
    const next = after.get(path);
    if (previous && next && previous.equals(next)) continue;
    changes.push({ filename: path, status: next ? previous ? "modified" : "added" : "removed", data: next ?? null });
  }
  return changes;
}

export function replaceImplementationMetadata(body, metadata) {
  parseImplementation(body);
  const lines = body.replaceAll("\r\n", "\n").split("\n");
  let start = -1;
  let end = -1;
  let marker = "";
  for (let index = 0; index < lines.length; index += 1) {
    const opening = /^ {0,3}(`{3,}|~{3,})openspec-implementation\s*$/.exec(lines[index]);
    if (!opening) continue;
    if (start !== -1) throw archiveFailure("metadata-duplicate");
    start = index;
    marker = opening[1];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (new RegExp(`^ {0,3}${marker[0]}{${marker.length},}\\s*$`).test(lines[cursor])) { end = cursor; break; }
    }
  }
  if (start < 0 || end < 0) throw archiveFailure("metadata-unclosed");
  const replacement = [lines[start], JSON.stringify(metadata, null, 2), lines[end]];
  return [...lines.slice(0, start), ...replacement, ...lines.slice(end + 1)].join("\n");
}

function artifactEntries(entries, prefix, except = new Set()) {
  return [...entries].filter(([path]) => path.startsWith(prefix) && !except.has(path));
}

async function verifyPrepared({ root, body, repository, sourcePr, specBaseSha, knownGaps }) {
  const implementation = parseImplementation(body);
  if (implementation?.version !== 3 || !implementation.archive || !implementation.acceptanceManifest) throw archiveFailure("delivery-not-finalized");
  const manifestText = await readFile(join(root, implementation.acceptanceManifest), "utf8");
  const manifest = parseConditionalAcceptance(manifestText);
  if (manifest.specBaseSha !== specBaseSha) throw archiveFailure("delivery-target-stale");
  const entries = await collect(root);
  const archiveEntries = artifactEntries(entries, implementation.archive, new Set([implementation.acceptanceManifest]));
  const evidenceEntries = archiveEntries.filter(([path]) => /(?:^|\/)(?:evidence\/|implementation-evidence\.md$)/.test(path));
  const tasksBytes = entries.get(`${implementation.archive}tasks.md`);
  if (!tasksBytes) throw archiveFailure("delivery-tasks-missing");
  const deltaCapabilities = archiveEntries.flatMap(([path]) => {
    const match = new RegExp(`^${implementation.archive.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}specs/(.+)/spec\\.md$`).exec(path);
    return match ? [match[1]] : [];
  });
  const specEntries = deltaCapabilities.map(capability => {
    const path = `openspec/specs/${capability}/spec.md`;
    const bytes = entries.get(path);
    if (!bytes) throw archiveFailure("delivery-spec-missing", capability);
    return [path, bytes];
  });
  return { implementation, manifest, ...verifyConditionalAcceptance(manifest, { implementation, repository, sourcePr,
    archiveEntries, specEntries, evidenceEntries, tasksBytes, scenarios: parseImplementationAcceptanceScenarios(body, 3), knownGaps }) };
}

async function applyChanges(root, changes, bodyPath, updatedBody) {
  const backups = [];
  try {
    for (const change of changes) {
      const path = join(root, change.filename);
      let previous = null;
      try { previous = await readFile(path); } catch (error) { if (error.code !== "ENOENT") throw error; }
      backups.push([path, previous]);
      if (change.data === null) await unlink(path);
      else { await mkdir(join(path, ".."), { recursive: true }); await writeFile(path, change.data); }
    }
    if (bodyPath) {
      let previous = null;
      try { previous = await readFile(bodyPath); } catch (error) { if (error.code !== "ENOENT") throw error; }
      backups.push([bodyPath, previous]);
      await writeFile(bodyPath, updatedBody);
    }
  } catch (error) {
    for (const [path, bytes] of backups.reverse()) {
      if (bytes === null) await rm(path, { force: true });
      else { await mkdir(join(path, ".."), { recursive: true }); await writeFile(path, bytes); }
    }
    throw error;
  }
}

const CANONICAL_SPECS = "openspec/specs/";

function assertTargetSpecs(targetSpecs) {
  if (!(targetSpecs instanceof Map) || targetSpecs.size > 20_000) throw archiveFailure("delivery-target-specs");
  for (const [path, bytes] of targetSpecs) {
    if (typeof path !== "string" || !path.startsWith(CANONICAL_SPECS) || !Buffer.isBuffer(bytes) || bytes.length > MAX_FILE) throw archiveFailure("delivery-target-specs");
    assertRepositoryPath(path);
  }
}

/** Replace the sandbox's canonical specs with the target's so a delta is applied against a fresh baseline. */
async function resetCanonicalSpecs(sandbox, current, targetSpecs) {
  for (const path of current.keys()) if (path.startsWith(CANONICAL_SPECS)) await rm(join(sandbox, path), { force: true });
  for (const [path, bytes] of targetSpecs) {
    await mkdir(join(sandbox, path, ".."), { recursive: true });
    await writeFile(join(sandbox, path), bytes);
  }
}

function canonicalSpecsMatch(entries, targetSpecs) {
  const current = [...entries].filter(([path]) => path.startsWith(CANONICAL_SPECS));
  return current.length === targetSpecs.size && current.every(([path, bytes]) => targetSpecs.get(path)?.equals(bytes));
}

/**
 * Prepare, verify, or repeat the single-PR finalization of one change. With `targetSpecs` (the target's complete
 * `openspec/specs/**` bytes) a finalized head whose record no longer verifies is re-finalized from its archived form
 * under the same archive date instead of failing on drift.
 */
export async function prepareSinglePrDelivery({ root, change, repository, sourcePr, body, specBaseSha, date,
  knownGaps = [], write = false, bodyPath = null, targetSpecs = null, toolRoot = join(root, "node_modules/@fission-ai/openspec") }) {
  root = resolve(root);
  if (!SHA.test(specBaseSha ?? "")) throw archiveFailure("delivery-target-identity");
  if (targetSpecs !== null) assertTargetSpecs(targetSpecs);
  const implementation = parseImplementation(body);
  if (implementation?.version !== 3 || implementation.change !== change) throw archiveFailure("delivery-implementation-identity");
  const active = `openspec/changes/${change}/`;
  let source = active;
  let refinalize = false;
  if (implementation.archive || implementation.acceptanceManifest) {
    try {
      const verified = await verifyPrepared({ root, body, repository, sourcePr, specBaseSha, knownGaps });
      return { disposition: "already-finalized", changes: [], body, ...verified };
    } catch (error) {
      if (targetSpecs === null || !error.archiveCode || error.archiveCode === "delivery-not-finalized") throw error;
    }
    refinalize = true;
    source = implementation.archive;
    date = implementation.archive.slice("openspec/changes/archive/".length, "openspec/changes/archive/".length + 10);
  }
  const taskText = await readFile(join(root, source, "tasks.md"), "utf8").catch(() => { throw archiveFailure("delivery-tasks-missing"); });
  inspectTasks(taskText);
  const scenarios = parseImplementationAcceptanceScenarios(body, 3);
  if (!Array.isArray(knownGaps) || knownGaps.some(gap => typeof gap !== "string" || !gap.trim())) throw archiveFailure("delivery-known-gaps");
  const before = await collect(root);
  if (targetSpecs !== null && !refinalize && !canonicalSpecsMatch(before, targetSpecs)) throw archiveFailure("delivery-specs-diverged");
  const sandbox = await realpath(await mkdtemp(join(tmpdir(), "openspec-delivery-")));
  try {
    await cp(join(root, "openspec"), join(sandbox, "openspec"), { recursive: true, errorOnExist: true });
    if (refinalize) {
      await resetCanonicalSpecs(sandbox, before, targetSpecs);
      await rm(join(sandbox, implementation.acceptanceManifest), { force: true });
      await rename(join(sandbox, implementation.archive), join(sandbox, active)).catch(() => { throw archiveFailure("delivery-artifact-missing"); });
    }
    const tool = await loadArchiveTool(toolRoot);
    const status = await tool.command(sandbox, ["status", "--change", change, "--json"]);
    if (status.schemaName !== "spec-driven" || status.planningHome?.kind !== "repo"
      || status.artifacts?.some(item => !["done", "skipped"].includes(item.status))) throw archiveFailure("artifacts-incomplete");
    await tool.command(sandbox, ["validate", change, "--type", "change", "--strict", "--no-interactive"]);
    const deltaPaths = status.artifactPaths.specs?.existingOutputPaths ?? [];
    const capabilities = deltaPaths.map(path => {
      const rel = relative(sandbox, path).replaceAll("\\", "/");
      const match = new RegExp(`^${active.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}specs/(.+)/spec\\.md$`).exec(rel);
      if (!match) throw archiveFailure("delta-path", rel);
      return match[1];
    });
    if (!capabilities.length && status.artifacts.find(item => item.id === "specs")?.status !== "skipped") throw archiveFailure("delta-missing");
    const paths = archivePaths(change, date, capabilities);
    if (!refinalize && [...before.keys()].some(path => path.startsWith(paths.archive))) throw archiveFailure("archive-target-collision");
    const oldArchives = new Set(await readdir(join(sandbox, "openspec/changes/archive")));
    await tool.command(sandbox, ["archive", change, "--yes", "--json"]);
    const created = (await readdir(join(sandbox, "openspec/changes/archive"))).filter(name => !oldArchives.has(name));
    if (created.length !== 1) throw archiveFailure("archive-move");
    const actual = `openspec/changes/archive/${created[0]}/`;
    if (actual !== paths.archive) await rename(join(sandbox, actual), join(sandbox, paths.archive));
    const staged = await collect(sandbox);
    const archiveEntries = artifactEntries(staged, paths.archive);
    const tasksBytes = staged.get(`${paths.archive}tasks.md`);
    if (!tasksBytes) throw archiveFailure("delivery-tasks-missing");
    inspectTasks(tasksBytes.toString());
    const evidenceEntries = archiveEntries.filter(([path]) => /(?:^|\/)(?:evidence\/|implementation-evidence\.md$)/.test(path));
    const specEntries = paths.specs.map(path => {
      const bytes = staged.get(path);
      if (!bytes) throw archiveFailure("delivery-spec-missing", path);
      return [path, bytes];
    });
    const manifest = { version: 3, repository, change, sourcePr, archive: paths.archive,
      acceptanceManifest: `${paths.archive}acceptance.md`, finalizedDate: date, specBaseSha, acceptanceScenarios: scenarios,
      archiveDigest: deliveryContentDigest(archiveEntries), specDigest: deliveryContentDigest(specEntries),
      tasksDigest: createHash("sha256").update(tasksBytes).digest("hex"), evidenceDigest: deliveryContentDigest(evidenceEntries), knownGaps };
    const acceptanceText = conditionalAcceptanceBytes(manifest);
    await writeFile(join(sandbox, manifest.acceptanceManifest), acceptanceText);
    const finalized = { version: 3, change, archive: manifest.archive, acceptanceManifest: manifest.acceptanceManifest };
    const updatedBody = replaceImplementationMetadata(body, finalized);
    const after = await collect(sandbox);
    const changes = diffEntries(before, after);
    assertArchiveDiff(changes, paths);
    await verifyPrepared({ root: sandbox, body: updatedBody, repository, sourcePr, specBaseSha, knownGaps });
    if (write) {
      await applyChanges(root, changes, bodyPath, updatedBody);
      await rm(join(root, paths.active), { recursive: true, force: true });
    }
    const disposition = write ? (refinalize ? "refinalized" : "finalized") : (refinalize ? "would-refinalize" : "would-finalize");
    return { disposition, refinalized: refinalize, paths, changes, body: updatedBody, manifest };
  } finally { await rm(sandbox, { recursive: true, force: true }); }
}
