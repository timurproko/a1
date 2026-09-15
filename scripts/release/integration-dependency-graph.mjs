import { createHash } from "node:crypto";
import { isBuiltin } from "node:module";
import { posix } from "node:path";
import ts from "typescript";
import { isDependencyPath } from "./revision-dependencies.mjs";

const SCRIPT = /\.(?:[cm]?[jt]s|[jt]sx)$/u;
const LOAD_KINDS = new Set(["computed-import", "subprocess", "worker", "asset-read", "opaque-loader"]);
const LIMITS = Object.freeze({ nodes: 2000000, edges: 100000, milliseconds: 10000 });
const PROCESS_CALLS = new Set(["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"]);
const READ_CALLS = new Set(["readFile", "readFileSync", "createReadStream", "readdir", "readdirSync", "opendir", "open", "openSync", "stat", "statSync", "lstat", "lstatSync", "access", "accessSync", "realpath", "realpathSync", "copyFile", "copyFileSync", "cp", "cpSync", "read", "readSync", "readv", "readvSync", "glob", "globSync"]);

/**
 * Compare complete owner roots against both immutable graphs. This returns evidence,
 * not workflow skip authority; integration ownership and aggregate adoption are separate.
 */
export function compareIntegrationDependencies({ base, head, changes, owners, basePolicy, headPolicy = basePolicy, limits }) {
  const baseGraph = createIntegrationDependencyGraph(base, basePolicy, { limits });
  const headGraph = base.revision === head.revision && basePolicy === headPolicy ? baseGraph : createIntegrationDependencyGraph(head, headPolicy, { limits });
  if (!Array.isArray(changes) || changes.length > 4096 || !Array.isArray(owners) || owners.length === 0 || owners.length > 64) throw new TypeError("invalid dependency comparison bounds");
  const paths = new Set();
  for (const change of changes) {
    if (!change || !/^[ACDMRTUXB]$/u.test(change.status) || !isDependencyPath(change.path)
      || (change.oldPath !== undefined && !isDependencyPath(change.oldPath))
      || (["R", "C"].includes(change.status) && change.oldPath === undefined)) throw new TypeError("invalid dependency change");
    paths.add(change.path);
    if (change.oldPath !== undefined) paths.add(change.oldPath);
  }
  const ids = new Set();
  const invalidators = [...new Set([...basePolicy.invalidators, ...headPolicy.invalidators])];
  const invalidated = [...paths].filter(path => invalidators.some(pattern => matches(path, pattern))).sort();
  const results = owners.map(owner => {
    if (!owner || !/^[a-z][a-z0-9-]{0,63}$/u.test(owner.id) || ids.has(owner.id)) throw new TypeError("invalid dependency owner");
    ids.add(owner.id);
    const old = baseGraph.trace(owner.entries);
    const current = headGraph.trace(owner.entries);
    const hits = [...paths].sort().flatMap(path => {
      const graph = current.reachable.has(path) ? current : old.reachable.has(path) ? old : null;
      if (!graph) return [];
      const chain = [];
      let cursor = path;
      while (cursor !== null && chain.length < 16) { chain.unshift(cursor); cursor = graph.reachable.get(cursor) ?? null; }
      return [{ path, revision: graph === current ? head.revision : base.revision, chain, chainTruncated: cursor !== null }];
    });
    const issues = [...old.issues, ...current.issues,
      ...(base.revision === head.revision ? [{ code: "comparison-not-distinct", path: owner.entries[0] }] : [])].slice(0, 64);
    return { owner: owner.id, selected: invalidated.length > 0 || hits.length > 0 || issues.length > 0,
      matches: hits.slice(0, 64), matchesTruncated: hits.length > 64, invalidators: invalidated.slice(0, 64), issues };
  });
  return { schema: "a1-integration-dependency-impact-v1", base: base.revision, head: head.revision, owners: results,
    stats: { base: { ...baseGraph.stats }, head: { ...headGraph.stats } } };
}

