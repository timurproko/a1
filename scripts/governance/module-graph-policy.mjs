import { readFile, readdir } from "node:fs/promises";
import { posix, resolve, sep } from "node:path";
import { STARTUP_ROOTS, runtimeRelativeImports } from "./startup-graph-policy.mjs";

const SOURCE_FILE = /\.(?:ts|mts|cts)$/;
const DECLARATION_FILE = /\.d\.(?:ts|mts|cts)$/;
const STATIC_IMPORT = /(?:^|\n)\s*(?:import|export)\s+(?:[^;]*?\s+from\s+)?(["'])(\.\.?\/[^"']+)\1\s*;?/g;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*(["'])(\.\.?\/[^"']+)\1\s*\)/g;
const WORKER_URL = /new URL\(([^)]*)import\.meta\.url\s*\)/g;
const URL_LITERAL = /(["'])(\.\.?\/[^"']+\.(?:js|ts))\1/g;
const DIST_REFERENCE = /(["'])(?:\.\.?\/)?dist\/([^"']+)\.js\1/g;
const RUNTIME_EXPORT = /(?:^|\n)\s*export\s+(?:default\b|(?:async\s+)?function\b|(?:const|let|var|class|enum)\b|(?!type\s*\{)\{|(?!type\s+\*)\*)/;

/**
 * Reads every source module under `src/` once (or takes already-read sources keyed by posix path) and records two edge sets per module: every
 * relative import including type-only ones (for cycles), and only the imports that load at
 * runtime plus dynamic imports and worker URLs (for reachability).
 */
export async function collectModuleGraph(root, sources = null) {
  const modules = new Map();
  const paths = sources === null
    ? (await sourcePaths(resolve(root, "src"), "src")).sort()
    : Object.keys(sources).filter(path => SOURCE_FILE.test(path) && !DECLARATION_FILE.test(path)).sort();
  const known = new Set(paths);
  for (const path of paths) {
    const source = sources === null ? await readFile(resolve(root, path), "utf8") : sources[path];
    const staticEdges = new Set();
    const runtimeEdges = new Set();
    for (const match of source.matchAll(STATIC_IMPORT)) {
      const target = resolveRelative(known, path, match[2]);
      if (target !== null) staticEdges.add(target);
    }
    for (const specifier of runtimeRelativeImports(source)) {
      const target = resolveRelative(known, path, specifier);
      if (target !== null) runtimeEdges.add(target);
    }
    for (const match of source.matchAll(DYNAMIC_IMPORT)) {
      const target = resolveRelative(known, path, match[2]);
      if (target !== null) { staticEdges.add(target); runtimeEdges.add(target); }
    }
    for (const expression of source.matchAll(WORKER_URL)) {
      for (const literal of expression[1].matchAll(URL_LITERAL)) {
        const target = resolveRelative(known, path, literal[2]);
        if (target !== null) { staticEdges.add(target); runtimeEdges.add(target); }
      }
    }
    // Rationale: a module that exports only types is consumed by the compiler and never loaded, so its
    // reachability is a question about type importers, not runtime ones.
    modules.set(path, { staticEdges: [...staticEdges].sort(), runtimeEdges: [...runtimeEdges].sort(), typeOnly: !RUNTIME_EXPORT.test(source) });
  }
  return modules;
}

/** Tarjan over the static edge set; returns every component with more than one member, members sorted. */
export function findImportCycles(graph) {
  const index = new Map();
  const lowLink = new Map();
  const onStack = new Set();
  const stack = [];
  const cycles = [];
  let counter = 0;
  for (const start of graph.keys()) {
    if (index.has(start)) continue;
    // Rationale: an explicit frame stack keeps a long import chain from exhausting the call stack.
    const frames = [{ node: start, edges: graph.get(start).staticEdges, position: 0 }];
    index.set(start, counter); lowLink.set(start, counter); counter += 1;
    stack.push(start); onStack.add(start);
    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      if (frame.position < frame.edges.length) {
        const next = frame.edges[frame.position];
        frame.position += 1;
        if (!index.has(next)) {
          index.set(next, counter); lowLink.set(next, counter); counter += 1;
          stack.push(next); onStack.add(next);
          frames.push({ node: next, edges: graph.get(next).staticEdges, position: 0 });
        } else if (onStack.has(next)) {
          lowLink.set(frame.node, Math.min(lowLink.get(frame.node), index.get(next)));
        }
        continue;
      }
      frames.pop();
      if (frames.length > 0) {
        const parent = frames[frames.length - 1].node;
        lowLink.set(parent, Math.min(lowLink.get(parent), lowLink.get(frame.node)));
      }
      if (lowLink.get(frame.node) === index.get(frame.node)) {
        const members = [];
        let member;
        do { member = stack.pop(); onStack.delete(member); members.push(member); } while (member !== frame.node);
        if (members.length > 1) cycles.push(members.sort());
      }
    }
  }
  return cycles.sort((left, right) => left[0].localeCompare(right[0]));
}

/**
 * Runtime-edge reachability from the roots; owner barrels are exempt because ownership policy requires
 * them, and a type-only module counts as reached when any reached module imports it, even as a type.
 */
export function findUnreachableModules(graph, roots) {
  const reached = new Set();
  const queue = roots.filter(path => graph.has(path));
  while (queue.length > 0) {
    const path = queue.pop();
    if (reached.has(path)) continue;
    reached.add(path);
    queue.push(...graph.get(path).runtimeEdges);
  }
  const typeQueue = [...reached];
  while (typeQueue.length > 0) {
    for (const target of graph.get(typeQueue.pop()).staticEdges) {
      if (graph.get(target)?.typeOnly && !reached.has(target)) { reached.add(target); typeQueue.push(target); }
    }
  }
  return [...graph.keys()].filter(path => !reached.has(path) && !path.endsWith("/index.ts")).sort();
}

export async function collectEntryRoots(root, graph) {
  const roots = new Set(STARTUP_ROOTS.filter(path => graph.has(path)));
  const binDirectory = resolve(root, "bin");
  let binNames = [];
  try { binNames = (await readdir(binDirectory)).filter(name => name.endsWith(".js")); } catch { binNames = []; }
  for (const name of binNames) addDistReferences(roots, graph, await readFile(resolve(binDirectory, name), "utf8"));
  let manifest = "";
  try { manifest = await readFile(resolve(root, "package.json"), "utf8"); } catch { manifest = ""; }
  addDistReferences(roots, graph, manifest);
  return [...roots].sort();
}

export async function inspectModuleGraph(root, allowlist, sources = null) {
  const errors = [];
  if (allowlist?.schema !== "a1-architecture-allowlist-v1") return ["architecture allowlist schema is invalid"];
  const graph = await collectModuleGraph(root, sources);
  const entryModules = allowlist.entryModules ?? [];
  const roots = [...await collectEntryRoots(root, graph), ...entryModules];

  const importers = new Map();
  for (const [path, module] of graph) for (const target of module.runtimeEdges) importers.set(target, [...importers.get(target) ?? [], path]);
  for (const entry of entryModules) {
    if (!graph.has(entry)) errors.push(`architecture allowlist: declared entry module ${entry} does not exist`);
    else if (importers.has(entry)) errors.push(`architecture allowlist: declared entry module ${entry} is imported by ${importers.get(entry).join(", ")}; drop the declaration`);
  }

  const found = findImportCycles(graph);
  const foundKeys = new Set(found.map(cycle => cycle.join("|")));
  const listed = (allowlist.importCycles ?? []).map(cycle => [...cycle].sort());
  const listedKeys = new Set(listed.map(cycle => cycle.join("|")));
  for (const cycle of found) {
    if (!listedKeys.has(cycle.join("|"))) errors.push(`import cycle of ${cycle.length} modules is not allowlisted: ${cycle.join(" <-> ")}`);
  }
  for (const cycle of listed) {
    if (!foundKeys.has(cycle.join("|"))) errors.push(`architecture allowlist: listed import cycle no longer exists: ${cycle.join(" <-> ")}; drop it`);
  }

  const unreachable = findUnreachableModules(graph, roots);
  const unreachableSet = new Set(unreachable);
  const allowedUnreachable = new Set(allowlist.unreachableModules ?? []);
  for (const path of unreachable) {
    if (!allowedUnreachable.has(path)) errors.push(`${path}: not reachable from any entry and not allowlisted; delete it, connect it, or declare it an entry`);
  }
  for (const path of allowedUnreachable) {
    if (!unreachableSet.has(path)) errors.push(`architecture allowlist: ${path} is ${graph.has(path) ? "reachable again" : "gone"}; drop it from unreachableModules`);
  }
  return errors;
}

function addDistReferences(roots, graph, source) {
  for (const match of source.matchAll(DIST_REFERENCE)) {
    for (const candidate of [`src/${match[2]}.ts`, `src/${match[2]}/index.ts`]) {
      if (graph.has(candidate)) { roots.add(candidate); break; }
    }
  }
}

function resolveRelative(known, importer, specifier) {
  const joined = posix.normalize(posix.join(posix.dirname(importer), specifier));
  const candidates = joined.endsWith(".js")
    ? [`${joined.slice(0, -3)}.ts`, `${joined.slice(0, -3)}.mts`]
    : [joined, `${joined}.ts`, `${joined}/index.ts`];
  return candidates.find(candidate => known.has(candidate)) ?? null;
}

async function sourcePaths(directory, prefix) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return []; }
  const found = [];
  for (const entry of entries) {
    const path = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...await sourcePaths(resolve(directory, entry.name), path));
    else if (SOURCE_FILE.test(entry.name) && !DECLARATION_FILE.test(entry.name)) found.push(path.split(sep).join("/"));
  }
  return found;
}
