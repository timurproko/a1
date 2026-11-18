import { lstatSync } from "node:fs";
import { readFile, lstat, readdir } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";

/** Implementation scratch is disposable, never the sole location of required source/evidence. */
export function selectDeliveryScratch(checkout, name, { durable = false } = {}) {
  if (durable) throw new Error("durable-evidence-not-scratch");
  const root = resolve(checkout, ".artifacts"), path = resolve(root, "agent", name);
  const suffix = relative(root, path);
  if (!name || isAbsolute(name) || suffix.startsWith("..") || isAbsolute(suffix) || path === root) throw new Error("delivery-scratch-boundary");
  let current = root;
  for (const part of ["", ...relative(root, path).split(/[\\/]/)]) {
    current = resolve(current, part);
    try { if (lstatSync(current).isSymbolicLink()) throw new Error("delivery-scratch-link"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return path;
}

export async function deliveryPlanningDirectory(root) {
  const active = "openspec/changes/simplify-change-delivery";
  const stat = await lstat(resolve(root, active)).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (stat?.isDirectory() && !stat.isSymbolicLink()) return active;
  const archive = "openspec/changes/archive";
  const matches = (await readdir(resolve(root, archive), { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}-simplify-change-delivery$/.test(entry.name));
  if (matches.length !== 1) throw new Error("delivery-planning-snapshot-ambiguous");
  return `${archive}/${matches[0].name}`;
}

/** R20 is a recorded review, not a reset/migration operation or inferred historical completion. */
export async function inspectDeliveryReconciliation(root, directory, { required = true } = {}) {
  if (!required) return { required: false, complete: true };
  const path = resolve(root, directory, "contract-reconciliation.md"), suffix = relative(resolve(root), path);
  if (suffix.startsWith("..") || isAbsolute(suffix)) throw new Error("reconciliation-path");
  try {
    const text = await readFile(path, "utf8");
    const complete = /\b[a-f0-9]{40}\b/.test(text) && /R20/.test(text) && /C\d{2}/.test(text) && /preserv/i.test(text);
    return { required: true, complete, ...(complete ? {} : { reason: "reconciliation-incomplete" }) };
  } catch (error) { if (error.code === "ENOENT") return { required: true, complete: false, reason: "reconciliation-required" }; throw error; }
}
