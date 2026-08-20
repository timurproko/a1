import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const execute = promisify(execFile);
import { resolveDevelopmentLaunchEnvironment } from "../../../src/features/launch/index.js";
import { resolveProductPaths } from "../../../src/foundation/lifecycle/index.js";

describe("repository-local development launch", () => {
  it("gives simultaneous launches from the same checkout and build independent instances", () => {
    const temporaryDirectory = resolve("C:/isolated-temp");
    const first = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "0.1.4-build", {}, temporaryDirectory);
    const second = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "0.1.4-build", {}, temporaryDirectory);

    expect(first.checkoutId).toBe(second.checkoutId);
    expect(first.instanceId).not.toBe(second.instanceId);
    expect(first.developmentRoot).not.toBe(second.developmentRoot);
    expect(first.developmentRoot).toContain(first.checkoutId);
    expect(first.developmentRoot).toContain("a1-development");
    expect(first.developmentRoot).not.toContain("addone-development");
    expect(first.developmentRoot).toContain("0.1.4-build");
    expect(first.developmentRoot).toContain(first.instanceId);
    expect(first.environment.A1_RUNTIME_DIR).toBe(resolve(first.developmentRoot, "runtime"));
    expect(first.environment.A1_DATABASE_PATH).toBe(resolve(first.developmentRoot, "data/control.sqlite3"));
    expect(resolveProductPaths(first.environment).endpoint).not.toBe(resolveProductPaths(second.environment).endpoint);
  });

  it("allows an explicit instance selector when intentional reconnection is needed", () => {
    const source = { A1_DEV_INSTANCE_ID: "shared-debug-instance" };
    const first = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "release", source, "D:/temp");
    const second = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "release", source, "D:/temp");

    expect(first.instanceId).toBe(second.instanceId);
    expect(first.developmentRoot).toBe(second.developmentRoot);
    expect(resolveProductPaths(first.environment).endpoint).toBe(resolveProductPaths(second.environment).endpoint);
  });

  it("ignores legacy-only environment overrides", () => {
    const legacy = {
      HOME: "D:/home",
      USERPROFILE: "D:/home",
      ADDONE_DEV_INSTANCE_ID: "legacy-instance",
      ADDONE_DEV_ROOT: "D:/legacy/development",
      ADDONE_CONFIG_DIR: "D:/legacy/config",
      ADDONE_DATA_DIR: "D:/legacy/data",
      ADDONE_RUNTIME_DIR: "D:/legacy/runtime",
      ADDONE_DATABASE_PATH: "D:/legacy/database.sqlite3",
      ADDONE_ENDPOINT: "legacy-endpoint",
    };
    const launch = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "release", legacy, "D:/temp");
    const paths = resolveProductPaths(legacy);

    expect(launch.developmentRoot).not.toContain("legacy/development");
    expect(launch.environment.A1_CONFIG_DIR).not.toContain("legacy/config");
    expect(launch.environment.A1_DATA_DIR).not.toContain("legacy/data");
    expect(launch.environment.A1_RUNTIME_DIR).not.toContain("legacy/runtime");
    expect(paths.databasePath).not.toContain("legacy/database.sqlite3");
    expect(paths.endpoint).not.toBe("legacy-endpoint");
  });

  it("preserves explicit development path overrides", () => {
    const environment = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "release", {
      A1_DEV_ROOT: "D:/custom/root",
      A1_CONFIG_DIR: "D:/custom/config",
      A1_DATA_DIR: "D:/custom/data",
      A1_RUNTIME_DIR: "D:/custom/runtime",
      A1_DATABASE_PATH: "D:/custom/database.sqlite3",
    }, "D:/temp").environment;

    expect(environment).toMatchObject({
      A1_CONFIG_DIR: resolve("D:/custom/config"),
      A1_DATA_DIR: resolve("D:/custom/data"),
      A1_RUNTIME_DIR: resolve("D:/custom/runtime"),
      A1_DATABASE_PATH: resolve("D:/custom/database.sqlite3"),
    });
  });

  it("launches interactive development profiles directly and preserves CLI validation", async () => {
    const [owned, pi, sandbox] = await Promise.all([
      execute(process.execPath, ["scripts/start-local.mjs", "--print-environment"]),
      execute(process.execPath, ["scripts/start-local.mjs", "--print-environment", "pi"]),
      execute(process.execPath, ["scripts/start-local.mjs", "--print-environment", "sandbox"]),
    ]);
    expect(JSON.parse(owned.stdout)).toMatchObject({ launchArguments: [], directProfile: "a1" });
    expect(JSON.parse(pi.stdout)).toMatchObject({ launchArguments: ["pi"], directProfile: "pi" });
    expect(JSON.parse(sandbox.stdout)).toMatchObject({ launchArguments: ["sandbox"], directProfile: "sandbox" });

    await expect(execute(process.execPath, ["scripts/start-local.mjs", "not-an-a1-command"]))
      .rejects.toMatchObject({ code: 2, stderr: expect.stringContaining("A1 received an unknown command: not-an-a1-command") });
  });
});
