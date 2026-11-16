import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readPackedEntries, readPackedManifest } from "../../scripts/governance/candidate-evidence.mjs";

const roots: string[] = [];
const version = "0.2.7-dev.1";
const prepareScript = resolve("scripts/release/prepare-installer-package.mjs");
const validateScript = resolve("scripts/release/validate-installer-package.mjs");
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 })));
});

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "a1-installer-artifact-"));
  roots.push(root);
  await Promise.all([
    cp(resolve("packages/a1-install"), resolve(root, "packages/a1-install"), { recursive: true }),
    cp(resolve("package.json"), resolve(root, "package.json")),
    cp(resolve("LICENSE"), resolve(root, "LICENSE")),
  ]);
  const candidate = resolve(root, ".artifacts/validation/package/installer.tgz");
  const environment = {
    ...process.env,
    RELEASE_VERSION: version,
    RELEASE_SOURCE: "",
    RELEASE_PULL_REQUEST: "",
    VALIDATION_INSTALLER_TARBALL: candidate,
  };
  const run = (script: string) => spawnSync(process.execPath, [script], {
    cwd: root, env: environment, encoding: "utf8", timeout: 30_000, windowsHide: true,
  });
  return { root, candidate, run };
}

function expectSuccess(result: ReturnType<typeof spawnSync>) {
  expect(result.error).toBeUndefined();
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
}

describe("exact installer artifact", () => {
  it("packs every local helper and validates the installed public launcher offline", async () => {
    const setup = await fixture();
    expectSuccess(setup.run(prepareScript));
    const bytes = await readFile(setup.candidate);
    const entries = readPackedEntries(bytes);
    expect(entries.map(entry => entry.path).sort()).toEqual([
      "package/LICENSE", "package/README.md", "package/bin/a1-install.js",
      "package/bin/progress-palette.js", "package/bin/repair-capsule.js", "package/package.json",
    ]);
    const helper = entries.find(entry => entry.path === "package/bin/repair-capsule.js");
    expect(helper?.content).toEqual(await readFile(resolve("packages/a1-install/bin/repair-capsule.js")));
    const manifest = readPackedManifest(bytes);
    expect(manifest).toMatchObject({ name: "@timurproko/a1-install", version });
    for (const field of ["dependencies", "optionalDependencies", "peerDependencies", "bundledDependencies", "bundleDependencies", "funding", "scripts"]) {
      expect(manifest).not.toHaveProperty(field);
    }
    const validated = setup.run(validateScript);
    expectSuccess(validated);
    expect(validated.stdout).toBe(`Validated installer package @timurproko/a1-install@${version}\n`);
  }, 60_000);

  it("rejects a packed artifact whose manifest omits the required repair helper", async () => {
    const setup = await fixture();
    const path = resolve(setup.root, "packages/a1-install/package.json");
    const manifest = JSON.parse(await readFile(path, "utf8"));
    manifest.files = manifest.files.filter((file: string) => file !== "bin/repair-capsule.js");
    await writeFile(path, `${JSON.stringify(manifest)}\n`);
    expectSuccess(setup.run(prepareScript));
    expect(readPackedEntries(await readFile(setup.candidate)).map(entry => entry.path))
      .not.toContain("package/bin/repair-capsule.js");
    const validated = setup.run(validateScript);
    expect(validated.error).toBeUndefined();
    expect(validated.status).toBe(1);
    expect(validated.stderr).toContain("installer candidate payload is not minimal");
    expect(validated.stdout).not.toContain("Validated installer package");
  }, 60_000);
});
