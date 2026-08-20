import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_EVIDENCE_PATH = "evidence/pi-api-boundary/baseline.json";
const PI_PACKAGE = /^@earendil-works\/pi-/;
const IMPORT_PATTERN = /\b(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\s+from\s+)?(["'])(@earendil-works\/pi-(?:coding-agent|tui))\1/g;
const DYNAMIC_IMPORT_PATTERN = /\bimport\s*\(\s*(["'])(@earendil-works\/pi-(?:coding-agent|tui))\1\s*\)/g;

export function collectPiApiBoundaryBaseline(root, baselineCommit) {
  const repository = resolve(root);
  const commit = git(repository, ["rev-parse", `${baselineCommit ?? "HEAD"}^{commit}`]).trim();
  const sourcePaths = git(repository, ["ls-tree", "-r", "--name-only", commit, "--", "src"])
    .split(/\r?\n/)
    .filter(path => /\.[cm]?[jt]sx?$/.test(path))
    .sort();
  const sources = new Map(sourcePaths.map(path => [path, gitShow(repository, commit, path)]));
  const manifest = JSON.parse(gitShow(repository, commit, "package.json"));
  const lockfile = JSON.parse(gitShow(repository, commit, "package-lock.json"));
  const ledger = JSON.parse(gitShow(repository, commit, "evidence/owned-pi-ui-foundation/pinned-pi-source-port-ledger.json"));

  const productionPiImports = collectImports(sources);
  const featureToAdapterDependencies = productionPiImports
    .filter(record => record.path.startsWith("src/features/") && record.specifier.startsWith("."))
    .map(record => ({ ...record, adapter: adapterFromSpecifier(record.specifier) }));
  const relativeFeatureImports = collectRelativeFeatureAdapterImports(sources);

  return {
    schema: "a1-pi-api-boundary-baseline-v1",
    baselineCommit: commit,
    dependencyGraph: collectDependencyGraph(manifest, lockfile, relativeFeatureImports),
    productionPiImportSites: productionPiImports.filter(record => !record.specifier.startsWith(".")),
    packageLayoutReads: collectLineFindings(sources, (line) => line.includes("getPackageDir()"), (line) => ({ expression: line.trim() })),
    reflectedConcreteConstructors: collectLineFindings(
      sources,
      line => line.includes("Reflect.construct("),
      line => ({ target: line.match(/Reflect\.construct\(\s*([A-Za-z_$][\w$]*)/)?.[1] ?? "unknown", expression: line.trim() }),
    ),
    featureToAdapterDependencies: relativeFeatureImports,
    sourceDerivedUiUnits: ledger.records
      .filter(record => record.classification === "owned-source-port")
      .map(record => ({
        id: record.id,
        package: record.package,
        upstreamPath: record.upstreamPath,
        localDestination: record.localDestination,
        localSha256: record.localSha256,
        implementationStatus: record.implementationStatus,
      }))
      .sort(compareBy("id")),
    exactOracleResolution: collectOracleResolution(sources),
    summary: {
      dependencyPackages: collectDependencyGraph(manifest, lockfile, relativeFeatureImports).packages.length,
      productionPiImports: productionPiImports.filter(record => !record.specifier.startsWith(".")).length,
      packageLayoutReads: collectLineFindings(sources, line => line.includes("getPackageDir()"), line => ({ expression: line.trim() })).length,
      reflectedConcreteConstructors: collectLineFindings(sources, line => line.includes("Reflect.construct("), line => ({ expression: line.trim() })).length,
      featureToAdapterDependencies: relativeFeatureImports.length,
      sourceDerivedUiUnits: ledger.records.filter(record => record.classification === "owned-source-port").length,
      exactOracleBoundToSelectedDependency: false,
    },
  };
}

function collectDependencyGraph(manifest, lockfile, ownerEdges) {
  const packages = [];
  const edges = [];
  const queue = Object.keys(manifest.dependencies ?? {})
    .filter(name => PI_PACKAGE.test(name))
    .map(name => ({ name, lockPath: `node_modules/${name}`, requested: manifest.dependencies[name], from: manifest.name }));
  const seen = new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current.lockPath)) continue;
    seen.add(current.lockPath);
    const locked = lockfile.packages?.[current.lockPath];
    if (!locked) throw new Error(`missing Pi lockfile package: ${current.lockPath}`);
    packages.push({ name: current.name, lockPath: current.lockPath, version: locked.version, integrity: locked.integrity ?? null });
    edges.push({ from: current.from, to: current.name, requested: current.requested, lockPath: current.lockPath });
    for (const [name, requested] of Object.entries(locked.dependencies ?? {}).filter(([name]) => PI_PACKAGE.test(name)).sort(([left], [right]) => left.localeCompare(right))) {
      const lockPath = resolveLockDependency(lockfile.packages, current.lockPath, name);
      queue.push({ name, lockPath, requested, from: current.name });
    }
  }
  packages.sort(compareBy("lockPath"));
  edges.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to) || left.lockPath.localeCompare(right.lockPath));
  const productionOwnerEdges = [...new Map(ownerEdges.map(edge => [`${edge.feature}->${edge.adapter}`, { from: edge.feature, to: edge.adapter }])).values()]
    .sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to));
  return {
    authorities: ["package.json", "package-lock.json"],
    root: manifest.name,
    packages,
    packageEdges: edges,
    productionOwnerEdges,
  };
}

