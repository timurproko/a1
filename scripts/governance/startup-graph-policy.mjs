import { readFile } from "node:fs/promises";
import { posix, resolve } from "node:path";

export const STARTUP_ROOTS = Object.freeze([
  "src/foundation/startup/startup-runtime.ts",
  "src/foundation/launch-context/index.ts",
  "src/foundation/terminal-cleanup/fatal-exit.ts",
  "src/foundation/lifecycle/paths.ts",
  "src/features/launch/runtime-selection.ts",
  "src/foundation/lifecycle/session-selection.ts",
  "src/features/owned-ui/project-trust-prompt.ts",
  "src/features/owned-ui/session-fork-prompt.ts",
  "src/features/owned-ui/run.ts",
  "src/composition/owned-ui.ts",
]);

const FIRST_PROMPT_PREFIXES = Object.freeze([
  "src/contracts/agent-engine/",
  "src/features/launch/",
  "src/features/prompt-history/",
  "src/features/prompt-suggestions/",
  "src/foundation/",
  "src/integrations/pi/engine/",
]);

export const PROHIBITED_STARTUP_ENTRIES = new Set([
  "src/cli/index.ts",
  "src/features/launch/index.ts",
  "src/features/owned-ui/index.ts",
  "src/features/prompt-history/index.ts",
  "src/features/prompt-suggestions/index.ts",
  "src/foundation/lifecycle/index.ts",
  "src/foundation/release/index.ts",
  "src/foundation/startup/index.ts",
  "src/foundation/terminal-cleanup/index.ts",
  "src/integrations/pi/components/index.ts",
  "src/integrations/pi/engine/index.ts",
  "src/app/session-shell/index.ts",
  "src/integrations/pi/tui-runtime/index.ts",
  "src/ui/apps/index.ts",
  "src/ui/components/index.ts",
  "src/ui/settings/index.ts",
]);

export async function inspectStartupReachability(root, options = {}) {
  const roots = options.roots ?? STARTUP_ROOTS;
  const files = new Map();
  const queue = roots.map(path => ({ path, chain: [path] }));
  const firstChain = new Map();
  const edges = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (firstChain.has(current.path)) continue;
    firstChain.set(current.path, current.chain);
    const source = await readFile(resolve(root, current.path), "utf8");
    files.set(current.path, Buffer.byteLength(source));
    for (const specifier of runtimeRelativeImports(source)) {
      const target = await resolveSource(root, current.path, specifier);
      if (target === null) continue;
      edges.push({ from: current.path, to: target });
      if (!firstChain.has(target)) queue.push({ path: target, chain: [...current.chain, target] });
    }
  }
  const modules = [...files].map(([path, bytes]) => ({
    path,
    bytes,
    classification: classifyStartupModule(path),
    chain: firstChain.get(path),
  })).sort((a, b) => a.path.localeCompare(b.path));
  const prohibited = modules.filter(module => PROHIBITED_STARTUP_ENTRIES.has(module.path));
  return {
    schema: "a1-startup-reachability-v1",
    roots: [...roots],
    totals: { files: modules.length, sourceBytes: modules.reduce((total, module) => total + module.bytes, 0) },
    modules,
    edges: edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)),
    errors: prohibited.map(module => `${module.path}: prohibited startup entry via ${module.chain.join(" -> ")}`),
  };
}

export function classifyStartupModule(path) {
  return FIRST_PROMPT_PREFIXES.some(prefix => path.startsWith(prefix))
    ? "first-prompt-correctness"
    : "initial-render";
}

export function validateStartupReachabilityBaseline(report, baseline) {
  if (baseline?.schema !== "a1-startup-graph-baseline-v1") return ["startup graph baseline schema is invalid"];
  const errors = [];
  if (report.totals.files > baseline.ownedReachability.maximumFiles) {
    errors.push(`startup graph has ${report.totals.files} files; maximum is ${baseline.ownedReachability.maximumFiles}`);
  }
  if (report.totals.sourceBytes > baseline.ownedReachability.maximumSourceBytes) {
    errors.push(`startup graph has ${report.totals.sourceBytes} source bytes; maximum is ${baseline.ownedReachability.maximumSourceBytes}`);
  }
  const reached = new Set(report.modules.map(module => module.path));
  for (const module of report.modules) {
    if (!["initial-render", "first-prompt-correctness"].includes(module.classification)) {
      errors.push(`${module.path}: eager module has no accepted readiness classification`);
    }
  }
  for (const optional of baseline.ownedReachability.optionalModules) {
    if (reached.has(optional)) errors.push(`${optional}: optional module is eagerly reachable`);
  }
  return errors;
}

export function runtimeRelativeImports(source) {
  const imports = [];
  // Rationale: the clause must not cross a statement terminator, or a bare-specifier import on the
  // previous line would swallow a following relative `import type` and count it as a runtime edge.
  const statements = source.matchAll(/(?:^|\n)\s*(import|export)\s+([^;]*?)\s+from\s+(["'])(\.\.?\/[^"']+)\3\s*;?/g);
  for (const match of statements) {
    const clause = match[2].trim();
    if (match[1] === "import" && clause.startsWith("type ")) continue;
    if (match[1] === "export" && clause.startsWith("type ")) continue;
    imports.push(match[4]);
  }
  for (const match of source.matchAll(/(?:^|\n)\s*import\s+(["'])(\.\.?\/[^"']+)\1\s*;?/g)) imports.push(match[2]);
  return [...new Set(imports)];
}

async function resolveSource(root, importer, specifier) {
  const joined = posix.normalize(posix.join(posix.dirname(importer), specifier));
  const candidates = joined.endsWith(".js")
    ? [`${joined.slice(0, -3)}.ts`, `${joined.slice(0, -3)}.tsx`, joined]
    : joined.endsWith(".mjs") ? [joined] : [joined, `${joined}.ts`, `${joined}.js`, `${joined}/index.ts`];
  for (const candidate of candidates) {
    try {
      await readFile(resolve(root, candidate));
      return candidate;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
  }
  throw new Error(`${importer}: startup import ${specifier} cannot be resolved`);
}
