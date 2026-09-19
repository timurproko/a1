/**
 * The package-root export surface of the pinned Pi packages, read from each package's declaration
 * entry with the TypeScript compiler API: one record per export with its kind, the hash of its
 * normalized declaration text, and the A1 modules under `src/` whose import statements name it.
 * The baseline is tooling evidence, never a production import, so the boundary rule that forbids
 * deep imports is untouched. `diffPublicApi` turns two surfaces into the adoption items a Pi
 * upgrade proposal lists; nothing here writes a file.
 */
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";

export const PUBLIC_API_SCHEMA = "a1-pinned-pi-public-api-v1";

export const PI_PACKAGE_ENTRIES = Object.freeze([
  { name: "@earendil-works/pi-coding-agent", entry: "dist/index.d.ts" },
  { name: "@earendil-works/pi-tui", entry: "dist/index.d.ts" },
]);

/**
 * Collect the export surface of every pinned package installed under `packagesRoot`
 * (a `node_modules` directory) with the consumers found under `sourceRoot`.
 */
export async function collectPiPublicApi({ packagesRoot, sourceRoot, packages = PI_PACKAGE_ENTRIES }) {
  const consumers = await collectConsumers(sourceRoot, packages.map(pkg => pkg.name));
  const entries = packages.map(pkg => ({ ...pkg, path: resolve(packagesRoot, ...pkg.name.split("/"), pkg.entry) }));
  const program = ts.createProgram(entries.map(entry => entry.path), {
    noEmit: true,
    skipLibCheck: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowImportingTsExtensions: true,
    target: ts.ScriptTarget.ES2022,
    types: [],
  });
  const checker = program.getTypeChecker();
  const printer = ts.createPrinter({ removeComments: true });
  const result = [];
  for (const entry of entries) {
    const version = JSON.parse(await readFile(resolve(packagesRoot, ...entry.name.split("/"), "package.json"), "utf8")).version;
    const sourceFile = program.getSourceFile(entry.path);
    if (sourceFile === undefined) throw new Error(`declaration entry is missing: ${entry.path}`);
    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (moduleSymbol === undefined) throw new Error(`declaration entry is not a module: ${entry.path}`);
    const exports = [];
    for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      const declarations = (target.declarations ?? []).filter(declaration => !ts.isSourceFile(declaration));
      if (declarations.length === 0) throw new Error(`${entry.name}: export ${symbol.name} has no declaration`);
      const text = declarations.map(declaration => printer.printNode(ts.EmitHint.Unspecified, declaration, declaration.getSourceFile())).join("\n");
      exports.push({
        name: symbol.name,
        kind: exportKind(declarations),
        hash: createHash("sha256").update(text.replace(/\s+/g, " ").trim()).digest("hex"),
        consumers: [...(consumers.get(`${entry.name}:${symbol.name}`) ?? [])].sort(),
      });
    }
    exports.sort((left, right) => left.name.localeCompare(right.name));
    result.push({ name: entry.name, version, entry: entry.entry, exports });
  }
  return { schema: PUBLIC_API_SCHEMA, packages: result };
}

/** Compare two surfaces: exports that appeared, disappeared, or changed declaration, with their consumers. */
export function diffPublicApi(previous, next) {
  const delta = { added: [], removed: [], changed: [] };
  for (const pkg of next.packages) {
    const before = new Map((previous.packages.find(candidate => candidate.name === pkg.name)?.exports ?? []).map(record => [record.name, record]));
    for (const record of pkg.exports) {
      const old = before.get(record.name);
      before.delete(record.name);
      const item = { package: pkg.name, name: record.name, kind: record.kind, consumers: record.consumers };
      if (old === undefined) delta.added.push(item);
      else if (old.hash !== record.hash || old.kind !== record.kind) delta.changed.push({ ...item, consumers: [...new Set([...old.consumers, ...record.consumers])].sort() });
    }
    for (const old of before.values()) delta.removed.push({ package: pkg.name, name: old.name, kind: old.kind, consumers: old.consumers });
  }
  for (const pkg of previous.packages) {
    if (next.packages.some(candidate => candidate.name === pkg.name)) continue;
    for (const old of pkg.exports) delta.removed.push({ package: pkg.name, name: old.name, kind: old.kind, consumers: old.consumers });
  }
  return delta;
}

/** The review lines a proposal body lists for a delta: consumed removals and changes first, as adoption items. */
export function publicApiReviewItems(delta) {
  const items = [];
  for (const record of delta.removed.filter(record => record.consumers.length > 0)) {
    items.push(`public API ${record.package} removed ${record.kind} ${record.name}; adopt in ${record.consumers.join(", ")}`);
  }
  for (const record of delta.changed.filter(record => record.consumers.length > 0)) {
    items.push(`public API ${record.package} changed ${record.kind} ${record.name}; adopt in ${record.consumers.join(", ")}`);
  }
  return items;
}

