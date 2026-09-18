import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { getPackageDir } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import { readPinnedPiIdentity } from "../../../../scripts/governance/pinned-pi-identity.mjs";

const resources = [
  "src/integrations/pi/components/upstream/assets/earendil-image.json",
  "src/integrations/pi/engine/resources/changelog.json",
];
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

describe("owned command resource provenance", () => {
  it.each(resources)("preserves the exact pinned data and attribution in %s", async path => {
    const resource = JSON.parse(await readFile(path, "utf8"));
    const manifest = JSON.parse(await readFile(join(getPackageDir(), "package.json"), "utf8"));
    const identity = await readPinnedPiIdentity(".");
    expect(resource).toMatchObject({
      sourcePackage: manifest.name, sourceVersion: manifest.version, license: "MIT",
      upstreamRepository: "https://github.com/earendil-works/pi.git", upstreamCommit: identity.commit,
    });
    expect(["utf8", "base64"]).toContain(resource.encoding);
    expect(resource.sourcePath).toBe(path.includes("earendil-image") ? "dist/modes/interactive/assets/clankolas.png" : "CHANGELOG.md");
    const bytes = await readFile(join(getPackageDir(), resource.sourcePath));
    const owned = Buffer.from(resource.data, resource.encoding);
    expect(owned.length).toBe(bytes.length);
    expect(hash(owned)).toBe(hash(bytes));
    expect(resource.sourceSha256).toBe(hash(bytes));
    expect(resource.modifications).toContain("scripts/pi/update-command-resources.mjs");
  });

  it("verifies deterministic ingestion without rewriting source resources", async () => {
    const before = await Promise.all(resources.map(path => readFile(path)));
    await promisify(execFile)(process.execPath, [resolve("scripts/pi/update-command-resources.mjs"), "--check"], { timeout: 15_000 });
    expect((await Promise.all(resources.map(path => readFile(path)))).map(hash)).toEqual(before.map(hash));
  });
});
