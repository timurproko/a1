import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const script = resolve(fileURLToPath(new URL("../../scripts/check-deprecated-dependencies.mjs", import.meta.url)));
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("deprecated dependency release policy", () => {
  it("reports and rejects a deprecated direct dependency", async () => {
    const result = await runPolicy({
      "": { name: "fixture", version: "1.0.0", dependencies: { "old-direct": "1.0.0" } },
      "node_modules/old-direct": { version: "1.0.0", deprecated: "use maintained-direct instead" },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("old-direct@1.0.0");
    expect(result.stderr).toContain("fixture@1.0.0 -> old-direct@1.0.0");
  });

  it("reports and rejects a deprecated transitive dependency", async () => {
    const result = await runPolicy({
      "": { name: "fixture", version: "1.0.0", devDependencies: { parent: "1.0.0" } },
      "node_modules/parent": { version: "1.0.0", dependencies: { "old-transitive": "2.0.0" } },
      "node_modules/old-transitive": { version: "2.0.0", deprecated: "no longer maintained" },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("old-transitive@2.0.0");
    expect(result.stderr).toContain("fixture@1.0.0 -> parent@1.0.0 -> old-transitive@2.0.0");
  });

  it("allows only the documented exact Pi 0.84.2 transitive exceptions", async () => {
    const result = await runPolicy({
      "": { name: "fixture", version: "1.0.0", dependencies: { "@earendil-works/pi-coding-agent": "0.84.2" } },
      "node_modules/@earendil-works/pi-coding-agent": { version: "0.84.2", dependencies: { "@earendil-works/pi-ai": "0.84.2" } },
      "node_modules/@earendil-works/pi-ai": { version: "0.84.2", dependencies: { "@aws-sdk/client-bedrock-runtime": "3.1048.0", "google-auth-library": "10.6.2" } },
      "node_modules/@aws-sdk/client-bedrock-runtime": { version: "3.1048.0", dependencies: { "@aws-sdk/core": "3.974.11" } },
      "node_modules/@aws-sdk/core": { version: "3.974.11", deprecated: "Deprecated due to an error deserialization bug in JSON 1.0 protocol services" },
      "node_modules/google-auth-library": { version: "10.6.2", dependencies: { gaxios: "7.1.4" } },
      "node_modules/gaxios": { version: "7.1.4", dependencies: { "node-fetch": "3.3.2" } },
      "node_modules/node-fetch": { version: "3.3.2", dependencies: { "fetch-blob": "3.2.0" } },
      "node_modules/fetch-blob": { version: "3.2.0", dependencies: { "node-domexception": "1.0.0" } },
      "node_modules/node-domexception": { version: "1.0.0", deprecated: "Use your platform's native DOMException instead" },
    });
    expect(result.status).toBe(0);
  });

  it("does not generalize documented exceptions to other versions", async () => {
    const result = await runPolicy({
      "": { name: "fixture", version: "1.0.0", dependencies: { "@earendil-works/pi-coding-agent": "0.85.0" } },
      "node_modules/@earendil-works/pi-coding-agent": { version: "0.85.0", dependencies: { "node-domexception": "1.0.0" } },
      "node_modules/node-domexception": { version: "1.0.0", deprecated: "Use your platform's native DOMException instead" },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("node-domexception@1.0.0");
  });
});

async function runPolicy(packages: Record<string, unknown>) {
  const root = await mkdtemp(join(tmpdir(), "addone-dependency-policy-"));
  roots.push(root);
  const lockfile = join(root, "package-lock.json");
  await writeFile(lockfile, JSON.stringify({ name: "fixture", version: "1.0.0", lockfileVersion: 3, requires: true, packages }));
  return spawnSync(process.execPath, [script, "--offline", "--lockfile", lockfile], { encoding: "utf8" });
}