/** Group a `tsc` error listing by file: `path(line,col): error TSxxxx: message` lines, with the codes seen. */
export function summarizeCompileOutput(output) {
  const files = new Map();
  for (const line of String(output ?? "").split(/\r?\n/)) {
    const match = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/.exec(line.trim());
    if (match === null) continue;
    const path = match[1].replaceAll("\\", "/");
    const entry = files.get(path) ?? { path, errors: 0, codes: [], first: "" };
    entry.errors += 1;
    if (!entry.codes.includes(match[4])) entry.codes.push(match[4]);
    if (entry.first === "") entry.first = match[5];
    files.set(path, entry);
  }
  return [...files.values()].sort((left, right) => right.errors - left.errors || left.path.localeCompare(right.path));
}

function exportKind(declarations) {
  const declaration = declarations[0];
  if (ts.isClassDeclaration(declaration)) return "class";
  if (ts.isFunctionDeclaration(declaration)) return "function";
  if (ts.isInterfaceDeclaration(declaration)) return "interface";
  if (ts.isTypeAliasDeclaration(declaration)) return "type";
  if (ts.isEnumDeclaration(declaration)) return "enum";
  if (ts.isModuleDeclaration(declaration)) return "namespace";
  if (ts.isVariableDeclaration(declaration)) return "const";
  return ts.SyntaxKind[declaration.kind];
}

/**
 * Map `package:export` to the source files whose import or re-export statements name it, either
 * from the package directly or through an A1 barrel that re-exports the package (`startup-public.ts`
 * re-exports the coding agent by name and its types wholesale).
 */
async function collectConsumers(sourceRoot, packageNames) {
  const names = new Set(packageNames);
  const parsed = [];
  for (const path of await typescriptFilesUnder(sourceRoot)) {
    const source = await readFile(path, "utf8");
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, false);
    // Invariant: consumers are recorded relative to the repository (`src/...`) so the baseline path policy verifies they exist.
    parsed.push({ path: path.replaceAll("\\", "/"), relativePath: relative(dirname(sourceRoot), path).replaceAll("\\", "/"), file });
  }
  // Rationale: a barrel that re-exports the package makes its importers consumers of the package's export, not of the barrel.
  const barrels = new Map();
  for (const { path, file } of parsed) {
    const named = new Map();
    const wildcard = new Set();
    for (const statement of file.statements) {
      if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier) || !names.has(statement.moduleSpecifier.text)) continue;
      const pkg = statement.moduleSpecifier.text;
      if (statement.exportClause === undefined) wildcard.add(pkg);
      else if (ts.isNamedExports(statement.exportClause)) for (const element of statement.exportClause.elements) named.set(element.name.text, { pkg, name: (element.propertyName ?? element.name).text });
    }
    if (named.size > 0 || wildcard.size > 0) barrels.set(path, { named, wildcard });
  }
  const consumers = new Map();
  const record = (key, relativePath) => {
    const files = consumers.get(key) ?? new Set();
    files.add(relativePath);
    consumers.set(key, files);
  };
  for (const { path, relativePath, file } of parsed) {
    for (const statement of file.statements) {
      const specifier = (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text
        : undefined;
      if (specifier === undefined) continue;
      const bindings = ts.isImportDeclaration(statement) ? statement.importClause?.namedBindings : statement.exportClause;
      if (bindings === undefined || !(ts.isNamedImports(bindings) || ts.isNamedExports(bindings))) continue;
      const barrel = specifier.startsWith(".") ? barrels.get(resolveBarrel(path, specifier)) : undefined;
      if (!names.has(specifier) && barrel === undefined) continue;
      for (const element of bindings.elements) {
        const imported = (element.propertyName ?? element.name).text;
        if (names.has(specifier)) { record(`${specifier}:${imported}`, relativePath); continue; }
        const named = barrel.named.get(imported);
        if (named !== undefined) record(`${named.pkg}:${named.name}`, relativePath);
        else for (const pkg of barrel.wildcard) record(`${pkg}:${imported}`, relativePath);
      }
    }
  }
  return consumers;
}

function resolveBarrel(importer, specifier) {
  const target = resolve(dirname(importer), specifier).replaceAll("\\", "/");
  return target.endsWith(".js") ? `${target.slice(0, -3)}.ts` : target.endsWith(".ts") ? target : `${target}.ts`;
}

async function typescriptFilesUnder(root) {
  const values = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (/\.(?:ts|mts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) values.push(path);
    }
  }
  await visit(root);
  return values.sort();
}
