import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { verifyPublishedPair } from "./npm-registry-verification.mjs";
import { proveTrustedPublishing } from "./npm-trust-preflight.mjs";

const REGISTRY = "https://registry.npmjs.org";

/** Promote only exercised immutable bytes; a partial tag update is safely reconcilable. */
export async function promotePublishedPair({ packages, version, channel, smokeResult, environment = process.env, fetch: fetch_ = fetch, verify = verifyPublishedPair }) {
  if (smokeResult !== "success") throw new Error("all native published-pair smoke lanes must succeed before promotion");
  await verify({ packages, version, channel, fetch: fetch_, requireTag: false });
  const tags = new Map();
  for (const package_ of packages) {
    const response = await fetch_(`${REGISTRY}/-/package/${encodeURIComponent(package_.name)}/dist-tags`, {
      headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(30_000), redirect: "error",
    });
    if (!response.ok) throw new Error(`${package_.name} dist-tags returned HTTP ${response.status}`);
    const current = (await response.json())?.[channel];
    if (current && current !== version && !isNewerVersion(version, current)) throw new Error(`${package_.name} promotion would replace a newer or unrecognized ${channel} version`);
    tags.set(package_.name, current);
  }
  const tokens = new Map();
  await proveTrustedPublishing({ packages: packages.map(package_ => package_.name), env: environment, fetch: fetch_,
    consumeToken: async (name, token) => { tokens.set(name, token); },
  });
  // Installer first: the user-facing application channel moves only after its bootstrap tag.
  for (const package_ of [...packages].reverse()) {
    if (tags.get(package_.name) === version) continue;
    const response = await fetch_(`${REGISTRY}/-/package/${encodeURIComponent(package_.name)}/dist-tags/${channel}`, {
      method: "PUT", headers: { authorization: `Bearer ${tokens.get(package_.name)}`, "content-type": "application/json" },
      body: JSON.stringify(version), signal: AbortSignal.timeout(30_000), redirect: "error",
    });
    if (!response.ok) throw new Error(`${package_.name} ${channel} promotion returned HTTP ${response.status}; enable Allow npm dist-tag on this workflow's trusted publisher if permission was refused`);
  }
  await verify({ packages, version, channel, fetch: fetch_, requireTag: true });
}

function isNewerVersion(candidate, current) {
  const parts = value => /^(\d+)\.(\d+)\.(\d+)(?:-dev\.([1-9]\d*))?$/u.exec(value)?.slice(1).map((part, index) => index === 3 && part === undefined ? Infinity : Number(part));
  const left = parts(candidate), right = parts(current);
  if (!left || !right) return false;
  for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) return left[index] > right[index];
  return false;
}

async function main(environment = process.env) {
  const [application, installer] = await Promise.all(["package.json", "packages/a1-install/package.json"].map(async path => JSON.parse(await readFile(path, "utf8"))));
  await promotePublishedPair({
    packages: [
      { name: application.name, integrity: environment.EXPECTED_INTEGRITY, shasum: environment.EXPECTED_SHASUM },
      { name: installer.name, integrity: environment.EXPECTED_INSTALLER_INTEGRITY, shasum: environment.EXPECTED_INSTALLER_SHASUM },
    ],
    version: environment.RELEASE_VERSION, channel: environment.RELEASE_CHANNEL,
    smokeResult: environment.PUBLISHED_PAIR_RESULT, environment,
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); }
  catch (error) { process.stderr.write(`::error::${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
