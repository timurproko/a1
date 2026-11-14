import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { smokePublishedInstaller, type SmokeChildOptions } from "../../scripts/release/smoke-published-installer.mjs";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
const version = "0.2.7-dev.1307";
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "a1-smoke-evidence-"));
  roots.push(root);
  const output = resolve(root, "evidence.json");
  const environment = {
    RELEASE_VERSION: version, RELEASE_CHANNEL: "next", PUBLISHED_INSTALLER_EVIDENCE: output,
    EXPECTED_APPLICATION_INTEGRITY: "sha512-application", EXPECTED_INSTALLER_INTEGRITY: "sha512-installer",
    NODE_AUTH_TOKEN: "super-secret-fixture-token",
  };
  return { output, environment };
}
const ok = { status: 0, stdout: "", stderr: "" };
function writeManifest(options: SmokeChildOptions, selectedVersion = version) {
  const prefix = options.env.npm_config_prefix!;
  const directory = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@timurproko", "a1");
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, "package.json"), JSON.stringify({ name: "@timurproko/a1", version: selectedVersion }));
}

describe("published installer smoke evidence", () => {
  it("keeps exact target, transcript, manifest, and launch checks on success", async () => {
    const { output, environment } = await fixture();
    const calls: string[][] = [];
    let disposable = "";
    await smokePublishedInstaller({ environment, spawnSync: (_command, args, options) => {
      disposable = options.cwd;
      expect(options.env.npm_config_cache).toBe(resolve(options.cwd, "npm-cache"));
      calls.push(args);
      if (args[0] === "--develop") {
        writeManifest(options);
        return { ...ok, stdout: "a1 successfully installed\n" };
      }
      return ok;
    } });
    expect(calls[0]).toContain(`@timurproko/a1-install@${version}`);
    expect(calls[1]).toEqual(["--develop", version]);
    expect(calls[2]).toEqual(["version"]);
    expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({ outcome: "success", installedVersion: version, launcherVerified: true });
    await expect(stat(disposable)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each(["acquire-installer", "install-application", "verify-manifest", "launch-application"])("preserves %s failure and cleans fixture", async failureStage => {
    const { output, environment } = await fixture();
    let call = 0;
    let disposable = "";
    await expect(smokePublishedInstaller({ environment, spawnSync: (_command, _args, options) => {
      disposable = options.cwd;
      const current = ["acquire-installer", "install-application", "launch-application"][call++];
      const logs = resolve(options.env.npm_config_cache!, "_logs");
      mkdirSync(logs, { recursive: true });
      writeFileSync(resolve(logs, "owned.log"), `npm error E404 missing tarball\nhttps://user:password@example.com/path?token=hidden\n${environment.NODE_AUTH_TOKEN}\n`);
      if (current === failureStage) return { ...ok, status: 1, stderr: `npm failed ${environment.NODE_AUTH_TOKEN}` };
      if (current === "install-application") { writeManifest(options, failureStage === "verify-manifest" ? "wrong" : version); return { ...ok, stdout: "a1 successfully installed\n" }; }
      return ok;
    } })).rejects.toThrow();
    const text = await readFile(output, "utf8");
    expect(text).not.toContain(environment.NODE_AUTH_TOKEN);
    expect(text).not.toContain("user:password");
    expect(text).not.toContain("token=hidden");
    expect(JSON.parse(text)).toMatchObject({ outcome: "failure", stage: failureStage, activationVerified: false });
    expect(text).toContain("E404 missing tarball");
    await expect(stat(disposable)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("does not relax the installer transcript and bounds diagnostic output", async () => {
    const { output, environment } = await fixture();
    let call = 0;
    await expect(smokePublishedInstaller({ environment, spawnSync: () => ++call === 1 ? ok : { ...ok, stdout: "x".repeat(100_000) } })).rejects.toThrow(/transcript/u);
    const text = await readFile(output, "utf8");
    expect(text.length).toBeLessThan(12_000);
    expect(JSON.parse(text)).toMatchObject({ outcome: "failure", stage: "install-application" });
  });

  it("records spawn errors without invoking npm again", async () => {
    const { output, environment } = await fixture();
    await expect(smokePublishedInstaller({ environment, spawnSync: () => ({ ...ok, status: null, error: new Error("spawn ENOENT") }) })).rejects.toThrow(/ENOENT/u);
    expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({ outcome: "failure", child: { status: null, error: "spawn ENOENT" } });
  });
});