/** Parse modules once per revision; traverse cached edges for any number of owners. */
export function createIntegrationDependencyGraph(snapshot, policy, options = {}) {
  assertPolicy(policy);
  if (!snapshot || !/^[0-9a-f]{40}$/u.test(snapshot.revision) || !(snapshot.files instanceof Map)) throw new TypeError("invalid dependency snapshot");
  const limits = { ...LIMITS, ...options.limits };
  if (Object.keys(limits).some(key => !Object.hasOwn(LIMITS, key))) throw new TypeError("invalid dependency graph limit");
  for (const [key, maximum] of Object.entries(LIMITS)) if (!Number.isSafeInteger(limits[key]) || limits[key] < 1 || limits[key] > maximum) throw new TypeError("invalid dependency graph limit");
  const started = performance.now();
  const cache = new Map();
  const stats = { parsedModules: 0, nodes: 0, edges: 0 };
  const globalIssues = [];
  let manifest = {};
  try { manifest = JSON.parse(snapshot.files.get("package.json")?.source ?? "{}"); }
  catch { globalIssues.push({ code: "invalid-package-manifest", path: "package.json" }); }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    manifest = {};
    globalIssues.push({ code: "invalid-package-manifest", path: "package.json" });
  }
  if (manifest.workspaces) globalIssues.push({ code: "unsupported-workspaces", path: "package.json" });
  const configurations = new Map();
  for (const path of ["tsconfig.json", "tsconfig.build.json"]) {
    const source = snapshot.files.get(path)?.source;
    if (source === undefined) continue;
    try {
      const config = JSON.parse(source);
      configurations.set(path, config);
      if (config.compilerOptions?.paths || config.compilerOptions?.baseUrl || config.compilerOptions?.moduleSuffixes
        || (config.extends && config.extends !== "./tsconfig.json")) globalIssues.push({ code: "unsupported-module-resolution", path });
    } catch { globalIssues.push({ code: "invalid-module-resolution", path }); }
  }

  if (configurations.has("tsconfig.build.json")) {
    const build = configurations.get("tsconfig.build.json");
    const inherited = build?.extends === "./tsconfig.json" ? configurations.get("tsconfig.json")?.compilerOptions : {};
    const settings = { ...inherited, ...build?.compilerOptions };
    if (settings.rootDir !== policy.sourceRoot || settings.outDir !== policy.emittedRoot) globalIssues.push({ code: "unsupported-build-mapping", path: "tsconfig.build.json" });
  }

  return { stats, trace };

  function budget() {
    if (stats.nodes > limits.nodes || stats.edges > limits.edges || performance.now() - started > limits.milliseconds) throw new Error("dependency-graph-budget");
  }

  function trace(entries) {
    if (!Array.isArray(entries) || entries.length === 0 || entries.length > 512 || entries.some(path => !isDependencyPath(path))) throw new TypeError("invalid dependency entries");
    const reachable = new Map();
    const issues = [...globalIssues];
    const queue = [...new Set(entries)].sort().map(path => ({ path, parent: null }));
    try {
      for (let index = 0; index < queue.length; index++) {
        budget();
        const { path, parent } = queue[index];
        if (reachable.has(path)) continue;
        reachable.set(path, parent);
        if (!snapshot.files.has(path)) { issues.push({ code: "missing-entry", path }); continue; }
        let result;
        try { result = dependencies(path); }
        catch {
          cache.get(path)?.issues.push({ code: "dependency-module-incomplete", path });
          throw new Error("dependency-module-incomplete");
        }
        issues.push(...result.issues);
        for (const target of result.edges) {
          stats.edges++;
          if (!reachable.has(target)) queue.push({ path: target, parent: path });
        }
        // Invariant: evidence remains bounded without converting omitted problems into success.
        if (issues.length > 64) issues.splice(64);
      }
    } catch {
      issues.push({ code: "dependency-graph-incomplete", path: entries[0] });
    }
    return { reachable, issues: issues.slice(0, 64) };
  }

  function dependencies(path) {
    if (cache.has(path)) return cache.get(path);
    const file = snapshot.files.get(path);
    const edges = new Set();
    const issues = [];
    const result = { edges, issues };
    cache.set(path, result);
    const issue = code => { if (issues.length < 64 && !issues.some(value => value.code === code)) issues.push({ code, path }); };
    if (!["100644", "100755"].includes(file.mode)) { issue("unsupported-tree-entry"); return result; }
    if (!SCRIPT.test(path)) return result;
    if (typeof file.source !== "string") { issue("missing-module-source"); return result; }
    const reviewed = policy.reviewed.find(rule => rule.path === path);
    const acceptedReview = reviewed && reviewed.sha256 === createHash("sha256").update(file.source).digest("hex");
    if (reviewed && !acceptedReview) issue("reviewed-edge-stale");
    if (acceptedReview) for (const edge of reviewed.edges) addRepository(edge);
    const dynamic = kind => { if (!acceptedReview || !reviewed.handles.includes(kind)) issue(kind); };
    for (let directory = posix.dirname(path); directory !== "."; directory = posix.dirname(directory)) {
      if (snapshot.files.has(`${directory}/package.json`)) { edges.add(`${directory}/package.json`); issue("nested-package-resolution"); }
    }
    const source = ts.createSourceFile(path, file.source, ts.ScriptTarget.Latest, true);
    stats.parsedModules++;
    if (source.parseDiagnostics.length > 0) issue("unsupported-syntax");
    const processNames = new Set(PROCESS_CALLS);
    const readNames = new Set(READ_CALLS);
    const requireNames = new Set(["require"]);
    const requireFactories = new Set(["createRequire"]);
    const workerNames = new Set(["Worker"]);
    const namespaces = new Set();
    // Invariant: aliases are collected without assuming lexical scope or dead branches.
    function aliases(node) {
      stats.nodes++;
      budget();
      if (ts.isImportDeclaration(node)) {
        const specifier = literal(node.moduleSpecifier);
        if (specifier === "cross-spawn" && node.importClause?.name) processNames.add(node.importClause.name.text);
        if (["module", "node:module"].includes(specifier) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
          && node.importClause.namedBindings.elements.some(element => !["createRequire", "isBuiltin", "builtinModules"].includes(element.propertyName?.text ?? element.name.text))) dynamic("opaque-loader");
        if (/^(?:node:)?(?:child_process|fs(?:\/promises)?|worker_threads|module)$/u.test(specifier ?? "")) {
          if (node.importClause?.name) namespaces.add(node.importClause.name.text);
          if (node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) namespaces.add(node.importClause.namedBindings.name.text);
        }
      }
      if (ts.isImportSpecifier(node) || ts.isBindingElement(node)) {
        const original = node.propertyName?.text ?? node.name?.text;
        const name = node.name?.text;
        if (name) {
          if (PROCESS_CALLS.has(original)) processNames.add(name);
          if (READ_CALLS.has(original)) readNames.add(name);
          if (original === "Worker") workerNames.add(name);
          if (original === "createRequire") requireFactories.add(name);
        }
      }
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        const initializer = node.initializer;
        if (ts.isCallExpression(initializer) && requireFactories.has(callName(initializer.expression))) requireNames.add(node.name.text);
        const value = ts.isAwaitExpression(initializer) ? initializer.expression : initializer;
        if (ts.isCallExpression(value) && /^(?:node:)?(?:child_process|fs(?:\/promises)?|worker_threads|module)$/u.test(literal(value.arguments[0]) ?? "")) namespaces.add(node.name.text);
        if ((ts.isIdentifier(initializer) || ts.isPropertyAccessExpression(initializer))
          && [requireNames, processNames, readNames, requireFactories, workerNames, namespaces].some(names => names.has(callName(initializer)))) dynamic("opaque-loader");
      }
      ts.forEachChild(node, aliases);
    }
    aliases(source);
    function visit(node) {
      stats.nodes++;
      budget();
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier) addImport(literal(node.moduleSpecifier));
      }
      if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) addImport(literal(node.moduleReference.expression));
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) addImport(literal(node.argument.literal));
      if (ts.isElementAccessExpression(node) && namespaces.has(namespaceRoot(node.expression))) dynamic("opaque-loader");
      if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
        const name = callName(node);
        const parent = node.parent;
        const directCall = (ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.expression === node;
        const declaration = ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent)
          || ts.isBindingElement(parent) || (ts.isVariableDeclaration(parent) && parent.name === node);
        const propertyPart = ts.isPropertyAccessExpression(parent) || ts.isQualifiedName(parent);
        if (!directCall && !declaration && !propertyPart && !ts.isTypeNode(parent) && [requireNames, processNames, readNames, requireFactories, workerNames, namespaces].some(names => names.has(name))) dynamic("opaque-loader");
        if (ts.isPropertyAccessExpression(node) && !directCall
          && [requireNames, processNames, readNames, requireFactories, workerNames].some(names => names.has(name))) dynamic("opaque-loader");
      }
      if (ts.isCallExpression(node)) {
        const name = callName(node.expression);
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword || requireNames.has(name)
          || (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "resolve"
            && (requireNames.has(callName(node.expression.expression)) || node.expression.expression.getText(source) === "import.meta"))) {
          const specifier = literal(node.arguments[0]);
          if (specifier === null) dynamic("computed-import"); else addImport(specifier);
        } else if (requireFactories.has(name)) {
          if (node.arguments[0]?.getText(source) !== "import.meta.url" || !ts.isVariableDeclaration(node.parent) || node.parent.initializer !== node) dynamic("opaque-loader");
        } else if (ts.isPropertyAccessExpression(node.expression) && ["bind", "call", "apply"].includes(name)
          && [requireNames, processNames, readNames, requireFactories, workerNames].some(names => names.has(callName(node.expression.expression)))) dynamic("opaque-loader");
        else if (processNames.has(name) || (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "sync" && processNames.has(callName(node.expression.expression)))) {
          if (name === "fork" && isModuleUrl(node.arguments[0])) addRepositoryUrl(node.arguments[0]);
          else dynamic("subprocess");
        } else if (readNames.has(name)) {
          if (isModuleUrl(node.arguments[0])) addRepositoryUrl(node.arguments[0]);
          else dynamic("asset-read");
        } else if (["eval", "Function", "dlopen", "getBuiltinModule"].includes(name) || namespaces.has(namespaceRoot(node.expression))) dynamic("opaque-loader");
      }
      if (ts.isNewExpression(node)) {
        const name = callName(node.expression);
        if (name === "URL" && node.arguments?.[1]?.getText(source) === "import.meta.url") addRepositoryUrl(node);
        if (workerNames.has(name)) {
          if (isModuleUrl(node.arguments?.[0])) addRepositoryUrl(node.arguments[0]); else dynamic("worker");
        }
        if (name === "Function") dynamic("opaque-loader");
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    return result;

    function addRepositoryUrl(node) {
      const value = literal(node.arguments?.[0]);
      if (value === null) { dynamic("computed-import"); return; }
      if (!value.startsWith(".")) { issue("unsupported-module-url"); return; }
      addRepository(posix.normalize(posix.join(posix.dirname(path), value)));
    }

    function addRepository(target) {
      if (!isDependencyPath(target)) { issue("invalid-repository-import"); return; }
      const generated = policy.generated.filter(rule => matches(target, rule.output));
      if (generated.length > 0) {
        for (const rule of generated) for (const input of rule.inputs) {
          const candidates = [...snapshot.files.keys()].filter(path => matches(path, input));
          if (candidates.length === 0) issue("missing-generated-input");
          for (const candidate of candidates) edges.add(candidate);
        }
        return;
      }
      const roots = [target];
      if (target.startsWith(`${policy.emittedRoot}/`)) roots.push(`${policy.sourceRoot}/${target.slice(policy.emittedRoot.length + 1)}`);
      const found = roots.flatMap(importCandidates).filter(candidate => snapshot.files.has(candidate));
      if (found.length === 0) issue("unresolved-repository-import");
      for (const candidate of found) edges.add(candidate);
    }

    function addImport(specifier) {
      if (specifier === null) { dynamic("computed-import"); return; }
      if (isBuiltin(specifier)) return;
      if (specifier.startsWith(".")) { addRepository(posix.normalize(posix.join(posix.dirname(path), specifier))); return; }
      if (specifier.startsWith("#")) {
        edges.add("package.json");
        const targets = packageTargets(manifest.imports?.[specifier]);
        if (targets.length === 0) issue("unresolved-package-import");
        for (const target of targets) target.startsWith("./") ? addRepository(target.slice(2)) : issue("unsupported-package-import-target");
        return;
      }
      const packageName = specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
      edges.add("package.json");
      if (packageName === manifest.name) {
        const key = specifier === packageName ? "." : `.${specifier.slice(packageName.length)}`;
        const exports = manifest.exports;
        const targets = packageTargets(exports && typeof exports === "object" && Object.keys(exports).some(key => key.startsWith(".")) ? exports[key] : key === "." ? exports ?? manifest.main : undefined);
        if (targets.length === 0) issue("unresolved-package-self-reference");
        for (const target of targets) target.startsWith("./") ? addRepository(target.slice(2)) : issue("unsupported-package-self-reference");
      } else if ([manifest.dependencies, manifest.devDependencies, manifest.optionalDependencies].some(values => values && Object.hasOwn(values, packageName))) {
        if (snapshot.files.has("package-lock.json")) edges.add("package-lock.json"); else issue("missing-package-lockfile");
      } else issue("unresolved-bare-import");
    }
  }
}

