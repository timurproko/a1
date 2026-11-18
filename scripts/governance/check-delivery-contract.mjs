#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile, lstat, writeFile, mkdir, realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify, parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { inspectContractInstallation, inspectDeliveryScope } from "./delivery-contract.mjs";
import { deliveryPlanningDirectory, inspectDeliveryReconciliation, selectDeliveryScratch } from "./delivery-workspace.mjs";

/** Inspect the whole topic/workspace diff, including untracked additions and both rename identities; no remote reads or repairs. */
export async function inspectDeliveryChange(root, target = "origin/develop") {
  if (!/^[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(target) || target.includes("..")) throw new Error("delivery-check-target");
  root = await realpath(root);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
  const git = async args => (await promisify(execFile)("git", ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", ...args],
    { cwd: root, env, timeout: 15_000, maxBuffer: 4 * 1024 * 1024, encoding: "utf8" })).stdout;
  const base = (await git(["merge-base", target, "HEAD"])).trim();
  const parts = (await git(["diff", "--no-ext-diff", "--name-status", "--find-renames", "-z", base])).split("\0").filter(Boolean), changes = [];
  for (let index = 0; index < parts.length;) {
    const status = parts[index++];
    if (/^[RC]\d+$/.test(status)) changes.push({ status, previousPath: parts[index++], path: parts[index++] });
    else if (/^[ADMTUXB]$/.test(status)) changes.push({ status, path: parts[index++] });
    else throw new Error("delivery-check-diff");
  }
  for (const path of (await git(["ls-files", "--others", "--exclude-standard", "-z"])).split("\0").filter(Boolean)) changes.push({ status: "A", path });
  for (const change of changes) {
    if (!change.path) throw new Error("delivery-check-path");
    if (!/\.(?:md|ya?ml)$|(?:^|\/)(?:package\.json|package-lock\.json)$/i.test(change.path)) continue;
    if (change.status !== "A") change.before = await git(["show", `${base}:${change.previousPath ?? change.path}`]);
    if (change.status !== "D") {
      const path = resolve(root, change.path), stat = await lstat(path);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2 * 1024 * 1024) throw new Error(`delivery-scope-content-unverifiable:${change.path}`);
      change.after = await readFile(path, "utf8");
    }
  }
  const installation = await inspectContractInstallation(root), scope = inspectDeliveryScope(changes);
  const planning = await deliveryPlanningDirectory(root).catch(() => null);
  const reconciliation = planning ? await inspectDeliveryReconciliation(root, planning) : { required: true, complete: false, reason: "reconciliation-unavailable" };
  return { passed: installation.passed && !scope.blocked && reconciliation.complete, base, changedPaths: changes.flatMap(change => [change.path, ...(change.previousPath ? [change.previousPath] : [])]),
    installation, scope, reconciliation };
}
export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: { root: { type: "string" }, target: { type: "string" }, output: { type: "string" } } });
  const root = resolve(values.root ?? process.cwd()), report = await inspectDeliveryChange(root, values.target);
  if (values.output) {
    const path = selectDeliveryScratch(root, values.output);
    await mkdir(dirname(path), { recursive: true }); await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(report => { console.log(JSON.stringify(report, null, 2)); if (!report.passed) process.exitCode = 1; })
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
