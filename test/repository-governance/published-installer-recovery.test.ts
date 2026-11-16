import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { smokePublishedInstaller, type SmokeChildOptions, type SmokeChildResult } from "../../scripts/release/smoke-published-installer.mjs";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
const target = "0.2.7-dev.1321";
const prior = "0.2.7-dev.1307";
const ok = { status: 0, stdout: "", stderr: "" };

async function runFixture(fault = "") {
  const outputRoot = await mkdtemp(resolve(tmpdir(), "a1-installer-recovery-"));
  roots.push(outputRoot);
  const output = resolve(outputRoot, "evidence.json");
  const calls: string[] = [];
  let runners = 0;
  let recoveryCalls = 0;
  const environment = { RELEASE_VERSION: target, RELEASE_CHANNEL: "next", PUBLISHED_INSTALLER_EVIDENCE: output,
    EXPECTED_APPLICATION_INTEGRITY: "sha512-application", EXPECTED_INSTALLER_INTEGRITY: "sha512-installer", NODE_AUTH_TOKEN: "fixture-secret-token", PATH: process.env.PATH };
  const manifest = async (options: SmokeChildOptions, version: string) => {
    const root = resolve(options.env.npm_config_prefix!, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@timurproko", "a1");
    await mkdir(root, { recursive: true });
    await writeFile(resolve(root, "package.json"), JSON.stringify({ name: "@timurproko/a1", version }));
  };
  const run = smokePublishedInstaller({
    environment, writeDiagnostic: () => {}, writeProgress: () => {}, readSystemEvents: async () => ({ events: [], antimalware: null }),
    prepareRecoveryObservation: async context => fault === "unknown-worker" ? null : ({
      environment: context.environment,
      readFailure: async () => fault === "generic-timeout" ? null : fault === "unavailable-evidence" ? Promise.reject(new Error("unavailable")) : ({
        pid: 4321, transactionId: "11111111-1111-4111-8111-111111111111", recoveryEntryDigest: "a".repeat(64), code: "EPERM", syscall: "rename", ownerPath: resolve(context.dataDir, "owner.json"),
      }),
    }),
    createRunner: () => {
      const id = ++runners;
      return {
        inventory: async () => { calls.push("inventory"); return [{ pid: 4321, parent: 1, start: "4321", executable: process.execPath, argv: ["node", environment.NODE_AUTH_TOKEN] }]; },
        close: async () => { calls.push(`settle-${id}`); if (fault === "settlement" && id === 1) throw new Error("writer still running"); },
        run: async (_command, args, options): Promise<SmokeChildResult> => {
          if (args[0] === "view") return { ...ok, stdout: JSON.stringify(prior) };
          if (args[0] === "update") {
            expect(options.timeout).toBe(120_000);
            calls.push("direct-update");
            return { ...ok, status: null, signal: fault === "cancelled" ? "SIGINT" : null, error: new Error("original direct-update timeout"), stdout: `update ${prior} to ${target}` };
          }
          if (args[0] === "--develop") {
            expect(options.timeout).toBe(120_000);
            if (id === 2) {
              calls.push("installer-recovery"); recoveryCalls++;
              expect(calls.indexOf("settle-1")).toBeLessThan(calls.indexOf("installer-recovery"));
              expect(await readFile(resolve(options.env.A1_CONFIG_DIR!, "settings.json"), "utf8")).toBe("retained settings");
              expect(await readFile(resolve(options.env.A1_DATA_DIR!, "user-state.json"), "utf8")).toBe("retained data");
              if (fault === "installer") return { ...ok, status: 1, stderr: "recovery install failed" };
              await manifest(options, fault === "manifest" ? prior : target);
              await writeFile(resolve(options.env.A1_DATA_DIR!, "release-state.json"), JSON.stringify({ references: { active: "candidate" }, releases: { candidate: { packageVersion: fault === "activation" ? prior : target } } }));
              return { ...ok, stdout: fault === "transcript" ? "unexpected success\n" : "a1 successfully installed\n" };
            }
            await manifest(options, args[1]!);
            if (args[1] === prior) {
              await mkdir(options.env.A1_CONFIG_DIR!, { recursive: true });
              await mkdir(options.env.A1_DATA_DIR!, { recursive: true });
              await writeFile(resolve(options.env.A1_CONFIG_DIR!, "settings.json"), "retained settings");
              await writeFile(resolve(options.env.A1_DATA_DIR!, "user-state.json"), "retained data");
            }
            return { ...ok, stdout: "a1 successfully installed\n" };
          }
          if (id === 2 && args[0] === "version") return { ...ok, stdout: fault === "launcher-version" ? prior : target };
          if (id === 2 && args[0] === "--help" && fault === "launcher") return { ...ok, status: 1, stderr: "recovered launcher failed" };
          return ok;
        },
      };
    },
  });
  return { run, output, calls, recoveryCalls: () => recoveryCalls };
}

describe("explicit published installer recovery", () => {
  it("settles the observed legacy failure, preserves data, and records recovery without claiming direct update success", async () => {
    const f = await runFixture();
    await f.run;
    const text = await readFile(f.output, "utf8");
    expect(JSON.parse(text)).toMatchObject({ outcome: "success", upgradeMethod: "installer-recovery", upgradeVerified: true, updateVerified: false, installerRecoveryVerified: true,
      predecessorUpdate: { outcome: "failure", error: "original direct-update timeout", crash: { code: "EPERM", syscall: "rename" } } });
    expect(text).not.toContain("fixture-secret-token");
    expect(f.calls).toContain("settle-2");
    expect(f.recoveryCalls()).toBe(1);
  });

  it.each(["unknown-worker", "generic-timeout", "unavailable-evidence", "cancelled", "settlement"])("never starts the recovery installer after %s", async fault => {
    const f = await runFixture(fault);
    await expect(f.run).rejects.toThrow(fault === "settlement" ? "writer still running" : "original direct-update timeout");
    expect(f.recoveryCalls()).toBe(0);
    expect(JSON.parse(await readFile(f.output, "utf8"))).toMatchObject({ outcome: "failure", predecessorUpdate: { outcome: "failure" } });
  });

  it.each(["installer", "transcript", "manifest", "activation", "launcher-version", "launcher"])("keeps promotion blocked when recovery fails at %s", async fault => {
    const f = await runFixture(fault);
    await expect(f.run).rejects.toThrow();
    expect(f.recoveryCalls()).toBe(1);
    expect(JSON.parse(await readFile(f.output, "utf8"))).toMatchObject({ outcome: "failure", upgradeMethod: "installer-recovery", predecessorUpdate: { outcome: "failure", error: "original direct-update timeout" } });
  });
});