function literal(node) {
  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null;
}
function callName(node) {
  return node && (ts.isIdentifier(node) ? node.text : ts.isPropertyAccessExpression(node) ? node.name.text : "");
}
function namespaceRoot(node) {
  while (node && (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))) node = node.expression;
  return node && ts.isIdentifier(node) ? node.text : "";
}
function isModuleUrl(node) {
  return node && ts.isNewExpression(node) && callName(node.expression) === "URL" && node.arguments?.[1]?.getText() === "import.meta.url";
}
function matches(path, pattern) {
  return pattern.endsWith("/") ? path.startsWith(pattern) : path === pattern;
}
function importCandidates(path) {
  const extension = posix.extname(path);
  const extensions = extension === ".js" ? [".ts", ".tsx", ".js", ".jsx"] : extension === ".mjs" ? [".mts", ".mjs"] : extension === ".cjs" ? [".cts", ".cjs"] : [];
  if (extensions.length) return extensions.map(value => `${path.slice(0, -extension.length)}${value}`);
  if (extension) return [path];
  return [path, ...[".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json"].flatMap(value => [`${path}${value}`, `${path}/index${value}`])];
}
function packageTargets(value, depth = 0) {
  if (depth > 8) return [];
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(child => packageTargets(child, depth + 1));
  return [];
}

