import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, extname, posix, resolve } from "node:path";
import { promisify } from "node:util";
import ts from "typescript";
import { classifyCodeDocumentationSource, normalizeCodeDocumentationPath } from "../governance/code-documentation-policy.mjs";

const execFileAsync = promisify(execFile);
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs", ".json"];
const RENDERING_ENTRIES = Object.freeze(["test/support/rendering/rendering-producer-worker.ts"]);
const FULL_EXACT = new Set([
  ".github/workflows/ci.yml",
  ".github/workflows/full-regression.yml",
  ".github/workflows/release.yml",
  "config/validation-suites.json",
  "package-lock.json",
  "package.json",
  "scripts/release/validation-impact.mjs",
  "scripts/release/select-validation-impact.mjs",
  "tsconfig.json",
  "tsconfig.build.json",
  "vitest.config.ts",
]);
const FULL_PREFIXES = Object.freeze([
  "bin/pi-tui.",
  "test/support/rendering/",
  "test/fixtures/rendering/",
  "test/integrations/pi/tui-runtime/rendering-",
]);
const FULL_PRODUCTION = Object.freeze([
  /^src\/integrations\/pi\/tui-runtime\//u,
  /^src\/integrations\/pi\/session-ui\/(?:session-viewport-controller|stream-presentation-coalescer)\.ts$/u,
  /^src\/ui\/components\/(?:text-selection|transcript-viewport)\.ts$/u,
]);
const RENDERING_SURFACE_PREFIXES = Object.freeze([
  "src/integrations/pi/components/",
  "src/integrations/pi/session-ui/",
  "src/integrations/pi/tui-runtime/",
  "src/ui/components/",
]);
const MAX_CHANGES = 4096;
const MAX_REASONS = 256;
const MAX_PATH = 1024;

export function parseNameStatusZ(value) {
  const fields = Buffer.isBuffer(value) ? value.toString("utf8").split("\0") : String(value).split("\0");
  if (fields.at(-1) === "") fields.pop();
  const changes = [];
  for (let index = 0; index < fields.length;) {
    const statusField = fields[index++];
    if (!/^[A-Z][0-9]*$/u.test(statusField ?? "")) throw new Error(`invalid git name-status token: ${statusField ?? "<missing>"}`);
    const status = statusField[0];
    const first = normalizeSelectionPath(fields[index++]);
    if (status === "R" || status === "C") {
      const second = normalizeSelectionPath(fields[index++]);
      changes.push({ status, score: Number(statusField.slice(1) || 0), oldPath: first, path: second });
    } else changes.push({ status, path: first });
  }
  return changes;
}

export async function collectCommitChanges(repository, base, head) {
  const { stdout } = await git(repository, ["diff", "--name-status", "-z", "--find-renames", "--find-copies-harder", base, head], "buffer");
  return parseNameStatusZ(stdout);
}

export async function collectWorktreeChanges(repository) {
  const [staged, unstaged, untracked] = await Promise.all([
    git(repository, ["diff", "--cached", "--name-status", "-z", "--find-renames", "HEAD"], "buffer"),
    git(repository, ["diff", "--name-status", "-z", "--find-renames"], "buffer"),
    git(repository, ["ls-files", "--others", "--exclude-standard", "-z"], "buffer"),
  ]);
  const combined = [
    ...parseNameStatusZ(staged.stdout),
    ...parseNameStatusZ(unstaged.stdout),
    ...untracked.stdout.toString("utf8").split("\0").filter(Boolean).map(path => ({ status: "A", path: normalizeSelectionPath(path) })),
  ];
  const byDestination = new Map();
  for (const change of combined) byDestination.set(`${change.status}:${change.oldPath ?? ""}:${change.path}`, change);
  return [...byDestination.values()];
}

export async function selectValidationImpact(options = {}) {
  const startedAt = Date.now();
  const repository = resolve(options.repository ?? process.cwd());
  const head = await resolveCommit(repository, options.head ?? "HEAD");
  const base = await resolveSelectionBase(repository, options.base, head);
  let changes = await collectCommitChanges(repository, base, head);
  if (options.includeWorktree === true) changes = mergeChanges(changes, await collectWorktreeChanges(repository));
  if (changes.length > MAX_CHANGES) throw new Error(`validation selection exceeds ${MAX_CHANGES} changed entries`);

  const docsOnly = changes.length > 0 && changes.every(change => isDocumentationOnlyPath(change.path) && (change.oldPath === undefined || isDocumentationOnlyPath(change.oldPath)));
  const openspecTouched = changes.some(change => change.path.startsWith("openspec/") || change.oldPath?.startsWith("openspec/"));
  const versionOnly = await isVersionOnlyChange(repository, base, head, changes, options.includeWorktree === true);
  const documentationPaths = [...new Set(changes
    .filter(change => change.status !== "D")
    .map(change => change.path)
    .filter(isDocumentationPolicyPath))].sort();
  const rendering = docsOnly || versionOnly
    ? { tier: "none", reasons: [], fallbacks: [], changedPaths: [] }
    : await classifyRenderingImpact(repository, base, head, changes);
  const selection = {
    schema: "a1-validation-impact-v1",
    base,
    head,
    changes,
    docsOnly,
    versionOnly,
    openspecTouched,
    ordinaryScopes: docsOnly || versionOnly ? [] : ["typecheck", "architecture", "fast", "dist-integration"],
    rendering,
    documentation: { required: documentationPaths.length > 0, paths: documentationPaths },
    timing: { classifierMs: Math.max(0, Date.now() - startedAt) },
  };
  assertValidationImpact(selection);
  return selection;
}

