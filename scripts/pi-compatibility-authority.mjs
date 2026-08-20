import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const PI_COMPATIBILITY_PACKAGES = Object.freeze([
  "@earendil-works/pi-coding-agent",
  "@earendil-works/pi-tui",
]);

export async function readPiCompatibilityAuthority(root) {
  const repository = resolve(root);
  const [manifest, lockfile] = await Promise.all([
    readJson(resolve(repository, "package.json"), "package.json"),
    readJson(resolve(repository, "package-lock.json"), "package-lock.json"),
  ]);
  return resolvePiCompatibilityAuthority(manifest, lockfile);
}

export function resolvePiCompatibilityAuthority(manifest, lockfile) {
  const packages = PI_COMPATIBILITY_PACKAGES.map(name => {
    const requested = manifest?.dependencies?.[name];
    if (typeof requested !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(requested)) {
      throw new Error(`${name}: package.json must declare one exact semantic version`);
    }
    const lockRootRequest = lockfile?.packages?.[""]?.dependencies?.[name];
    if (lockRootRequest !== requested) {
      throw new Error(`${name}: package-lock.json root request ${String(lockRootRequest)} differs from package.json ${requested}`);
    }
    const lockPath = `node_modules/${name}`;
    const locked = lockfile?.packages?.[lockPath];
    if (!locked || locked.version !== requested) {
      throw new Error(`${name}: lockfile version ${String(locked?.version)} differs from exact request ${requested}`);
    }
    if (typeof locked.integrity !== "string" || !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(locked.integrity)) {
      throw new Error(`${name}: lockfile integrity is missing or malformed`);
    }
    if (typeof locked.resolved !== "string" || locked.resolved.length === 0) {
      throw new Error(`${name}: lockfile resolved artifact is missing`);
    }
    return Object.freeze({ name, requested, version: locked.version, integrity: locked.integrity, resolved: locked.resolved, lockPath });
  });
  return Object.freeze({
    schema: "a1-pi-compatibility-authority-v1",
    authorities: Object.freeze(["package.json", "package-lock.json"]),
    packages: Object.freeze(packages),
  });
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`${label} is unreadable or invalid: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}
