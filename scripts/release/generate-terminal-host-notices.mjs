import crossSpawn from "cross-spawn";
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const NOTICES_FILENAME = "terminal-host-THIRD-PARTY-NOTICES.txt";
export const ALLOWED_LICENSES = Object.freeze(["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "Unicode-3.0", "Zlib"]);
const ALLOWED_EXCEPTIONS = Object.freeze(["LLVM-exception"]);
const LICENSE_FILE = /^(licen[cs]e|copying|notice|copyright)([-._].*)?$/i;

/**
 * Builds the third-party notice text for the shipped terminal host from the locked Cargo graph
 * (normal dependencies only; proc-macro crates and their subtrees never reach the binary) plus the
 * Zig-linked components recorded in the provenance file. Fails on a missing license text or a
 * license expression the allowlist cannot satisfy.
 */
export async function renderTerminalHostNotices({ metadata, readText, linkedComponents, crateLicenseTexts = {} }) {
  const packages = new Map(metadata.packages.map(item => [item.id, item]));
  const nodes = new Map(metadata.resolve.nodes.map(node => [node.id, node]));
  const root = metadata.resolve.root;
  if (!root || !nodes.has(root)) throw new Error("cargo metadata has no resolved root package");
  const shipped = new Set();
  const pending = [root];
  while (pending.length > 0) {
    const node = nodes.get(pending.pop());
    for (const dependency of node?.deps ?? []) {
      if (!dependency.dep_kinds.some(kind => kind.kind === null)) continue;
      const item = packages.get(dependency.pkg);
      if (!item || item.targets.some(target => target.kind.includes("proc-macro"))) continue;
      if (shipped.has(item.id)) continue;
      shipped.add(item.id);
      pending.push(item.id);
    }
  }
  const failures = [];
  const sections = [];
  for (const item of [...shipped].map(id => packages.get(id)).sort((left, right) => left.name.localeCompare(right.name) || left.version.localeCompare(right.version))) {
    const expression = item.license ?? null;
    if (!expression || !licenseAllowed(expression)) {
      failures.push(`${item.name} ${item.version}: license ${expression ?? "(none declared)"} is not allowlisted`);
      continue;
    }
    let files = await licenseFiles(item, readText);
    // Rationale: a few published crates omit their license file; a reviewed upstream text pinned by digest stands in.
    if (files.length === 0 && crateLicenseTexts[item.name]) files = await pinnedTexts(item.name, crateLicenseTexts[item.name], readText, failures);
    if (files.length === 0) {
      failures.push(`${item.name} ${item.version}: no license text in the locked source`);
      continue;
    }
    sections.push(section(`${item.name} ${item.version}`, expression, files));
  }
  for (const component of linkedComponents) {
    if (!licenseAllowed(component.license)) {
      failures.push(`${component.name}: license ${component.license} is not allowlisted`);
      continue;
    }
    const files = await pinnedTexts(component.name, component.licenseFiles, readText, failures);
    if (files.length === component.licenseFiles.length) sections.push(section(`${component.name} ${component.version}`, component.license, files));
  }
  if (failures.length > 0) throw new Error(`terminal host notices are incomplete:\n${failures.map(line => `- ${line}`).join("\n")}`);
  return [
    "Third-party notices for the A1 terminal host",
    "",
    "The terminal-host executable and its session-writer lock include the following components.",
    "",
    ...sections,
  ].join("\n");
}

export function licenseAllowed(expression) {
  const tokens = expression.replaceAll("/", " OR ").match(/\(|\)|[^\s()]+/g) ?? [];
  let position = 0;
  const peek = () => tokens[position];
  const parseFactor = () => {
    const token = tokens[position++];
    if (token === "(") {
      const value = parseOr();
      if (tokens[position++] !== ")") throw new Error(`unbalanced license expression: ${expression}`);
      return value;
    }
    if (token === undefined || token === ")" || ["AND", "OR", "WITH"].includes(token)) throw new Error(`malformed license expression: ${expression}`);
    if (peek() === "WITH") {
      position += 1;
      const exception = tokens[position++];
      return ALLOWED_LICENSES.includes(token) && ALLOWED_EXCEPTIONS.includes(exception ?? "");
    }
    return ALLOWED_LICENSES.includes(token);
  };
  const parseAnd = () => {
    let value = parseFactor();
    while (peek() === "AND") { position += 1; value = parseFactor() && value; }
    return value;
  };
  const parseOr = () => {
    let value = parseAnd();
    while (peek() === "OR") { position += 1; value = parseAnd() || value; }
    return value;
  };
  try {
    const value = parseOr();
    return position === tokens.length && value;
  } catch {
    return false;
  }
}

async function pinnedTexts(name, records, readText, failures) {
  const files = [];
  for (const file of records) {
    const text = await readText(file.path).catch(() => undefined);
    if (text === undefined) { failures.push(`${name}: license text ${file.path} is missing`); continue; }
    const digest = createHash("sha256").update(text.replaceAll("\r\n", "\n")).digest("hex");
    if (digest !== file.sha256) { failures.push(`${name}: license text ${file.path} does not match its recorded digest`); continue; }
    files.push({ name: file.path.split("/").at(-1), text });
  }
  return files;
}

async function licenseFiles(item, readText) {
  const directory = dirname(item.manifest_path);
  const names = new Set();
  if (item.license_file) names.add(item.license_file);
  for (const name of await readText.list(directory)) if (LICENSE_FILE.test(name)) names.add(name);
  const files = [];
  for (const name of [...names].sort()) {
    const text = await readText(resolve(directory, name)).catch(() => undefined);
    if (text !== undefined && text.trim() !== "") files.push({ name, text });
  }
  return files;
}

function section(title, license, files) {
  const rule = "=".repeat(78);
  return [rule, title, `License: ${license}`, rule, "", ...files.flatMap(file => [`--- ${file.name}`, "", file.text.trimEnd(), ""])].join("\n");
}

function command(executable, arguments_, options = {}) {
  const result = crossSpawn.sync(executable, arguments_, { encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${executable} ${arguments_.join(" ")} failed with ${result.status}: ${result.stderr}`);
  return result.stdout;
}

export function hostTriple(rustc = process.env.RUSTC ?? "rustc") {
  const triple = command(rustc, ["-vV"]).match(/^host:\s*(\S+)$/m)?.[1];
  if (!triple) throw new Error("rustc did not report its host triple");
  return triple;
}

/** Writes the notices beside the platform artifacts and returns the written path. */
export async function writeTerminalHostNotices({ repositoryRoot = process.cwd(), targetDirectory, triple = hostTriple() } = {}) {
  const manifest = resolve(repositoryRoot, "native/terminal-host/Cargo.toml");
  const metadata = JSON.parse(command(process.env.CARGO ?? "cargo", [
    "metadata", "--locked", "--format-version", "1", "--manifest-path", manifest, "--features", "node-addon", "--filter-platform", triple,
  ]));
  const provenance = JSON.parse(await readFile(resolve(repositoryRoot, "config/terminal-host-provenance.json"), "utf8"));
  const readText = path => readFile(resolve(repositoryRoot, path), "utf8");
  readText.list = async directory => (await readdir(directory, { withFileTypes: true })).filter(entry => entry.isFile()).map(entry => entry.name);
  const text = await renderTerminalHostNotices({ metadata, readText, linkedComponents: provenance.linkedComponents ?? [], crateLicenseTexts: provenance.crateLicenseTexts ?? {} });
  const output = resolve(targetDirectory, NOTICES_FILENAME);
  await writeFile(output, `${text.trimEnd()}\n`, "utf8");
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const targetDirectory = resolve(repositoryRoot, "dist/native", `${process.platform}-${process.arch}`);
  const output = await writeTerminalHostNotices({ repositoryRoot, targetDirectory });
  process.stdout.write(`${relative(repositoryRoot, output)}\n`);
}