export function assertValidationImpact(value) {
  if (typeof value !== "object" || value === null || value.schema !== "a1-validation-impact-v1") throw new TypeError("unsupported validation impact schema");
  if (!isCommit(value.base) || !isCommit(value.head)) throw new TypeError("validation impact requires full base and head commits");
  if (!Array.isArray(value.changes) || value.changes.length > MAX_CHANGES) throw new TypeError("validation impact changes are invalid or unbounded");
  for (const change of value.changes) {
    if (!/^[A-Z]$/u.test(change?.status ?? "") || !isBoundedPath(change.path) || (change.oldPath !== undefined && !isBoundedPath(change.oldPath))) {
      throw new TypeError("validation impact contains an invalid changed path");
    }
  }
  if (!["none", "smoke", "full"].includes(value.rendering?.tier)) throw new TypeError("validation impact rendering tier is invalid");
  for (const key of ["reasons", "fallbacks", "changedPaths"]) {
    if (!Array.isArray(value.rendering[key]) || value.rendering[key].length > MAX_REASONS) throw new TypeError(`validation impact rendering ${key} is invalid or unbounded`);
  }
  if (!Array.isArray(value.documentation?.paths) || value.documentation.paths.length > MAX_CHANGES || value.documentation.paths.some(path => !isBoundedPath(path))) {
    throw new TypeError("validation impact documentation paths are invalid or unbounded");
  }
  if (value.documentation.required !== (value.documentation.paths.length > 0)) throw new TypeError("validation impact documentation requirement disagrees with paths");
  if (!Array.isArray(value.ordinaryScopes) || value.ordinaryScopes.some(scope => typeof scope !== "string")) throw new TypeError("validation impact ordinary scopes are invalid");
  if (!Number.isSafeInteger(value.timing?.classifierMs) || value.timing.classifierMs < 0) throw new TypeError("validation impact timing is invalid");
  return value;
}

export async function classifyRenderingImpact(repository, base, head, changes) {
  const changedPaths = [...new Set(changes.flatMap(change => [change.path, ...(change.oldPath ? [change.oldPath] : [])]))].sort();
  const exactFull = changedPaths.filter(isFullRenderingPath);
  if (exactFull.length > 0) return {
    tier: "full",
    reasons: exactFull.slice(0, MAX_REASONS).map(path => `full-critical:${path}`),
    fallbacks: [],
    changedPaths,
  };
  const unsupported = changedPaths.filter(path => RENDERING_SURFACE_PREFIXES.some(prefix => path.startsWith(prefix)) && !SOURCE_EXTENSIONS.includes(extname(path)));
  if (unsupported.length > 0) return {
    tier: "full",
    reasons: unsupported.slice(0, MAX_REASONS).map(path => `unsupported-rendering-input:${path}`),
    fallbacks: ["unsupported-rendering-input"],
    changedPaths,
  };

  try {
    const [baseGraph, headGraph] = await Promise.all([
      renderingReachability(repository, base),
      renderingReachability(repository, head),
    ]);
    const unresolved = [...new Set([...baseGraph.unresolved, ...headGraph.unresolved])];
    if (unresolved.length > 0) return {
      tier: "full",
      reasons: unresolved.slice(0, MAX_REASONS).map(value => `unresolved:${value}`),
      fallbacks: ["dependency-resolution-incomplete"],
      changedPaths,
    };
    const reasons = [];
    for (const path of changedPaths) {
      const chain = headGraph.chains.get(path) ?? baseGraph.chains.get(path);
      if (chain) reasons.push(`reachable:${chain.join(" -> ")}`);
    }
    return { tier: reasons.length > 0 ? "smoke" : "none", reasons: reasons.slice(0, MAX_REASONS), fallbacks: [], changedPaths };
  } catch (error) {
    return {
      tier: "full",
      reasons: [`classifier-error:${error instanceof Error ? error.message : String(error)}`],
      fallbacks: ["dependency-classifier-failed"],
      changedPaths,
    };
  }
}

