import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { deliveryPlanningDirectory } from "./delivery-workspace.mjs";

// Provenance: approved snapshot b2e47d1c; changing a payload and its local manifest is not approval.
export const APPROVED_DELIVERY_HASHES = Object.freeze({
  "delivery-rules.md": "2e3caedb76ba2da7d1172c2dde0faed9d333a7d6bfa79634734df17ecd3b4d59",
  "delivery-adapters.json": "8a8b0c4e395003457ce0f2f7d0eae78a9cde227d4db6f4fc550f764e609fd741",
  "delivery-cases.json": "e35a6024a97fe355f7eb9d6efbc8502fd67f2191949b08f6338f07d283d61f4c",
  "delivery-contract.json": "9e1d879d0456d3d10e4f0c54530e08d642f0662cea6de58832f4ae9888c1564a",
});
export const DELIVERY_ROUTE = "Read and follow [Shared delivery rules](docs/delivery-rules.md). Use only this repository's entry in [Delivery adapters](docs/delivery-adapters.json). Do not paraphrase these rules, invent exceptions, or modify OpenSpec skills/framework; report conflicts before proceeding.";

export async function inspectContractInstallation(root, { read = path => readFile(resolve(root, path)) } = {}) {
  const errors = [];
  const bytes = {};
  for (const [name, hash] of Object.entries(APPROVED_DELIVERY_HASHES)) {
    try {
      const content = Buffer.from(await read(`docs/${name}`));
      bytes[name] = content;
      if (createHash("sha256").update(content).digest("hex") !== hash) errors.push(`contract-bytes:${name}`);
    } catch { errors.push(`contract-missing:${name}`); }
  }
  const planning = await deliveryPlanningDirectory(root).catch(() => null);
  for (const [name, hash] of Object.entries(APPROVED_DELIVERY_HASHES)) {
    try {
      if (!planning || createHash("sha256").update(await read(`${planning}/${name}`)).digest("hex") !== hash) errors.push(`planning-bytes:${name}`);
    } catch { errors.push(`planning-missing:${name}`); }
  }
  let agents = "";
  try { agents = String(await read("AGENTS.md")); } catch { errors.push("routing-missing"); }
  if (agents.split(DELIVERY_ROUTE).length - 1 !== 1) errors.push("routing-count");
  const routes = [".agents/skills/change-delivery/SKILL.md", "openspec/config.yaml", "docs/openspec-archive-automation.md", "docs/architecture/project-structure.md", "docs/local-worktree-cleanup.md"];
  try { if (String(await read("CLAUDE.md")).trim() !== "@AGENTS.md") errors.push("instruction-entry-route"); } catch { errors.push("instruction-entry-missing"); }
  for (const path of routes) {
    try {
      const source = String(await read(path));
      if (!source.includes("delivery-rules.md") || /before starting the next|one task group per item/.test(source)) errors.push(`owner-route:${path}`);
    } catch { errors.push(`owner-route-missing:${path}`); }
  }
  const adapters = bytes["delivery-adapters.json"];
  // Security: never use modified policy even when it remains syntactically valid JSON.
  if (!errors.some(error => error.includes("delivery-adapters.json")) && adapters) {
    const binding = JSON.parse(adapters).repositories.a1;
    if (binding.repository !== "timurproko/a1" || binding.baseBranch !== "develop") errors.push("adapter-identity");
  }
  return { passed: errors.length === 0, errors };
}

/** Read only this repository's frozen binding; an edited local digest cannot authorize adapter drift. */
export async function readDeliveryAdapter() {
  const bytes = await readFile(new URL("../../docs/delivery-adapters.json", import.meta.url));
  if (createHash("sha256").update(bytes).digest("hex") !== APPROVED_DELIVERY_HASHES["delivery-adapters.json"]) throw new Error("delivery-adapter-drift");
  return JSON.parse(bytes).repositories.a1;
}

/** Both sides of every rename are authority-bearing; additions and deletions also enter this boundary. */
export function inspectDeliveryScope(changes, { overridesOpenSpec = false } = {}) {
  const protectedPaths = changes.flatMap(change => [change.path, change.previousPath].filter(Boolean))
    .filter(path => /(?:^|\/)(?:skills\/openspec-[^/]+(?:\/|$)|(?:commands?|prompts)\/(?:opsx|openspec)(?:\/|[-.]|$)|node_modules\/@fission-ai\/openspec(?:\/|$)|\.?openspec\/(?:schemas|templates|framework)(?:\/|$))/u.test(path.replaceAll("\\", "/")));
  const indirectOverrides = changes.filter(change => (/\.md$/i.test(change.path) || change.path === "openspec/config.yaml") && typeof change.after === "string"
    && change.after.split(/[\n.!?]/).some(line => {
      const match = /\b(?:ignore|override|bypass|skip|replace|disregard)\b[^\n]*\b(?:OpenSpec|opsx|openspec-[a-z-]+)\b/i.exec(line);
      const frameworkReplacement = !/^replace\b/i.test(match?.[0] ?? "") || /\b(?:skills?|commands?|framework|schemas?|templates?|lifecycle|opsx)\b/i.test(line)
        || /\breplace\s+(?:the\s+)?(?:unchanged\s+)?OpenSpec\s*(?:$|with\b)/i.test(line);
      return match && frameworkReplacement && !/\b(?:do not|does not|must not|shall not|never|not authorized)\b/i.test(line.slice(0, match.index));
    })).map(change => change.path);
  const frameworkPins = changes.filter(change => /(?:^|\/)(?:package\.json|package-lock\.json)$/.test(change.path)
    && (typeof change.before === "string" || typeof change.after === "string") && frameworkPinSnapshot(change.before ?? "{}") !== frameworkPinSnapshot(change.after ?? "{}")).map(change => change.path);
  protectedPaths.push(...indirectOverrides, ...frameworkPins);
  return { blocked: protectedPaths.length > 0 || overridesOpenSpec, protectedPaths,
    requiresSeparateScope: protectedPaths.length > 0 || overridesOpenSpec };
}

function frameworkPinSnapshot(text) {
  const pins = [];
  const canonical = value => value && typeof value === "object" ? Array.isArray(value) ? value.map(canonical)
    : Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
  const walk = (value, path = "") => {
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) {
      if (key === "@fission-ai/openspec" || key === "node_modules/@fission-ai/openspec") pins.push([`${path}/${key}`, canonical(item)]);
      else walk(item, `${path}/${key}`);
    }
  };
  try { walk(JSON.parse(text)); return JSON.stringify(pins.sort()); }
  catch { return `unverifiable:${text}`; }
}

/** Inventory only, not behavioral proof: the executable verifier additionally requires its private invocation receipts and every expected field. */
export function inspectCaseBindings(cases, observations) {
  const required = Array.from({ length: 50 }, (_, index) => `C${String(index + 1).padStart(2, "0")}`);
  const ids = cases.map(item => item.id);
  const missing = required.filter(id => !ids.includes(id) || !observations.has(id));
  const invalid = ids.filter((id, index) => !required.includes(id) || ids.indexOf(id) !== index);
  for (const [id, observation] of observations) {
    if (!required.includes(id) || observation.skipped || observation.invokedBoundary !== true) invalid.push(id);
  }
  return { passed: missing.length === 0 && invalid.length === 0 && observations.size === 50, missing, invalid };
}
