import { extname } from "node:path";

export const NAMING_POLICY_PATH = "config/internal-naming-policy.json";
export const SCRIPT_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const GENERATED = new Set(["bin/pi-tui.js", "bin/pi-tui.d.ts", "src/integrations/pi/components/resources/builtin-themes.ts", "package-lock.json", "config/product-identity-legacy-allowlist.json", "config/product-identity-legacy-inventory.json"]);
const INVALIDATORS = new Set([NAMING_POLICY_PATH, "package.json", "package-lock.json", "src/product-identity.json", "src/product-identity.ts", "config/validation-suites.json", "scripts/release/validation-impact.mjs", "scripts/release/select-validation-impact.mjs", "scripts/release/require-development-validation.mjs", "scripts/governance/project-structure-policy.mjs", "scripts/governance/code-documentation-policy.mjs", ".github/workflows/ci.yml", ".github/workflows/release.yml", ".github/workflows/full-regression.yml", "docs/architecture/toolchain.md", "docs/architecture/internal-naming.md"]);

/** Classify tracked paths independently of file contents, including unsupported owned inputs. */
export function namingSourceRole(path) {
  if (path.split("/").some(segment => ["node_modules", "dist", "target", ".worktrees", ".artifacts", ".builds", ".zig-cache", "zig-out"].includes(segment))) return "generated";
  if (path.startsWith("native/terminal-host/vendor/")) return "vendor";
  if (GENERATED.has(path) || path.startsWith("config/baselines/")) return "generated";
  if (path.startsWith("openspec/") || path.startsWith("docs/") || /[.](md|txt|lock|toml|svg|png|jpg|snap|jsonl)$/.test(path) || ["LICENSE", ".gitignore"].includes(path)) return "data";
  const extension = extname(path);
  if (SCRIPT_EXTENSIONS.has(extension)) return "script";
  if (extension === ".rs") return "rust";
  if (extension === ".py") return "python";
  if ([".json", ".yaml", ".yml"].includes(extension)) return "configuration";
  if (extension === ".sh" || (path.startsWith("scripts/") && extension === "")) return "shell";
  if (/^(src|bin|scripts|test|native)[/]/.test(path)) return "unsupported";
  return "data";
}

export function isNamingInput(path) {
  return ["script", "rust", "python", "configuration", "shell", "unsupported"].includes(namingSourceRole(path));
}

/** Select whole destination files and full-audit invalidators from complete name-status data. */
export function selectNamingImpact(changes) {
  const allPaths = [...new Set(changes.flatMap(change => [change.path, ...(change.oldPath ? [change.oldPath] : [])]))].sort();
  const reasons = allPaths.filter(path => INVALIDATORS.has(path)
    || path.startsWith("scripts/governance/naming-") || path.startsWith("scripts/governance/product-identifier-policy")
    || path.startsWith("src/foundation/launch-context/") || path.startsWith("test/repository-governance/naming-"));
  const paths = [...new Set(changes.filter(change => change.status !== "D").map(change => change.path).filter(isNamingInput))].sort();
  const exclusions = allPaths.filter(path => !isNamingInput(path)).map(path => ({ path, reason: namingSourceRole(path) }));
  return { required: reasons.length > 0 || paths.length > 0, mode: reasons.length ? "full" : paths.length ? "changed" : "none", paths, reasons, exclusions };
}

/** Reject wildcard and compatibility exceptions before they can weaken the source inspector. */
export function validateNamingPolicy(value) {
  if (value?.schema !== "internal-naming-policy-v1" || !Array.isArray(value.environment) || !Array.isArray(value.externalMembers)) throw new Error("invalid internal naming policy");
  const roles = new Set();
  const keys = new Set();
  for (const entry of value.environment) {
    if (Object.keys(entry).some(key => !["role", "key", "exposure", "owner", "evidence", "semantics"].includes(key))) throw new Error("environment policy contains unsupported fields or aliases");
    if (!["public", "integration", "review", "private", "automation", "test"].includes(entry.exposure)) throw new Error("unsupported environment exposure");
    if (!/^[A-Z][A-Z0-9_]*$/.test(entry.key) || !entry.role || roles.has(entry.role) || keys.has(entry.key)) throw new Error("environment definitions must be exact and unique");
    if (["private", "automation", "test"].includes(entry.exposure) && /a1/i.test(entry.key)) throw new Error("private environment branding is forbidden");
    for (const field of ["owner", "evidence", "semantics"]) if (typeof entry[field] !== "string" || !entry[field].trim() || /[*?]/.test(entry[field])) throw new Error("environment exposure requires exact evidence and ownership");
    roles.add(entry.role); keys.add(entry.key);
  }
  for (const entry of value.externalMembers) {
    if (Object.keys(entry).some(key => !["name", "path", "reason"].includes(key)) || !entry.name || !entry.path || !entry.reason
      || /[*?]/.test(entry.name + entry.path) || /^A1_/i.test(entry.name)) throw new Error("invalid external member exception");
  }
  return value;
}
