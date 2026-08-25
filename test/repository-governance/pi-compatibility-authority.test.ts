import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readPiCompatibilityAuthority } from "../../scripts/governance/pi-compatibility-authority.mjs";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("Pi compatibility authority", () => {
  it("derives exact versions and integrity from the repository manifest and lockfile", async () => {
    const authority = await readPiCompatibilityAuthority(".");

    expect(authority.schema).toBe("a1-pi-compatibility-authority-v1");
    expect(authority.authorities).toEqual(["package.json", "package-lock.json"]);
    expect(authority.packages.map(record => record.name)).toEqual([
      "@earendil-works/pi-coding-agent",
      "@earendil-works/pi-tui",
    ]);
    expect(authority.packages.every(record => record.requested === record.version && /^sha512-/.test(record.integrity))).toBe(true);
    expect(Object.isFrozen(authority)).toBe(true);
    expect(Object.isFrozen(authority.packages)).toBe(true);
  });

  it.each([
    ["non-exact manifest request", (manifest: any) => { manifest.dependencies["@earendil-works/pi-tui"] = "^0.84.2"; }, "package.json must declare one exact semantic version"],
    ["root lock request drift", (_manifest: any, lock: any) => { lock.packages[""].dependencies["@earendil-works/pi-tui"] = "0.84.1"; }, "root request 0.84.1 differs"],
    ["locked version drift", (_manifest: any, lock: any) => { lock.packages["node_modules/@earendil-works/pi-tui"].version = "0.84.1"; }, "lockfile version 0.84.1 differs"],
    ["missing integrity", (_manifest: any, lock: any) => { delete lock.packages["node_modules/@earendil-works/pi-tui"].integrity; }, "lockfile integrity is missing or malformed"],
    ["missing artifact", (_manifest: any, lock: any) => { delete lock.packages["node_modules/@earendil-works/pi-coding-agent"]; }, "lockfile version undefined differs"],
  ])("rejects %s", async (_name, mutate, diagnostic) => {
    const root = await fixture(mutate);
    await expect(readPiCompatibilityAuthority(root)).rejects.toThrow(diagnostic);
  });
});

async function fixture(mutate: (manifest: any, lockfile: any) => void): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-pi-authority-"));
  roots.push(root);
  const dependencies = {
    "@earendil-works/pi-coding-agent": "0.84.2",
    "@earendil-works/pi-tui": "0.84.2",
  };
  const manifest = { name: "fixture", dependencies: { ...dependencies } };
  const lockfile = {
    packages: {
      "": { name: "fixture", dependencies: { ...dependencies } },
      "node_modules/@earendil-works/pi-coding-agent": {
        version: "0.84.2",
        resolved: "https://registry.example/coding.tgz",
        integrity: "sha512-YWNjZXB0ZWQ=",
      },
      "node_modules/@earendil-works/pi-tui": {
        version: "0.84.2",
        resolved: "https://registry.example/tui.tgz",
        integrity: "sha512-YWNjZXB0ZWQ=",
      },
    },
  };
  mutate(manifest, lockfile);
  await Promise.all([
    writeFile(resolve(root, "package.json"), JSON.stringify(manifest)),
    writeFile(resolve(root, "package-lock.json"), JSON.stringify(lockfile)),
  ]);
  return root;
}
