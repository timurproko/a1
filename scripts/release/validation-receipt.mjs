import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { arch, platform } from "node:os";
import { dirname, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { readPackedEntries, readPackedManifest } from "../governance/candidate-evidence.mjs";

const exec = promisify(execFile);
const BUILD_INPUTS = ["package.json", "package-lock.json", "tsconfig.json", "tsconfig.build.json", "src", "bin", "native/process-guardian/Cargo.toml", "native/process-guardian/Cargo.lock", "native/process-guardian/src", "scripts/clean.mjs", "scripts/development/build-process-guardian.mjs", "scripts/release/generate-runtime-payload-inventory.mjs"];
const MAX_FILES = 4096;
const MAX_BYTES = 128 * 1024 * 1024;

export async function recordBuildReceipt(options = {}) {
  const repository = resolve(options.repository ?? process.cwd());
  const receipt = await buildReceipt(repository, options);
  if (options.output) await persist(options.output, receipt);
  return receipt;
}

export async function verifyBuildReceipt(path, options = {}) {
  const receipt = await readReceipt(path, "a1-validation-build-receipt-v1");
  const current = await buildReceipt(resolve(options.repository ?? process.cwd()), options);
  if (canonical(receipt) !== canonical(current)) throw new Error("validation build receipt or artifacts do not match current inputs");
  return receipt;
}

export async function recordPackageReceipt(candidatePath, options = {}) {
  const repository = resolve(options.repository ?? process.cwd());
  const receipt = await packageReceipt(repository, resolve(candidatePath), options);
  if (options.output) await persist(options.output, receipt);
  return receipt;
}

export async function verifyPackageReceipt(receiptPath, candidatePath, options = {}) {
  const receipt = await readReceipt(receiptPath, "a1-validation-package-receipt-v1");
  const current = await packageReceipt(resolve(options.repository ?? process.cwd()), resolve(candidatePath), options);
  if (canonical(receipt) !== canonical(current)) throw new Error("validation package receipt or candidate does not match current inputs");
  return receipt;
}

async function buildReceipt(repository, options) {
  const head = options.head ?? await gitHead(repository);
  if (!/^[0-9a-f]{40}$/u.test(head)) throw new Error("validation build receipt requires a full source head");
  const toolchain = options.toolchain ?? await currentToolchain(repository);
  if (!toolchain || typeof toolchain !== "object" || Array.isArray(toolchain)) throw new Error("validation build receipt requires toolchain identity");
  const inputs = await inventory(repository, BUILD_INPUTS);
  const artifacts = await inventory(repository, ["dist"]);
  const guardian = JSON.parse(await readFile(resolve(repository, "dist", "native", `${platform()}-${arch()}`, "manifest.json"), "utf8"));
  const executable = resolve(repository, "dist", "native", `${platform()}-${arch()}`, guardian.artifact?.filename ?? "missing");
  const bytes = await readFile(executable);
  if (createHash("sha256").update(bytes).digest("hex") !== guardian.artifact?.sha256 || bytes.length !== guardian.artifact?.size) throw new Error("built native artifact differs from its manifest");
  const payload = { schema: "a1-validation-build-receipt-v1", head, toolchain, inputs, artifacts,
    native: { schema: guardian.schema, protocolVersion: guardian.protocolVersion, crateVersion: guardian.crateVersion,
      platform: guardian.platform, architecture: guardian.architecture, filename: guardian.artifact.filename, sha256: guardian.artifact.sha256, size: guardian.artifact.size } };
  return { ...payload, receiptId: digest(payload) };
}

async function packageReceipt(repository, candidatePath, options) {
  const bytes = await readFile(candidatePath);
  const head = options.head ?? await gitHead(repository);
  if (!/^[0-9a-f]{40}$/u.test(head)) throw new Error("validation package receipt requires a full source head");
  const manifest = readPackedManifest(bytes);
  const entries = readPackedEntries(bytes);
  if (entries.length === 0 || entries.length > MAX_FILES) throw new Error("validation package entry count is invalid");
  const packageInventory = summarize(entries.map(entry => ({ path: entry.path, bytes: entry.content })));
  let sourceIdentity = null;
  if (options.sourceIdentity) {
    const identity = JSON.parse(await readFile(resolve(options.sourceIdentity), "utf8"));
    const sha512 = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
    const legacyDigest = createHash("sha1").update(bytes).digest("hex");
    if (identity.schema !== "a1-packed-candidate-v1" || identity.source?.commit !== head || identity.package?.integrity !== sha512
      || identity.package?.shasum !== legacyDigest || identity.package?.name !== manifest.name || identity.package?.version !== manifest.version) {
      throw new Error("published candidate identity does not match the current source and bytes");
    }
    sourceIdentity = { schema: identity.schema, commit: identity.source.commit, tree: identity.source.tree,
      integrity: identity.package.integrity, shasum: identity.package.shasum };
  }
  const buildReceiptId = options.buildReceipt ? (await verifyBuildReceipt(options.buildReceipt, { repository })).receiptId : null;
  const candidateRelativePath = relative(repository, candidatePath).split(sep).join("/");
  if (candidateRelativePath.startsWith("../") || candidateRelativePath.startsWith("/") || candidateRelativePath.includes("/../")) throw new Error("validation candidate must be inside the repository workspace");
  const payload = { schema: "a1-validation-package-receipt-v1", head,
    producer: options.producer ?? { platform: platform(), architecture: arch(), node: process.version }, buildReceiptId, sourceIdentity,
    candidate: { path: candidateRelativePath, sha256: createHash("sha256").update(bytes).digest("hex"), size: bytes.length,
      name: manifest.name, version: manifest.version, bin: manifest.bin ?? null, entries: packageInventory } };
  return { ...payload, receiptId: digest(payload) };
}

async function inventory(repository, roots) {
  const files = [];
  for (const root of roots) await visit(resolve(repository, root));
  files.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return summarize(files);

  async function visit(path) {
    const metadata = await lstat(path);
    if (metadata.isSymbolicLink()) throw new Error("validation receipt does not accept symbolic links");
    if (metadata.isDirectory()) {
      for (const entry of await readdir(path)) await visit(resolve(path, entry));
      return;
    }
    if (!metadata.isFile()) throw new Error("validation receipt accepts regular files only");
    if (files.length >= MAX_FILES || metadata.size > MAX_BYTES) throw new Error("validation receipt inventory exceeds bounds");
    files.push({ path: relative(repository, path).split(sep).join("/"), bytes: await readFile(path) });
  }
}

function summarize(files) {
  let bytes = 0;
  const entries = files.map(file => {
    bytes += file.bytes.length;
    if (bytes > MAX_BYTES) throw new Error("validation receipt bytes exceed bounds");
    return { path: file.path, size: file.bytes.length, sha256: createHash("sha256").update(file.bytes).digest("hex") };
  });
  const identity = digest(entries);
  return { files: entries.length, bytes, sha256: identity, entries };
}

async function currentToolchain(repository) {
  const manifest = JSON.parse(await readFile(resolve(repository, "package.json"), "utf8"));
  return { platform: platform(), architecture: arch(), node: process.version, modules: process.versions.modules,
    packageManager: manifest.packageManager, typescript: manifest.devDependencies?.typescript,
    cargo: await version("cargo"), rustc: await version("rustc") };
}
async function version(command) {
  try { return (await exec(command, ["--version"], { encoding: "utf8", windowsHide: true, timeout: 10000 })).stdout.trim(); }
  catch { throw new Error("validation build toolchain is unavailable"); }
}
async function gitHead(repository) {
  const head = (await exec("git", ["rev-parse", "HEAD^{commit}"], { cwd: repository, encoding: "utf8", windowsHide: true })).stdout.trim();
  if (!/^[0-9a-f]{40}$/u.test(head)) throw new Error("validation receipt cannot establish source head");
  return head;
}
async function readReceipt(path, schema) {
  const value = JSON.parse(await readFile(resolve(path), "utf8"));
  if (!value || value.schema !== schema || typeof value.receiptId !== "string") throw new Error("validation prerequisite receipt is malformed");
  const { receiptId, ...payload } = value;
  if (receiptId !== digest(payload)) throw new Error("validation prerequisite receipt identity is invalid");
  return value;
}
async function persist(path, receipt) {
  const output = resolve(path);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function digest(value) { return createHash("sha256").update(canonical(value)).digest("hex"); }
