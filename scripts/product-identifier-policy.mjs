import { readFile, readdir, writeFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import ts from "typescript";

const ROOTS = ["src", "scripts", "test", "native", "bin"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs", ".rs"]);
const PRODUCT_PREFIX = /^(?:A1[A-Z][A-Za-z0-9_]*|a1[A-Z][A-Za-z0-9_]*|A1_[A-Z0-9_]+|a1_[A-Za-z0-9_]+)$/;
const EXTERNAL_TOKEN = /^A1_[A-Z0-9_]+$/;

export async function inspectProductIdentifiers(repository) {
  const root = resolve(repository);
  const internalIdentifiers = [];
  const externalIdentityIdentifiers = [];
  for (const directory of ROOTS) {
    for (const file of await walk(resolve(root, directory))) {
      const path = relative(root, file).split(sep).join("/");
      const source = await readFile(file, "utf8");
      const findings = extname(file) === ".rs" ? inspectRust(path, source) : inspectTypeScript(path, source);
      internalIdentifiers.push(...findings.internal);
      externalIdentityIdentifiers.push(...findings.external);
    }
  }
  return {
    schema: "product-semantic-identifier-inventory-v1",
    roots: ROOTS,
    internalIdentifiers: sortUnique(internalIdentifiers),
    externalIdentityIdentifiers: sortUnique(externalIdentityIdentifiers),
  };
}

export function inspectTypeScript(path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, path.endsWith("x") ? ts.ScriptKind.TSX : path.endsWith(".ts") || path.endsWith(".mts") ? ts.ScriptKind.TS : ts.ScriptKind.JS);
  const internal = [];
  const external = [];
  const visit = node => {
    if (ts.isIdentifier(node) && PRODUCT_PREFIX.test(node.text)) {
      const finding = { path, line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1, identifier: node.text };
      if (EXTERNAL_TOKEN.test(node.text) && isExternalIdentityPosition(node)) external.push(finding);
      else internal.push(finding);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { internal, external };
}

function isExternalIdentityPosition(node) {
  const parent = node.parent;
  return (ts.isPropertyAccessExpression(parent) && parent.name === node)
    || ((ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent) || ts.isMethodSignature(parent)) && parent.name === node);
}

function inspectRust(path, source) {
  const sanitized = source
    .replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, match => " ".repeat(match.length))
    .replace(/"(?:\\.|[^"\\])*"/g, match => match.replace(/[^\n]/g, " "));
  const internal = [];
  for (const match of sanitized.matchAll(/\b(?:A1[A-Z][A-Za-z0-9_]*|a1[A-Z][A-Za-z0-9_]*|A1_[A-Z0-9_]+|a1_[A-Za-z0-9_]+)\b/g)) {
    internal.push({ path, line: sanitized.slice(0, match.index).split("\n").length, identifier: match[0] });
  }
  return { internal, external: [] };
}

async function walk(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error instanceof Error && "code" in error && error.code === "ENOENT") return []; throw error; }
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (SOURCE_EXTENSIONS.has(extname(entry.name))) files.push(path);
  }
  return files;
}

function sortUnique(findings) {
  return [...new Map(findings.map(finding => [`${finding.path}\0${finding.line}\0${finding.identifier}`, finding])).values()]
    .sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line || left.identifier.localeCompare(right.identifier));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"))) {
  const rootIndex = process.argv.indexOf("--root");
  const root = resolve(rootIndex >= 0 ? process.argv[rootIndex + 1] : new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
  const inventory = await inspectProductIdentifiers(root);
  const writeIndex = process.argv.indexOf("--write");
  if (writeIndex >= 0) {
    const output = resolve(root, process.argv[writeIndex + 1]);
    await writeFile(output, `${JSON.stringify({ ...inventory, baselineInternalIdentifiers: inventory.internalIdentifiers }, null, 2)}\n`, "utf8");
  } else {
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
  }
}
