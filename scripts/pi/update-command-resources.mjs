import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const packageName = "@earendil-works/pi-coding-agent";
const packageRoot = dirname(dirname(fileURLToPath(import.meta.resolve(packageName))));
const ledger = JSON.parse(await readFile(join(repository, "config/baselines/pinned-pi-source-port-ledger.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
assert.equal(manifest.version, ledger.upstream.packages.find(entry => entry.name === packageName)?.version);
assert.equal(manifest.license, "MIT");
const resources = [
  { source: "dist/modes/interactive/assets/clankolas.png", target: "src/integrations/pi/components/upstream/assets/earendil-image.json", encoding: "base64" },
  { source: "CHANGELOG.md", target: "src/integrations/pi/engine/resources/changelog.json", encoding: "utf8" },
];
for (const resource of resources) {
  const bytes = await readFile(join(packageRoot, resource.source));
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
  if (resource.encoding === "base64") {
    const authority = ledger.records.find(entry => entry.upstreamPath.endsWith("/assets/clankolas.png"));
    assert.equal(sourceSha256, authority.sha256);
    assert.equal(bytes.length, authority.bytes);
  }
  // Provenance: package reads happen only in this maintenance tool, never during launch.
  const output = {
    sourcePackage: packageName, sourceVersion: manifest.version, upstreamRepository: ledger.upstream.repository, upstreamCommit: ledger.upstream.commit,
    sourcePath: resource.source, sourceSha256, license: "MIT", encoding: resource.encoding,
    modifications: "Lossless encoding of unchanged published data for lazy loading from an owned resource; regenerate with scripts/pi/update-command-resources.mjs",
    data: bytes.toString(resource.encoding),
  };
  const target = join(repository, resource.target);
  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  if (process.argv.includes("--check")) assert.equal(await readFile(target, "utf8"), serialized, `Stale owned resource: ${resource.target}`);
  else {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, serialized);
  }
  console.log(`${resource.target}: ${bytes.length} source bytes, ${sourceSha256}`);
}
