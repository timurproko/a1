import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir, lstat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { inspectNamingSource, inspectScriptNames } from "./naming-inspection.mjs";
import { NAMING_POLICY_PATH, isNamingInput, namingSourceRole, selectNamingImpact, validateNamingPolicy } from "./naming-source-policy.mjs";

const execute = promisify(execFile);
const DEFAULT_POLICY = validateNamingPolicy(JSON.parse(readFileSync(new URL("../../config/internal-naming-policy.json", import.meta.url), "utf8")));

/** Public fixture seam for the same inspector used by the PR gate. */
export function inspectTypeScript(path, source, policy = DEFAULT_POLICY) {
  return inspectScriptNames(path, source, validateNamingPolicy(policy));
}

/** Audit tracked owned source; an explicit path list restricts diagnostics, never policy validation. */
export async function inspectProductIdentifiers(repository, options = {}) {
  const root = resolve(repository);
  const revision = options.revision;
  const tracked = await sourceTree(root, revision);
  const paths = options.paths ?? [...tracked.keys()];
  const read = async path => {
    if (!tracked.has(path)) throw new Error(`selected naming input is not tracked at the requested revision: ${path}`);
    if (revision) {
      if (!["100644", "100755"].includes(tracked.get(path))) throw new Error(`naming input is not a regular tracked file: ${path}`);
      return await git(root, ["show", `${revision}:${path}`]);
    }
    const metadata = await lstat(resolve(root, path));
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`naming input is not a regular file: ${path}`);
    return await readFile(resolve(root, path), "utf8");
  };
  const policy = validateNamingPolicy(JSON.parse(await read(NAMING_POLICY_PATH)));
  for (const entry of policy.environment) for (const field of ["owner", "evidence"]) {
    if (!tracked.has(entry[field])) throw new Error(`environment ${entry.role} has missing ${field}: ${entry[field]}`);
  }
  for (const entry of policy.environment.filter(entry => entry.exposure === "public")) {
    if (!(await read(entry.evidence)).includes(entry.key)) throw new Error(`public setting ${entry.key} is absent from its declared documentation evidence`);
  }
  for (const entry of policy.externalMembers) if (!tracked.has(entry.path)) throw new Error(`external member exception names an untracked boundary: ${entry.path}`);
  const internalIdentifiers = [], externalIdentityIdentifiers = [], inspectedPaths = [], exclusions = [];
  for (const path of [...new Set(paths)].sort()) {
    validPath(path);
    if (!isNamingInput(path)) { exclusions.push({ path, reason: namingSourceRole(path) }); continue; }
    const source = await read(path);
    if (path === NAMING_POLICY_PATH) { inspectedPaths.push(path); continue; }
    const result = inspectNamingSource(path, source, policy);
    internalIdentifiers.push(...result.internal);
    externalIdentityIdentifiers.push(...result.external);
    inspectedPaths.push(path);
  }
  return { schema: "product-semantic-identifier-inventory-v2", internalIdentifiers, externalIdentityIdentifiers, inspectedPaths, exclusions };
}

/** Bind changed-mode inspection to a complete authoritative Git diff and an exact selected head. */
export async function runNamingValidation(options = {}) {
  const started = Date.now();
  const repository = resolve(options.repository ?? process.cwd());
  const head = (await git(repository, ["rev-parse", "HEAD^{commit}"])).trim();
  let base = null;
  let selection = { required: true, mode: "full", paths: [], reasons: ["explicit-full-audit"], exclusions: [] };
  if (options.selection) {
    const impact = options.selection;
    if (!/^[a-f0-9]{40}$/.test(impact.base ?? "") || impact.head !== head) throw new Error("naming selection has an invalid base or stale head");
    base = (await git(repository, ["merge-base", impact.base, head])).trim();
    if (base !== impact.base) throw new Error("naming selection base is not the merge base");
    const { collectCommitChanges } = await import("../release/validation-impact.mjs");
    const changes = await collectCommitChanges(repository, base, head);
    selection = selectNamingImpact(changes);
    if (JSON.stringify(changes) !== JSON.stringify(impact.changes) || JSON.stringify(selection) !== JSON.stringify(impact.naming)) throw new Error("naming selection differs from the complete current change");
  }
  const inventory = selection.mode === "none"
    ? { internalIdentifiers: [], externalIdentityIdentifiers: [], inspectedPaths: [], exclusions: [] }
    : await inspectProductIdentifiers(repository, {
      ...(options.selection ? { revision: head } : {}),
      ...(selection.mode === "changed" ? { paths: selection.paths } : {}),
    });
  return {
    base, head, mode: selection.mode,
    required: selection.required, selectedPaths: selection.paths, reasons: selection.reasons,
    ...inventory, schema: "internal-naming-result-v1",
    exclusions: [...selection.exclusions, ...inventory.exclusions],
    passed: inventory.internalIdentifiers.length === 0, durationMs: Date.now() - started,
  };
}

async function sourceTree(repository, revision) {
  if (revision) {
    const values = (await git(repository, ["ls-tree", "-r", "-z", revision])).split("\0").filter(Boolean);
    return new Map(values.map(value => {
      const tab = value.indexOf("\t");
      const path = value.slice(tab + 1); validPath(path);
      return [path, value.slice(0, 6)];
    }));
  }
  const paths = (await git(repository, ["ls-files", "-z"])).split("\0").filter(Boolean);
  return new Map(paths.map(path => { validPath(path); return [path, "worktree"]; }));
}

function validPath(path) {
  if (!path || path.includes("\0") || path.includes("\\") || path.startsWith("/") || path.split("/").some(part => part === ".." || part === ".") || /^[A-Za-z]:/.test(path)) throw new Error(`invalid naming input path: ${path}`);
}

async function git(repository, arguments_) {
  return (await execute("git", arguments_, { cwd: repository, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })).stdout;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = name => {
    const index = process.argv.indexOf(name);
    if (index < 0) return undefined;
    if (!process.argv[index + 1] || process.argv[index + 1].startsWith("--")) throw new Error(`missing value for ${name}`);
    return process.argv[index + 1];
  };
  const repository = resolve(option("--root") ?? process.cwd());
  const selectionPath = option("--selection");
  const resultPath = option("--result");
  try {
    const result = await runNamingValidation({ repository, ...(selectionPath ? { selection: JSON.parse(await readFile(resolve(repository, selectionPath), "utf8")) } : {}) });
    if (resultPath) {
      const output = resolve(repository, resultPath);
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
    }
    if (process.argv.includes("--check")) {
      for (const finding of result.internalIdentifiers) console.error(`${finding.rule} ${finding.path}:${finding.line}: ${finding.identifier}: ${finding.message}`);
      console.log(`Naming ${result.mode} audit: ${result.inspectedPaths.length} files; ${result.internalIdentifiers.length} violations; head ${result.head}`);
      process.exitCode = result.passed ? 0 : 1;
    } else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    console.error(`Naming validation failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
