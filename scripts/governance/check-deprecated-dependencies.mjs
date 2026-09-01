import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REGISTRY = "https://registry.npmjs.org";
const identity = JSON.parse(await readFile(new URL("../../src/product-identity.json", import.meta.url), "utf8"));

// Compatibility: Pi 0.84.x carries these deprecated transitive packages through its public SDK
// dependency graph. They are accepted only on those exact versions and paths;
// any A1 update must re-evaluate them instead of broadening the exception.
const DOCUMENTED_DEPRECATED_EXCEPTIONS = [
  {
    name: "node-domexception",
    version: "1.0.0",
    upstream: "@earendil-works/pi-coding-agent@0.84.2",
    reasonIncludes: "native DOMException",
  },
  {
    name: "@aws-sdk/core",
    version: "3.974.11",
    upstream: "@earendil-works/pi-coding-agent@0.84.2",
    reasonIncludes: "error deserialization",
  },
];

export async function inspectDependencies({ lockfilePath, queryRegistry = true, fetchImplementation = fetch }) {
  const lockfile = JSON.parse(await readFile(lockfilePath, "utf8"));
  if (lockfile.lockfileVersion !== 3 || typeof lockfile.packages !== "object" || lockfile.packages === null) {
    throw new Error("dependency policy requires an npm lockfile v3 with a packages map");
  }

  const records = Object.entries(lockfile.packages).map(([lockPath, value]) => {
    const entry = value ?? {};
    return {
      lockPath,
      entry,
      name: lockPath === "" ? entry.name : packageNameFromLockPath(lockPath, entry.name),
      version: entry.version,
    };
  });
  const byPath = new Map(records.map(record => [record.lockPath, record]));
  const paths = dependencyPaths(byPath);
  const deprecated = new Map();

  for (const record of records) {
    if (record.lockPath && typeof record.entry.deprecated === "string" && record.entry.deprecated.trim()) {
      deprecated.set(record.lockPath, { record, reason: record.entry.deprecated.trim(), source: "lockfile" });
    }
  }

  if (queryRegistry) {
    const candidates = records.filter(record => record.lockPath && record.name && record.version && !record.entry.link);
    await concurrentMap(candidates, 12, async record => {
      const url = `${REGISTRY}/${encodeURIComponent(record.name)}/${encodeURIComponent(record.version)}`;
      const response = await fetchImplementation(url, {
        headers: { accept: "application/json", "user-agent": `${identity.filesystem.slug}-dependency-policy/1` },
      });
      if (!response.ok) throw new Error(`registry metadata request failed for ${record.name}@${record.version}: HTTP ${response.status}`);
      const metadata = await response.json();
      if (typeof metadata.deprecated === "string" && metadata.deprecated.trim()) {
        deprecated.set(record.lockPath, { record, reason: metadata.deprecated.trim(), source: "registry" });
      }
    });
  }

  return [...deprecated.values()]
    .map(item => ({
      name: item.record.name,
      version: item.record.version,
      reason: item.reason,
      source: item.source,
      lockPath: item.record.lockPath,
      dependencyPath: paths.get(item.record.lockPath) ?? [item.record.name ?? item.record.lockPath],
    }))
    .filter(item => !isDocumentedDeprecatedException(item));
}

export function formatViolation(violation) {
  return `${violation.name}@${violation.version} [${violation.source}]\n    path: ${violation.dependencyPath.join(" -> ")}\n    reason: ${violation.reason}`;
}

function isDocumentedDeprecatedException(violation) {
  return DOCUMENTED_DEPRECATED_EXCEPTIONS.some(exception =>
    violation.name === exception.name
    && violation.version === exception.version
    && violation.reason.includes(exception.reasonIncludes)
    && violation.dependencyPath.some(step => step.startsWith(exception.upstream))
  );
}

function packageNameFromLockPath(lockPath, declaredName) {
  if (typeof declaredName === "string" && declaredName) return declaredName;
  const marker = "node_modules/";
  const suffix = lockPath.slice(lockPath.lastIndexOf(marker) + marker.length);
  const parts = suffix.split("/");
  return suffix.startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
}

function dependencyPaths(byPath) {
  const root = byPath.get("");
  const rootLabel = `${root?.name ?? "<root>"}@${root?.version ?? "unknown"}`;
  const paths = new Map([["", [rootLabel]]]);
  const queue = [""];
  while (queue.length) {
    const parentPath = queue.shift();
    const parent = byPath.get(parentPath);
    if (!parent) continue;
    for (const dependency of dependencyNames(parent.entry)) {
      const childPath = resolveDependencyPath(byPath, parentPath, dependency);
      if (childPath === null || paths.has(childPath)) continue;
      const child = byPath.get(childPath);
      paths.set(childPath, [...(paths.get(parentPath) ?? [rootLabel]), `${child?.name ?? dependency}@${child?.version ?? "unknown"}`]);
      queue.push(childPath);
    }
  }
  return paths;
}

function dependencyNames(entry) {
  return new Set([
    ...Object.keys(entry.dependencies ?? {}),
    ...Object.keys(entry.devDependencies ?? {}),
    ...Object.keys(entry.optionalDependencies ?? {}),
    ...Object.keys(entry.peerDependencies ?? {}),
  ]);
}

function resolveDependencyPath(byPath, parentPath, dependency) {
  let current = parentPath;
  while (true) {
    const candidate = current ? `${current}/node_modules/${dependency}` : `node_modules/${dependency}`;
    if (byPath.has(candidate)) return candidate;
    if (!current) return null;
    const nested = current.lastIndexOf("/node_modules/");
    current = nested >= 0 ? current.slice(0, nested) : "";
  }
}

async function concurrentMap(values, concurrency, operation) {
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (next < values.length) {
      const index = next++;
      await operation(values[index]);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const arguments_ = process.argv.slice(2);
  const lockfileArgument = arguments_.indexOf("--lockfile");
  const lockfilePath = resolve(lockfileArgument >= 0 ? arguments_[lockfileArgument + 1] : "package-lock.json");
  const queryRegistry = !arguments_.includes("--offline");
  const violations = await inspectDependencies({ lockfilePath, queryRegistry });
  if (violations.length) {
    console.error(`Deprecated dependency policy failed (${violations.length}):\n${violations.map(formatViolation).map(line => `- ${line}`).join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(`Deprecated dependency policy OK (${queryRegistry ? "lockfile + registry" : "lockfile"})`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
