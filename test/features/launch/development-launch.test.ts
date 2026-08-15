import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const execute = promisify(execFile);
import { resolveDevelopmentLaunchEnvironment } from "../../../src/features/launch/index.js";
import { resolveAddOnePaths } from "../../../src/foundation/lifecycle/index.js";

describe("repository-local development launch", () => {
  it("gives simultaneous launches from the same checkout and build independent instances", () => {
    const temporaryDirectory = resolve("C:/isolated-temp");
    const first = resolveDevelopmentLaunchEnvironment("D:/Git/addone", "0.1.4-build", {}, temporaryDirectory);
    const second = resolveDevelopmentLaunchEnvironment("D:/Git/addone", "0.1.4-build", {}, temporaryDirectory);

    expect(first.checkoutId).toBe(second.checkoutId);
    expect(first.instanceId).not.toBe(second.instanceId);
    expect(first.developmentRoot).not.toBe(second.developmentRoot);
    expect(first.developmentRoot).toContain(first.checkoutId);
    expect(first.developmentRoot).toContain("0.1.4-build");
    expect(first.developmentRoot).toContain(first.instanceId);
    expect(first.environment.ADDONE_RUNTIME_DIR).toBe(resolve(first.developmentRoot, "runtime"));
    expect(first.environment.ADDONE_DATABASE_PATH).toBe(resolve(first.developmentRoot, "data/control.sqlite3"));
    expect(resolveAddOnePaths(first.environment).endpoint).not.toBe(resolveAddOnePaths(second.environment).endpoint);
  });

  it("allows an explicit instance selector when intentional reconnection is needed", () => {
    const source = { ADDONE_DEV_INSTANCE_ID: "shared-debug-instance" };
    const first = resolveDevelopmentLaunchEnvironment("D:/Git/addone", "release", source, "D:/temp");
    const second = resolveDevelopmentLaunchEnvironment("D:/Git/addone", "release", source, "D:/temp");

    expect(first.instanceId).toBe(second.instanceId);
    expect(first.developmentRoot).toBe(second.developmentRoot);
    expect(resolveAddOnePaths(first.environment).endpoint).toBe(resolveAddOnePaths(second.environment).endpoint);
  });

  it("preserves explicit development path overrides", () => {
    const environment = resolveDevelopmentLaunchEnvironment("D:/Git/addone", "release", {
      ADDONE_DEV_ROOT: "D:/custom/root",
      ADDONE_CONFIG_DIR: "D:/custom/config",
      ADDONE_DATA_DIR: "D:/custom/data",
      ADDONE_RUNTIME_DIR: "D:/custom/runtime",
      ADDONE_DATABASE_PATH: "D:/custom/database.sqlite3",
    }, "D:/temp").environment;

    expect(environment).toMatchObject({
      ADDONE_CONFIG_DIR: resolve("D:/custom/config"),
      ADDONE_DATA_DIR: resolve("D:/custom/data"),
      ADDONE_RUNTIME_DIR: resolve("D:/custom/runtime"),
      ADDONE_DATABASE_PATH: resolve("D:/custom/database.sqlite3"),
    });
  });

  it("launches interactive development profiles directly and preserves CLI validation", async () => {
    const [owned, pi, sandbox] = await Promise.all([
      execute(process.execPath, ["scripts/start-local.mjs", "--print-environment"]),
      execute(process.execPath, ["scripts/start-local.mjs", "--print-environment", "pi"]),
      execute(process.execPath, ["scripts/start-local.mjs", "--print-environment", "sandbox"]),
    ]);
    expect(JSON.parse(owned.stdout)).toMatchObject({ launchArguments: [], directProfile: "addone" });
    expect(JSON.parse(pi.stdout)).toMatchObject({ launchArguments: ["pi"], directProfile: "pi" });
    expect(JSON.parse(sandbox.stdout)).toMatchObject({ launchArguments: ["sandbox"], directProfile: "sandbox" });

    await expect(execute(process.execPath, ["scripts/start-local.mjs", "not-an-addone-command"]))
      .rejects.toMatchObject({ code: 2, stderr: expect.stringContaining("Unknown AddOne command: not-an-addone-command") });
  });
});
