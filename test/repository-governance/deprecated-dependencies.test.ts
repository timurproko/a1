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

  it("passes a lockfile with no deprecation metadata", async () => {
    const result = await runPolicy({
      "": { name: "fixture", version: "1.0.0", optionalDependencies: { current: "1.0.0" } },
      "node_modules/current": { version: "1.0.0" },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Deprecated dependency policy OK");
  });
});

async function runPolicy(packages: Record<string, unknown>) {
  const root = await mkdtemp(join(tmpdir(), "addone-dependency-policy-"));
  roots.push(root);
  const lockfile = join(root, "package-lock.json");
  await writeFile(lockfile, JSON.stringify({ name: "fixture", version: "1.0.0", lockfileVersion: 3, requires: true, packages }));
  return spawnSync(process.execPath, [script, "--offline", "--lockfile", lockfile], { encoding: "utf8" });
}