/** Reviews are source-bound; changed or missing reviews can only add conservative coverage. */
function assertPolicy(policy) {
  const exact = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
  if (!exact(policy, ["schema", "emittedRoot", "sourceRoot", "invalidators", "unrelated", "generated", "reviewed"]) || policy.schema !== "a1-integration-dependencies-v1" || !isDependencyPath(policy.emittedRoot) || !isDependencyPath(policy.sourceRoot)) throw new TypeError("invalid dependency policy");
  for (const key of ["invalidators", "unrelated", "generated", "reviewed"]) if (!Array.isArray(policy[key]) || policy[key].length > 512) throw new TypeError("invalid dependency policy bounds");
  const pattern = value => typeof value === "string" && isDependencyPath(value.endsWith("/") ? value.slice(0, -1) : value);
  if (policy.invalidators.some(value => !pattern(value)) || policy.unrelated.some(value => !pattern(value))) throw new TypeError("invalid dependency invalidator");
  for (const rule of policy.generated) if (!exact(rule, ["output", "inputs"]) || !pattern(rule.output) || !Array.isArray(rule.inputs) || rule.inputs.length === 0 || rule.inputs.length > 64 || rule.inputs.some(value => !pattern(value))) throw new TypeError("invalid generated dependency rule");
  const paths = new Set();
  for (const rule of policy.reviewed) {
    if (!exact(rule, ["path", "sha256", "edges", "handles", "reason"]) || typeof rule.reason !== "string" || rule.reason.length === 0 || rule.reason.length > 512
      || !isDependencyPath(rule.path) || paths.has(rule.path) || !/^[0-9a-f]{64}$/u.test(rule.sha256)
      || !Array.isArray(rule.edges) || rule.edges.length === 0 || rule.edges.length > 64 || rule.edges.some(value => !isDependencyPath(value))
      || !Array.isArray(rule.handles) || rule.handles.length === 0 || rule.handles.some(kind => !LOAD_KINDS.has(kind))) throw new TypeError("invalid reviewed dependency rule");
    paths.add(rule.path);
  }
}
