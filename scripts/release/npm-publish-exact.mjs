import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { readPackedManifest } from "../governance/candidate-evidence.mjs";

const REGISTRY = "https://registry.npmjs.org";
const MAX_CAPTURE_BYTES = 1024 * 1024;
/** Maximum trusted-publishing invocations for one exact tarball. */
export const NPM_PUBLISH_ATTEMPTS = 2;
/** Delay before the final registry reconciliation and retry. */
export const NPM_PUBLISH_RETRY_DELAY_MS = 5_000;

function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} is required for exact npm publication`);
  return value;
}

function validateIdentity({ name, version, integrity, shasum, channel }) {
  const identity = {
    name: requiredString(name, "package name"),
    version: requiredString(version, "package version"),
    integrity: requiredString(integrity, "package integrity"),
    shasum: requiredString(shasum, "package shasum"),
    channel: requiredString(channel, "publication channel"),
  };
  if (!identity.name.startsWith("@") || identity.name.includes("\n")) throw new Error("exact npm publication requires a scoped package name");
  if (!/^[0-9A-Za-z][0-9A-Za-z.+-]{0,127}$/u.test(identity.version)) throw new Error("exact npm publication received an invalid package version");
  if (!identity.integrity.startsWith("sha512-") || !/^[a-f0-9]{40}$/u.test(identity.shasum)) throw new Error("exact npm publication received invalid package digests");
  if (identity.channel !== "next" && identity.channel !== "latest") throw new Error(`unsupported npm publication channel: ${identity.channel}`);
  return identity;
}

/** Build the invariant npm upload arguments used by every recovery attempt. */
export function npmPublishArguments(tarball, channel) {
  return [tarball, "--tag", channel, "--access", "public", "--ignore-scripts", "--provenance", "--registry", `${REGISTRY}/`];
}

function appendBounded(current, chunk) {
  const combined = current + chunk;
  return combined.length <= MAX_CAPTURE_BYTES ? combined : combined.slice(-MAX_CAPTURE_BYTES);
}

/** Invoke npm once while forwarding its output and retaining a bounded diagnostic tail. */
export async function invokeNpmPublish({ tarball, channel, environment = process.env, spawn: spawn_ = spawn, stdout = process.stdout, stderr = process.stderr }) {
  const executable = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn_(executable, ["publish", ...npmPublishArguments(tarball, channel)], {
    env: environment, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  let output = "";
  child.stdout?.on("data", chunk => {
    const text = chunk.toString();
    output = appendBounded(output, text);
    stdout.write(chunk);
  });
  child.stderr?.on("data", chunk => {
    const text = chunk.toString();
    output = appendBounded(output, text);
    stderr.write(chunk);
  });
  return await new Promise((resolvePromise, rejectPromise) => {
    child.once("error", rejectPromise);
    child.once("close", (code, signal) => resolvePromise({ code: code ?? 1, signal, output }));
  });
}

/** Identify only npm's equivalent-entry Sigstore transparency-log failure. */
export function isDuplicateTransparencyLogFailure(output) {
  const text = String(output);
  return text.includes("TLOG_CREATE_ENTRY_ERROR") && /equivalent entry already exists/iu.test(text);
}

async function reconcileRegistry({ identity, fetch: fetch_, nonce }) {
  const url = `${REGISTRY}/${encodeURIComponent(identity.name)}/${encodeURIComponent(identity.version)}?publish-recovery=${nonce}`;
  const response = await fetch_(url, { headers: { "cache-control": "no-cache", accept: "application/json" } });
  if (response.status === 404) return "absent";
  if (!response.ok) throw new Error(`${identity.name}@${identity.version} recovery check returned HTTP ${response.status}`);
  let manifest;
  try { manifest = await response.json(); }
  catch { throw new Error(`${identity.name}@${identity.version} recovery check returned invalid JSON`); }
  if (manifest?.name !== identity.name || manifest?.version !== identity.version) {
    throw new Error(`${identity.name}@${identity.version} registry identity differs from the validated package`);
  }
  if (manifest?.dist?.integrity !== identity.integrity || manifest?.dist?.shasum !== identity.shasum) {
    throw new Error(`${identity.name}@${identity.version} registry bytes differ from the validated package`);
  }
  return "exact";
}

/** Publish one validated tarball, retrying only npm's duplicate Sigstore transparency-log failure. */
export async function publishExactPackage({
  tarball,
  name,
  version,
  channel,
  integrity,
  shasum,
  publish = invokeNpmPublish,
  fetch: fetch_ = fetch,
  sleep = durationMs => new Promise(resolvePromise => setTimeout(resolvePromise, durationMs)),
  report = message => console.log(message),
  now = Date.now,
  attempts = NPM_PUBLISH_ATTEMPTS,
  retryDelayMs = NPM_PUBLISH_RETRY_DELAY_MS,
}) {
  const exactTarball = requiredString(tarball, "package tarball");
  const identity = validateIdentity({ name, version, channel, integrity, shasum });
  if (!Number.isInteger(attempts) || attempts < 1 || !Number.isFinite(retryDelayMs) || retryDelayMs < 0) {
    throw new Error("invalid exact npm publication retry bound");
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await publish({ tarball: exactTarball, channel: identity.channel });
    if (result?.code === 0) return { status: "published", attempts: attempt, ...identity };
    const output = String(result?.output ?? "");
    if (!isDuplicateTransparencyLogFailure(output)) {
      throw new Error(`npm publish failed for ${identity.name}@${identity.version} with exit ${String(result?.code ?? "unknown")}`);
    }
    const registry = await reconcileRegistry({ identity, fetch: fetch_, nonce: `${now()}-${attempt}` });
    if (registry === "exact") {
      report(`${identity.name}@${identity.version} already serves the validated bytes after npm's duplicate transparency-log response.`);
      return { status: "existing", attempts: attempt, ...identity };
    }
    if (attempt === attempts) throw new Error(`npm duplicate transparency-log recovery exhausted for ${identity.name}@${identity.version} after ${attempts} attempts`);
    report(`npm reported a duplicate transparency-log entry for ${identity.name}@${identity.version}; registry is still absent, retrying attempt ${attempt + 1}/${attempts}.`);
    await sleep(retryDelayMs);
    const beforeRetry = await reconcileRegistry({ identity, fetch: fetch_, nonce: `${now()}-${attempt}-retry` });
    if (beforeRetry === "exact") {
      report(`${identity.name}@${identity.version} became visible with the validated bytes before the retry.`);
      return { status: "existing", attempts: attempt, ...identity };
    }
  }
  throw new Error(`npm publication did not complete for ${identity.name}@${identity.version}`);
}

function argumentValue(arguments_, name) {
  const index = arguments_.indexOf(name);
  if (index < 0 || index + 1 >= arguments_.length) throw new Error(`${name} is required`);
  return arguments_[index + 1];
}

async function main(arguments_ = process.argv.slice(2)) {
  const tarball = argumentValue(arguments_, "--tarball");
  const bytes = await readFile(tarball);
  const manifest = readPackedManifest(bytes);
  const integrity = argumentValue(arguments_, "--integrity");
  const shasum = argumentValue(arguments_, "--shasum");
  if (`sha512-${createHash("sha512").update(bytes).digest("base64")}` !== integrity
    || createHash("sha1").update(bytes).digest("hex") !== shasum) {
    throw new Error("exact npm publication tarball differs from the validated package identity");
  }
  const result = await publishExactPackage({
    tarball,
    name: manifest?.name,
    version: manifest?.version,
    channel: argumentValue(arguments_, "--channel"),
    integrity,
    shasum,
  });
  process.stdout.write(`${result.name}@${result.version} publication ${result.status} after ${result.attempts} attempt${result.attempts === 1 ? "" : "s"}.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); }
  catch (error) {
    process.stderr.write(`::error::${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
