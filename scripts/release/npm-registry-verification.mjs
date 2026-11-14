import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const REGISTRY = "https://registry.npmjs.org";
export const REGISTRY_VERIFICATION_ATTEMPTS = 180;
export const REGISTRY_VERIFICATION_INTERVAL_MS = 10_000;
export const REGISTRY_REQUEST_TIMEOUT_MS = 30_000;
export const REGISTRY_TARBALL_MAX_BYTES = 64 * 1024 * 1024;

function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} is required for npm registry verification`);
  return value;
}

function validatePackage(package_) {
  const name = requiredString(package_?.name, "package name");
  const integrity = requiredString(package_?.integrity, `${name} integrity`);
  const shasum = requiredString(package_?.shasum, `${name} shasum`);
  if (!integrity.startsWith("sha512-") || !/^[a-f0-9]{40}$/u.test(shasum)) throw new Error(`${name} has invalid expected registry digests`);
  return { name, integrity, shasum };
}

async function registryJson(fetch_, url, label, requestTimeoutMs) {
  const response = await fetch_(url, {
    headers: { "cache-control": "no-cache", accept: "application/json" },
    signal: AbortSignal.timeout(requestTimeoutMs),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  try { return await response.json(); }
  catch { throw new Error(`${label} returned invalid JSON`); }
}

/** Hash the actual install URL, not just the registry's promise of its contents. */
async function verifyTarball({ package_, manifest, fetch_, requestTimeoutMs, maxTarballBytes }) {
  const label = `${package_.name}@${manifest.version} tarball`;
  let url;
  try { url = new URL(manifest.dist.tarball); }
  catch { throw new Error(`${label} URL is invalid`); }
  if (url.origin !== REGISTRY || url.username || url.password || url.hash) throw new Error(`${label} URL is not a trusted registry URL`);
  const response = await fetch_(url.href, {
    headers: { "cache-control": "no-cache" },
    signal: AbortSignal.timeout(requestTimeoutMs),
    redirect: "error",
  });
  try {
    if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
    if (!response.body) throw new Error(`${label} has no response body`);
    if (Number(response.headers.get("content-length")) > maxTarballBytes) throw new Error(`${label} exceeds the byte limit`);
    const sha512 = createHash("sha512");
    const sha1 = createHash("sha1");
    let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.byteLength;
      if (bytes > maxTarballBytes) throw new Error(`${label} exceeds the byte limit`);
      sha512.update(chunk);
      sha1.update(chunk);
    }
    if (`sha512-${sha512.digest("base64")}` !== package_.integrity || sha1.digest("hex") !== package_.shasum) {
      throw new Error(`${label} downloaded bytes differ from the validated package`);
    }
  } finally {
    if (response.body && !response.body.locked) await response.body.cancel().catch(() => {});
  }
}

async function verifyPackage({ package_, version, channel, fetch_, nonce, requestTimeoutMs, maxTarballBytes, requireTag }) {
  const encodedName = encodeURIComponent(package_.name);
  const encodedVersion = encodeURIComponent(version);
  const manifest = await registryJson(fetch_, `${REGISTRY}/${encodedName}/${encodedVersion}?verify=${nonce}`, `${package_.name}@${version}`, requestTimeoutMs);
  if (manifest?.name !== package_.name || manifest?.version !== version) throw new Error(`${package_.name}@${version} registry identity differs from the validated package`);
  if (manifest?.dist?.integrity !== package_.integrity || manifest?.dist?.shasum !== package_.shasum) {
    throw new Error(`${package_.name}@${version} registry bytes differ from the validated package`);
  }
  if (requireTag) {
    const tags = await registryJson(fetch_, `${REGISTRY}/-/package/${encodedName}/dist-tags?verify=${nonce}`, `${package_.name} dist-tags`, requestTimeoutMs);
    if (tags?.[channel] !== version) throw new Error(`${package_.name} ${channel} tag differs from the published version`);
  }
  await verifyTarball({ package_, manifest, fetch_, requestTimeoutMs, maxTarballBytes });
}

/** Verify one exact npm package pair without depending on npm's independently cached full packument. */
export async function verifyPublishedPair({
  packages,
  version,
  channel,
  fetch: fetch_ = fetch,
  sleep = durationMs => new Promise(resolvePromise => setTimeout(resolvePromise, durationMs)),
  now = Date.now,
  report = message => console.log(message),
  attempts = REGISTRY_VERIFICATION_ATTEMPTS,
  intervalMs = REGISTRY_VERIFICATION_INTERVAL_MS,
  requestTimeoutMs = REGISTRY_REQUEST_TIMEOUT_MS,
  maxTarballBytes = REGISTRY_TARBALL_MAX_BYTES,
  requireTag = true,
}) {
  const exactVersion = requiredString(version, "release version");
  if (channel !== "latest" && channel !== "next") throw new Error(`unsupported npm publication channel: ${String(channel)}`);
  if (!Array.isArray(packages) || packages.length !== 2) throw new Error("npm registry verification requires the application and installer package pair");
  const pair = packages.map(validatePackage);
  if (new Set(pair.map(package_ => package_.name)).size !== pair.length) throw new Error("npm registry verification package identities must be distinct");
  if (!Number.isInteger(attempts) || attempts < 1 || !Number.isFinite(intervalMs) || intervalMs < 0) throw new Error("invalid npm registry verification polling bound");

  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1 || requestTimeoutMs > 2_147_483_647
    || !Number.isSafeInteger(maxTarballBytes) || maxTarballBytes < 1) throw new Error("invalid npm registry download bound");

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const nonce = `${now()}-${attempt}`;
      for (const package_ of pair) await verifyPackage({ package_, version: exactVersion, channel, fetch_, nonce, requestTimeoutMs, maxTarballBytes, requireTag });
      return { version: exactVersion, channel, packages: pair.map(package_ => package_.name) };
    } catch (error) {
      lastError = error;
      report(`attempt ${attempt}/${attempts}: ${error instanceof Error ? error.message : String(error)}`);
      if (attempt < attempts) await sleep(intervalMs);
    }
  }
  throw lastError;
}

async function main(environment = process.env) {
  const [application, installer] = await Promise.all([
    readFile("package.json", "utf8").then(JSON.parse),
    readFile("packages/a1-install/package.json", "utf8").then(JSON.parse),
  ]);
  const result = await verifyPublishedPair({
    packages: [
      { name: application.name, integrity: environment.EXPECTED_INTEGRITY, shasum: environment.EXPECTED_SHASUM },
      { name: installer.name, integrity: environment.EXPECTED_INSTALLER_INTEGRITY, shasum: environment.EXPECTED_INSTALLER_SHASUM },
    ],
    version: environment.RELEASE_VERSION,
    channel: environment.RELEASE_CHANNEL,
    requireTag: environment.VERIFY_PUBLIC_TAG !== "false",
  });
  process.stdout.write(`Verified ${result.packages.join(" and ")} at ${result.version} under npm ${result.channel}.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); }
  catch (error) {
    process.stderr.write(`::error::${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
