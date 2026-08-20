import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const LEGACY_IDENTITY_CLASSES = Object.freeze([
  "runtime-symbols",
  "diagnostics",
  "environment-keys",
  "paths",
  "schemas",
  "artifacts",
  "native-names",
  "tests",
  "current-docs-specs",
  "historical-records",
  "explicit-obsolete-package-fixtures",
]);

const INVENTORY_PATH = "openspec/changes/centralize-a1-product-identity/evidence/legacy-identity-inventory.json";
const ROOT_FILES = Object.freeze(["package.json", "package-lock.json", "README.md"]);
const ROOT_DIRECTORIES = Object.freeze(["src", "bin", "scripts", "test", "native", ".github", "docs", "openspec/specs", "openspec/changes"]);
const EXCLUDED_DIRECTORY_NAMES = new Set(["node_modules", "dist", "target", "vendor"]);
const TEXT_EXTENSIONS = new Set([".json", ".md", ".mjs", ".cjs", ".mts", ".js", ".ts", ".tsx", ".yaml", ".yml", ".toml", ".lock", ".rs", ".txt"]);
const LEGACY_TOKEN = ["add", "one"].join("");
const LEGACY_PATTERN = new RegExp(LEGACY_TOKEN, "gi");

export async function listIdentitySurfaceFiles(root) {
  const absoluteRoot = resolve(root);
  const files = [];
  for (const path of ROOT_FILES) await addFile(resolve(absoluteRoot, path), files);
  for (const path of ROOT_DIRECTORIES) await walk(resolve(absoluteRoot, path), absoluteRoot, files);
  return [...new Set(files)].sort();
}

export async function scanLegacyIdentity(root) {
  const absoluteRoot = resolve(root);
  const occurrences = [];
  for (const absolutePath of await listIdentitySurfaceFiles(absoluteRoot)) {
    const path = normalize(relative(absoluteRoot, absolutePath));
    if (path === INVENTORY_PATH || isExcludedPath(path)) continue;

    for (const match of path.matchAll(LEGACY_PATTERN)) {
      occurrences.push(createOccurrence({
        path,
        locationKind: "path",
        line: null,
        column: (match.index ?? 0) + 1,
        value: match[0],
        context: path,
      }));
    }

    let source;
    try {
      source = await readFile(absolutePath, "utf8");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
    if (source.includes("\0")) continue;

    const lineStarts = [0];
    for (let index = source.indexOf("\n"); index >= 0; index = source.indexOf("\n", index + 1)) lineStarts.push(index + 1);
    for (const match of source.matchAll(LEGACY_PATTERN)) {
      const offset = match.index ?? 0;
      const lineIndex = lineIndexAt(lineStarts, offset);
      const lineStart = lineStarts[lineIndex] ?? 0;
      const lineEnd = source.indexOf("\n", offset);
      const rawContext = source.slice(lineStart, lineEnd < 0 ? source.length : lineEnd).replace(/\r$/, "");
      occurrences.push(createOccurrence({
        path,
        locationKind: "content",
        line: lineIndex + 1,
        column: offset - lineStart + 1,
        value: match[0],
        context: clip(rawContext),
      }));
    }
  }

  occurrences.sort(compareOccurrences);
  return {
    schema: "a1-legacy-identity-inventory-v1",
    scan: {
      roots: [...ROOT_FILES, ...ROOT_DIRECTORIES],
      excludedDirectoryNames: [...EXCLUDED_DIRECTORY_NAMES].sort(),
      excludedPaths: ["openspec/changes/archive", INVENTORY_PATH],
      matching: `case-insensitive substring ${LEGACY_TOKEN}, including path and content occurrences`,
    },
    classes: [...LEGACY_IDENTITY_CLASSES],
    summary: summarize(occurrences),
    occurrences,
  };
}

export async function writeLegacyIdentityInventory(root) {
  const inventory = await scanLegacyIdentity(root);
  const output = resolve(root, INVENTORY_PATH);
  await import("node:fs/promises").then(({ mkdir }) => mkdir(dirname(output), { recursive: true }));
  await writeFile(output, `${JSON.stringify({ ...inventory, generatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
  return inventory;
}

function createOccurrence(input) {
  const classes = classify(input);
  return {
    id: input.locationKind === "path"
      ? `${input.path}#path:${input.column}`
      : `${input.path}:${input.line}:${input.column}`,
    ...input,
    matchedCase: input.value === input.value.toUpperCase()
      ? "upper"
      : input.value === input.value.toLowerCase()
        ? "lower"
        : "title-or-mixed",
    primaryClass: classes[0],
    classes,
  };
}

function classify({ path, locationKind, value, context }) {
  const classes = new Set();
  const lowerPath = path.toLowerCase();
  const lowerContext = context.toLowerCase();
  const isCode = /\.(?:[cm]?[jt]sx?|rs)$/.test(lowerPath) || lowerPath.startsWith("bin/") || lowerPath.startsWith(".github/");

  if (lowerPath.includes("/evidence/") || lowerPath.startsWith("artifacts/")) classes.add("historical-records");
  if ((lowerContext.includes(`@timurproko/${LEGACY_TOKEN}`) || lowerPath.includes("republish-as-a1"))
    && /obsolete|reject|deprecat|unpublish|historical|unsupported/.test(lowerContext)) classes.add("explicit-obsolete-package-fixtures");
  if (value === value.toUpperCase() && new RegExp(`${LEGACY_TOKEN}_[a-z0-9_]+`, "i").test(context)) classes.add("environment-keys");
  if (/schema|protocol|frame|namespace|codec|message type|storage version/.test(lowerContext)) classes.add("schemas");
  if (/diagnostic|error|failed|failure|could not|cannot|invalid|unexpected|usage|message|report/.test(lowerContext)) classes.add("diagnostics");
  if (lowerPath.startsWith("native/") || /crate|cargo|rust|native host|terminal-host/.test(lowerContext)) classes.add("native-names");
  if (lowerPath.startsWith("test/") || /(?:^|\/)fixtures?(?:\/|$)/.test(lowerPath)) classes.add("tests");
  if (lowerPath === "readme.md" || lowerPath.startsWith("docs/") || lowerPath.startsWith("openspec/specs/")
    || (lowerPath.startsWith("openspec/changes/") && /\.(?:md|ya?ml|json)$/.test(lowerPath))) classes.add("current-docs-specs");
  if (locationKind === "path" || /artifact|executable|binary|\bbin\b|tarball|manifest|filename|file name|crate/.test(lowerContext)) classes.add("artifacts");
  if (/path|director|folder|socket|pipe|endpoint|temp|runtime root|data root|config root/.test(lowerContext)
    || new RegExp(`[\\\\/].*${LEGACY_TOKEN}|${LEGACY_TOKEN}.*[\\\\/]`).test(lowerContext)) classes.add("paths");
  if (isCode && !classes.has("historical-records")) classes.add("runtime-symbols");
  if (classes.size === 0) classes.add("runtime-symbols");

  return LEGACY_IDENTITY_CLASSES.filter(category => classes.has(category));
}

function summarize(occurrences) {
  const byClass = Object.fromEntries(LEGACY_IDENTITY_CLASSES.map(category => [category, 0]));
  const byLocationKind = { content: 0, path: 0 };
  const files = new Set();
  for (const occurrence of occurrences) {
    files.add(occurrence.path);
    byLocationKind[occurrence.locationKind] += 1;
    for (const category of occurrence.classes) byClass[category] += 1;
  }
  return { total: occurrences.length, files: files.size, byLocationKind, byClass };
}

function lineIndexAt(lineStarts, offset) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if ((lineStarts[middle] ?? 0) <= offset) low = middle + 1;
    else high = middle - 1;
  }
  return Math.max(0, high);
}