function resolveLockDependency(packages, importerPath, name) {
  let root = importerPath;
  while (root) {
    const nested = `${root}/node_modules/${name}`;
    if (packages[nested]) return nested;
    const index = root.lastIndexOf("/node_modules/");
    if (index < 0) break;
    root = root.slice(0, index);
  }
  const topLevel = `node_modules/${name}`;
  if (packages[topLevel]) return topLevel;
  throw new Error(`cannot resolve ${name} from ${importerPath} in package-lock.json`);
}

function collectImports(sources) {
  const records = [];
  for (const [path, source] of sources) {
    for (const pattern of [IMPORT_PATTERN, DYNAMIC_IMPORT_PATTERN]) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) {
        records.push({
          path,
          line: lineAt(source, match.index ?? 0),
          specifier: match[2],
          statement: statementAt(source, match.index ?? 0),
        });
      }
    }
  }
  return unique(records, record => `${record.path}:${record.line}:${record.specifier}`).sort(compareFinding);
}

function collectRelativeFeatureAdapterImports(sources) {
  const records = [];
  for (const [path, source] of sources) {
    if (!path.startsWith("src/features/")) continue;
    const feature = path.split("/").slice(0, 3).join("/");
    const pattern = /\b(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\s+from\s+)?(["'])([^"']*foundation\/(pi-(?:engine|component|tui-runtime)-adapter)\/index\.js)\1/g;
    for (const match of source.matchAll(pattern)) {
      records.push({
        path,
        line: lineAt(source, match.index ?? 0),
        specifier: match[2],
        feature,
        adapter: match[3],
        statement: statementAt(source, match.index ?? 0),
      });
    }
  }
  return unique(records, record => `${record.path}:${record.line}:${record.specifier}`).sort(compareFinding);
}

function collectLineFindings(sources, accepts, details) {
  const records = [];
  for (const [path, source] of sources) {
    source.split(/\r?\n/).forEach((line, index) => {
      if (accepts(line, path)) records.push({ path, line: index + 1, ...details(line, path) });
    });
  }
  return records.sort(compareFinding);
}

function collectOracleResolution(sources) {
  const mainPath = "src/foundation/transparent-terminal/main.ts";
  const resolutionPath = "src/foundation/transparent-terminal/command-resolution.ts";
  const launcherPath = "src/foundation/transparent-terminal/native-launcher.ts";
  return {
    profile: "pi",
    requestedExecutable: "pi",
    binding: "ambient-path",
    selectedDependencyPackage: "@earendil-works/pi-coding-agent",
    selectedDependencyPublicEntry: null,
    selectedDependencyBound: false,
    platformBehavior: {
      windows: "resolve the pi command from PATH and unwrap an npm command shim when present",
      unix: "pass the pi command name to process spawning for ambient PATH resolution",
    },
    sources: [
      sourceLine(mainPath, sources.get(mainPath), line => line.includes('?? "pi"')),
      sourceLine(resolutionPath, sources.get(resolutionPath), line => line.includes("windowsPath(environment).split")),
      sourceLine(launcherPath, sources.get(launcherPath), line => line.includes("resolveTransparentCommand(")),
    ],
  };
}

function sourceLine(path, source, predicate) {
  if (source === undefined) throw new Error(`missing baseline source: ${path}`);
  const lines = source.split(/\r?\n/);
  const index = lines.findIndex(predicate);
  if (index < 0) throw new Error(`missing expected baseline oracle line: ${path}`);
  return { path, line: index + 1, expression: lines[index].trim() };
}

function adapterFromSpecifier(specifier) {
  return specifier.match(/pi-(?:engine|component|tui-runtime)-adapter/)?.[0] ?? "unknown";
}

function lineAt(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function statementAt(source, offset) {
  const end = source.indexOf(";", offset);
  return source.slice(offset, end < 0 ? source.indexOf("\n", offset) : end + 1).replace(/\s+/g, " ").trim();
}

function unique(values, key) {
  return [...new Map(values.map(value => [key(value), value])).values()];
}

function compareFinding(left, right) {
  return left.path.localeCompare(right.path) || left.line - right.line || (left.specifier ?? "").localeCompare(right.specifier ?? "");
}

function compareBy(field) {
  return (left, right) => String(left[field]).localeCompare(String(right[field]));
}

function git(repository, arguments_) {
  return execFileSync("git", arguments_, { cwd: repository, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}

function gitShow(repository, commit, path) {
  return git(repository, ["show", `${commit}:${path}`]);
}

function normalize(path) {
  return relative(process.cwd(), path).split(sep).join("/");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const rootIndex = process.argv.indexOf("--root");
  const root = resolve(rootIndex >= 0 ? process.argv[rootIndex + 1] : new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
  const evidenceIndex = process.argv.indexOf("--evidence");
  const evidencePath = resolve(root, evidenceIndex >= 0 ? process.argv[evidenceIndex + 1] : DEFAULT_EVIDENCE_PATH);
  if (process.argv.includes("--check")) {
    const recorded = JSON.parse(await readFile(evidencePath, "utf8"));
    const { recordedAt: _recordedAt, ...expected } = recorded;
    const actual = collectPiApiBoundaryBaseline(root, recorded.baselineCommit);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${normalize(evidencePath)} is stale or incomplete`);
    process.stdout.write(`Pi API boundary baseline OK: ${actual.summary.productionPiImports} imports, ${actual.summary.packageLayoutReads} package-layout reads, ${actual.summary.reflectedConcreteConstructors} reflected constructors\n`);
  } else {
    const commitIndex = process.argv.indexOf("--commit");
    const commit = commitIndex >= 0 ? process.argv[commitIndex + 1] : undefined;
    const baseline = collectPiApiBoundaryBaseline(root, commit);
    if (process.argv.includes("--write")) {
      await mkdir(dirname(evidencePath), { recursive: true });
      await writeFile(evidencePath, `${JSON.stringify({ ...baseline, recordedAt: new Date().toISOString() }, null, 2)}\n`);
      process.stdout.write(`Wrote Pi API boundary baseline for ${baseline.baselineCommit}.\n`);
    } else {
      process.stdout.write(`${JSON.stringify(baseline, null, 2)}\n`);
    }
  }
}