async function renderingReachability(repository, revision) {
  const { stdout } = await git(repository, ["ls-tree", "-r", "--name-only", "-z", revision], "buffer");
  const paths = new Set(stdout.toString("utf8").split("\0").filter(Boolean).map(normalizeSelectionPath));
  const chains = new Map();
  const unresolved = [];
  const queue = RENDERING_ENTRIES.map(path => ({ path, chain: [path] }));
  for (const entry of RENDERING_ENTRIES) if (!paths.has(entry)) unresolved.push(`${entry}@${revision}`);
  while (queue.length > 0) {
    const current = queue.shift();
    if (chains.has(current.path) || !paths.has(current.path)) continue;
    chains.set(current.path, current.chain);
    if (!isScriptPath(current.path)) continue;
    const source = (await git(repository, ["show", `${revision}:${current.path}`], "utf8")).stdout;
    const imports = ts.preProcessFile(source, true, true).importedFiles.map(record => record.fileName);
    for (const specifier of imports) {
      if (!specifier.startsWith(".")) continue;
      const target = resolveRepositoryImport(current.path, specifier, paths);
      if (!target) unresolved.push(`${current.path}:${specifier}@${revision}`);
      else if (!chains.has(target)) queue.push({ path: target, chain: [...current.chain, target] });
    }
  }
  return { chains, unresolved };
}

function resolveRepositoryImport(containingPath, specifier, paths) {
  const base = posix.normalize(posix.join(dirname(containingPath).replaceAll("\\", "/"), specifier));
  const extension = extname(base);
  const withoutRuntimeExtension = [".js", ".mjs", ".cjs"].includes(extension) ? base.slice(0, -extension.length) : base;
  const candidates = [];
  if (SOURCE_EXTENSIONS.includes(extension)) candidates.push(base);
  for (const candidateExtension of SOURCE_EXTENSIONS) candidates.push(`${withoutRuntimeExtension}${candidateExtension}`);
  for (const candidateExtension of SOURCE_EXTENSIONS) candidates.push(`${base}/index${candidateExtension}`);
  return candidates.find(candidate => paths.has(candidate));
}

function mergeChanges(committed, worktree) {
  const values = new Map();
  for (const change of [...committed, ...worktree]) values.set(`${change.status}:${change.oldPath ?? ""}:${change.path}`, change);
  return [...values.values()];
}

async function resolveSelectionBase(repository, requested, head) {
  if (requested && await isCommitishAvailable(repository, requested)) return await mergeBase(repository, requested, head);
  if (await isCommitishAvailable(repository, "origin/develop")) return await mergeBase(repository, "origin/develop", head);
  try {
    const { stdout } = await git(repository, ["rev-parse", `${head}^`], "utf8");
    return stdout.trim();
  } catch {
    return head;
  }
}

async function mergeBase(repository, left, right) {
  const { stdout } = await git(repository, ["merge-base", left, right], "utf8");
  return stdout.trim();
}

async function resolveCommit(repository, value) {
  const { stdout } = await git(repository, ["rev-parse", `${value}^{commit}`], "utf8");
  const commit = stdout.trim();
  if (!isCommit(commit)) throw new Error(`not a full commit: ${value}`);
  return commit;
}

async function isCommitishAvailable(repository, value) {
  try { await git(repository, ["cat-file", "-e", `${value}^{commit}`], "utf8"); return true; } catch { return false; }
}

async function isVersionOnlyChange(repository, base, head, changes, includeWorktree) {
  if (includeWorktree || changes.length === 0 || changes.some(change => !["package.json", "package-lock.json"].includes(change.path))) return false;
  const { stdout } = await git(repository, ["diff", "--unified=0", base, head, "--", "package.json", "package-lock.json"], "utf8");
  const changedLines = stdout.split(/\r?\n/u)
    .filter(line => /^[+-]/u.test(line) && !/^(?:\+\+\+|---)/u.test(line));
  return changedLines.length > 0 && changedLines.every(line => /^[+-]\s*"version":\s*"[^"]+",?\s*$/u.test(line));
}

function isDocumentationOnlyPath(path) {
  return path.startsWith("openspec/") || path.startsWith("docs/") || path.endsWith(".md") || path === "LICENSE" || path === ".gitignore";
}

export function isDocumentationPolicyPath(path) {
  const role = classifyCodeDocumentationSource(path);
  return role === "first-party-production" || role === "first-party-tooling" || role === "first-party-native" || role === "synchronized";
}

function isFullRenderingPath(path) {
  return FULL_EXACT.has(path) || FULL_PREFIXES.some(prefix => path.startsWith(prefix)) || FULL_PRODUCTION.some(pattern => pattern.test(path));
}

function isScriptPath(path) {
  return [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"].includes(extname(path));
}

function normalizeSelectionPath(path) {
  if (typeof path !== "string" || path.length === 0) throw new Error("git change is missing a path");
  const normalized = normalizeCodeDocumentationPath(path);
  if (!isBoundedPath(normalized) || normalized.startsWith("../") || normalized.includes("/../")) throw new Error(`invalid repository path: ${path}`);
  return normalized;
}

function isBoundedPath(path) {
  return typeof path === "string"
    && path.length > 0
    && path.length <= MAX_PATH
    && !path.includes("\0")
    && !path.startsWith("/")
    && !path.startsWith("../")
    && !path.includes("/../");
}

function isCommit(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/u.test(value);
}

function git(repository, arguments_, encoding) {
  return execFileAsync("git", arguments_, { cwd: repository, encoding, maxBuffer: 64 * 1024 * 1024 });
}
