import { access, readFile, readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

const rootArgument = process.argv.indexOf("--root");
const root = resolve(rootArgument >= 0 ? process.argv[rootArgument + 1] : new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const errors = [];

const identity = await json("src/product-identity.json", "product identity");
const manifest = await json("package.json", "package manifest");
const lockfile = await json("package-lock.json", "package lockfile");

if (identity) {
  if (manifest) {
    if (manifest.name !== identity.packageName) fail("package.json name differs from product identity");
    const expectedBin = { [identity.commandName]: identity.artifacts?.cliEntry };
    if (JSON.stringify(manifest.bin) !== JSON.stringify(expectedBin)) fail("package.json bin differs from product identity");
  }
  const lockRoot = lockfile?.packages?.[""];
  if (lockfile?.name !== identity.packageName || lockRoot?.name !== identity.packageName) fail("package-lock.json name differs from product identity");
  if (JSON.stringify(lockRoot?.bin) !== JSON.stringify({ [identity.commandName]: identity.artifacts?.cliEntry })) {
    fail("package-lock.json bin differs from product identity");
  }

  await requiredFile(identity.artifacts?.cliEntry, "authoritative CLI entry");
  await checkWorkflows(identity);
  await checkNativeMetadata(identity);
  await checkSingleAuthority();
}

if (errors.length > 0) {
  process.stderr.write(`Product identity boundary check failed (${errors.length}):\n${errors.map(error => `- ${error}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Product identity boundaries OK\n");
}

async function checkWorkflows(identity) {
  for (const path of [".github/workflows/publish-next.yml", ".github/workflows/publish-stable.yml"]) {
    const source = await text(path, "publication workflow");
    if (source === null) continue;
    if (!source.includes("src/product-identity.json")) fail(`${path} does not consume the product identity authority`);
    if (source.includes(identity.packageName)) fail(`${path} duplicates the authoritative package name`);
    if (source.includes(identity.artifacts.cliEntry)) fail(`${path} duplicates the authoritative CLI entry`);
    if (!source.includes("identity.packageName") || !source.includes("identity.commandName") || !source.includes("identity.artifacts.cliEntry")) {
      fail(`${path} does not derive package and bin metadata from product identity`);
    }
  }
}

async function checkNativeMetadata(identity) {
  const cargo = await text("native/terminal-host/Cargo.toml", "native Cargo manifest");
  const lock = await text("native/terminal-host/Cargo.lock", "native Cargo lockfile");
  if (cargo !== null && !new RegExp(`^name\\s*=\\s*"${escapeRegExp(identity.artifacts.nativeCrate)}"`, "m").test(cargo)) {
    fail("native Cargo package name differs from product identity");
  }
  if (lock !== null && !new RegExp(`^name\\s*=\\s*"${escapeRegExp(identity.artifacts.nativeCrate)}"`, "m").test(lock)) {
    fail("native Cargo lockfile name differs from product identity");
  }
}

async function checkSingleAuthority() {
  const matches = [];
  await walk(resolve(root, "src"), matches);
  const normalized = matches.map(path => relative(root, path).split(sep).join("/")).sort();
  if (JSON.stringify(normalized) !== JSON.stringify(["src/product-identity.json"])) {
    fail(`expected one executable JSON identity authority, found: ${normalized.join(", ") || "none"}`);
  }
}

async function walk(directory, matches) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path, matches);
    else if (entry.isFile() && /(?:product|application|app)[-_]?identity\.json$/i.test(entry.name)) matches.push(path);
  }
}

async function requiredFile(path, name) {
  if (typeof path !== "string" || path.length === 0) {
    fail(`${name} is not declared`);
    return;
  }
  try {
    await access(resolve(root, path));
  } catch {
    fail(`${name} does not exist: ${path}`);
  }
}

async function json(path, name) {
  const source = await text(path, name);
  if (source === null) return null;
  try {
    return JSON.parse(source);
  } catch {
    fail(`${name} is not valid JSON: ${path}`);
    return null;
  }
}

async function text(path, name) {
  try {
    return await readFile(resolve(root, path), "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      fail(`${name} is missing: ${path}`);
      return null;
    }
    throw error;
  }
}

function fail(message) {
  errors.push(message);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
