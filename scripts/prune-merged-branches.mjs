import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PROTECTED_BRANCHES = ["develop", "master"];

function git(cwd, arguments_, options = {}) {
  try {
    return execFileSync("git", arguments_, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    if (options.allowFailure && typeof error?.status === "number") return { status: error.status, stdout: String(error.stdout ?? "").trim(), stderr: String(error.stderr ?? "").trim() };
    const detail = String(error?.stderr ?? error?.message ?? error).trim();
    throw new Error(`git ${arguments_.join(" ")} failed${detail ? `: ${detail}` : ""}`);
  }
}

function validateBranchName(cwd, name) {
  const result = git(cwd, ["check-ref-format", "--branch", name], { allowFailure: true });
  if (typeof result !== "string" && result.status !== 0) throw new Error(`invalid branch name: ${name}`);
}

export function parseBranchCleanupArguments(arguments_) {
  const options = { apply: false, base: "develop", branches: [], json: false, protectedBranches: [], remote: null };
  for (let index = 0; index < arguments_.length; index++) {
    const argument = arguments_[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--json") options.json = true;
    else if (["--base", "--branch", "--protect", "--remote"].includes(argument)) {
      const value = arguments_[++index];
      if (!value) throw new Error(`${argument} requires a value`);
      if (argument === "--base") options.base = value;
      else if (argument === "--branch") options.branches.push(value);
      else if (argument === "--protect") options.protectedBranches.push(value);
      else options.remote = value;
    } else throw new Error(`unknown argument: ${argument}`);
  }
  if (options.remote !== null && (!options.apply || options.branches.length !== 1)) {
    throw new Error("--remote requires --apply and exactly one --branch");
  }
  return options;
}

export function classifyLocalBranches(cwd, options = {}) {
  const base = options.base ?? "develop";
  const extraProtected = options.protectedBranches ?? [];
  validateBranchName(cwd, base);
  for (const name of extraProtected) validateBranchName(cwd, name);
  const baseCheck = git(cwd, ["show-ref", "--verify", "--quiet", `refs/heads/${base}`], { allowFailure: true });
  if (typeof baseCheck !== "string" && baseCheck.status !== 0) throw new Error(`integration branch does not exist: ${base}`);

  const current = git(cwd, ["branch", "--show-current"]);
  const branchOutput = git(cwd, ["for-each-ref", "--format=%(refname:short)", "refs/heads"]);
  const branches = branchOutput ? branchOutput.split(/\r?\n/).filter(Boolean).sort() : [];
  const protectedNames = new Set([...DEFAULT_PROTECTED_BRANCHES, base, current, ...extraProtected]);
  const result = { base, current, protected: [], mergedDeletable: [], unmerged: [] };

  for (const name of branches) {
    if (protectedNames.has(name)) {
      const reasons = [];
      if (DEFAULT_PROTECTED_BRANCHES.includes(name) || name === base || extraProtected.includes(name)) reasons.push("protected");
      if (name === current) reasons.push("current");
      result.protected.push({ name, reasons });
      continue;
    }
    const ancestry = git(cwd, ["merge-base", "--is-ancestor", name, base], { allowFailure: true });
    if (typeof ancestry === "string" || ancestry.status === 0) result.mergedDeletable.push(name);
    else if (ancestry.status === 1) result.unmerged.push(name);
    else throw new Error(`could not compare ${name} with ${base}: ${ancestry.stderr}`);
  }
  return result;
}

function deleteRemoteBranch(cwd, remote, branch, base) {
  const remotes = git(cwd, ["remote"]).split(/\r?\n/).filter(Boolean);
  if (!remotes.includes(remote)) throw new Error(`unknown remote: ${remote}`);
  const listing = git(cwd, ["ls-remote", "--exit-code", "--heads", remote, `refs/heads/${branch}`], { allowFailure: true });
  if (typeof listing !== "string") {
    if (listing.status === 2) return false;
    throw new Error(`could not inspect ${remote}/${branch}: ${listing.stderr}`);
  }
  const commit = listing.split(/\s+/)[0];
  const ancestry = git(cwd, ["merge-base", "--is-ancestor", commit, base], { allowFailure: true });
  if (typeof ancestry !== "string" && ancestry.status !== 0) throw new Error(`remote branch ${remote}/${branch} is not merged into ${base}`);
  git(cwd, ["push", remote, "--delete", branch]);
  return true;
}

export function runBranchCleanup({ cwd = process.cwd(), ...options }) {
  const root = resolve(cwd);
  const classification = classifyLocalBranches(root, options);
  const requested = options.branches ?? [];
  for (const name of requested) validateBranchName(root, name);
  const candidates = requested.length ? requested : classification.mergedDeletable;
  const eligible = new Set(classification.mergedDeletable);
  for (const name of candidates) {
    if (!eligible.has(name)) throw new Error(`refused to delete ${name}: branch is protected, current, missing, or unmerged`);
  }

  const deletedLocal = [];
  let deletedRemote = null;
  if (options.apply) {
    for (const name of candidates) {
      git(root, ["branch", "-d", "--", name]);
      deletedLocal.push(name);
    }
    if (options.remote) deletedRemote = deleteRemoteBranch(root, options.remote, candidates[0], classification.base) ? `${options.remote}/${candidates[0]}` : null;
  }
  return { ...classification, mode: options.apply ? "apply" : "dry-run", selected: candidates, deletedLocal, deletedRemote };
}

function format(result) {
  const lines = [`Branch cleanup (${result.mode}) against ${result.base}`, `Current: ${result.current || "<detached>"}`];
  const section = (label, values) => {
    lines.push(`${label}:`);
    if (!values.length) lines.push("  (none)");
    else for (const value of values) lines.push(`  - ${typeof value === "string" ? value : `${value.name} [${value.reasons.join(", ")}]`}`);
  };
  section("Protected", result.protected);
  section("Merged and deletable", result.mergedDeletable);
  section("Unmerged", result.unmerged);
  if (result.mode === "apply") {
    section("Deleted locally", result.deletedLocal);
    if (result.deletedRemote) lines.push(`Deleted remotely:\n  - ${result.deletedRemote}`);
  } else lines.push("No branches changed. Re-run with --apply after reviewing this list.");
  return lines.join("\n");
}

async function main() {
  const options = parseBranchCleanupArguments(process.argv.slice(2));
  const result = runBranchCleanup(options);
  console.log(options.json ? JSON.stringify(result, null, 2) : format(result));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