function compareOccurrences(left, right) {
  return left.path.localeCompare(right.path)
    || (left.locationKind === right.locationKind ? 0 : left.locationKind === "path" ? -1 : 1)
    || (left.line ?? 0) - (right.line ?? 0)
    || left.column - right.column;
}

function clip(value) {
  const trimmed = value.trim();
  return trimmed.length <= 240 ? trimmed : `${trimmed.slice(0, 237)}...`;
}

function normalize(path) {
  return path.split(sep).join("/");
}

function isExcludedPath(path) {
  return path.startsWith("openspec/changes/archive/")
    || path.split("/").some(segment => EXCLUDED_DIRECTORY_NAMES.has(segment));
}

async function addFile(path, files) {
  try {
    const metadata = await import("node:fs/promises").then(({ stat }) => stat(path));
    if (metadata.isFile() && TEXT_EXTENSIONS.has(extname(path).toLowerCase())) files.push(path);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
}

async function walk(directory, root, files) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    const relativePath = normalize(relative(root, path));
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRECTORY_NAMES.has(entry.name) || relativePath === "openspec/changes/archive") continue;
      await walk(path, root, files);
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(path);
    }
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const rootArgument = process.argv.indexOf("--root");
  const root = resolve(rootArgument >= 0 ? process.argv[rootArgument + 1] : new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
  if (process.argv.includes("--write")) {
    const inventory = await writeLegacyIdentityInventory(root);
    process.stdout.write(`Wrote ${inventory.summary.total} legacy identity occurrences across ${inventory.summary.files} files.\n`);
  } else {
    const inventory = await scanLegacyIdentity(root);
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
  }
}
