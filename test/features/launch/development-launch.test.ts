import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
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

  it("prepares isolated interactive profiles before direct development launch", async () => {
    const profileHome = await mkdtemp(resolve(tmpdir(), "a1-development-profile-"));
    const inheritedPiProfile = resolve(profileHome, "inherited-shared-profile");
    const environment = { ...process.env, A1_PROFILE_HOME: profileHome, PI_CODING_AGENT_DIR: inheritedPiProfile };
    try {
      const [owned, pi] = await Promise.all([
        execute(process.execPath, ["scripts/development/start-local.mjs", "--print-environment"], { env: environment }),
        execute(process.execPath, ["scripts/development/start-local.mjs", "--print-environment", "pi"], { env: environment }),
      ]);
      expect(JSON.parse(owned.stdout)).toMatchObject({
        launchArguments: [],
        directProfile: "a1",
        profileConfigurationRoot: resolve(profileHome, ".a1/agent"),
        environment: { PI_CODING_AGENT_DIR: resolve(profileHome, ".a1/agent") },
      });
      expect(JSON.parse(pi.stdout)).toMatchObject({
        launchArguments: ["pi"],
        directProfile: "pi",
        profileConfigurationRoot: null,
        environment: { PI_CODING_AGENT_DIR: null },
      });
      expect(JSON.parse(owned.stdout).environment.PI_CODING_AGENT_DIR).not.toBe(inheritedPiProfile);
    } finally {
      await rm(profileHome, { recursive: true, force: true });
    }
  });

  it("forwards resume arguments intact through the development launcher and keeps later bare launches fresh", async () => {
    const profileHome = await mkdtemp(resolve(tmpdir(), "a1-development-resume-"));
    const env = { ...process.env, A1_PROFILE_HOME: profileHome, PI_SESSION_ID: "stale", PI_SESSION_FILE: "stale.jsonl" };
    const args = ["--session-dir", "D:/session's store", "--session", "D:\\session files\\saved.jsonl"];
    try {
      const selected = await execute(process.execPath, ["scripts/development/start-local.mjs", "--print-environment", ...args], { env });
      expect(JSON.parse(selected.stdout)).toMatchObject({ directProfile: "a1", childArguments: args });
      const fresh = await execute(process.execPath, ["scripts/development/start-local.mjs", "--print-environment"], { env });
      expect(JSON.parse(fresh.stdout)).toMatchObject({ directProfile: "a1", childArguments: [] });
    } finally {
      await rm(profileHome, { recursive: true, force: true });
    }
  });

  it("returns silently for an unsupported non-profile development command", async () => {
    const result = await execute(process.execPath, ["scripts/development/start-local.mjs", "not-an-a1-command"]);
    expect(result).toMatchObject({ stdout: "", stderr: "" });
  });

  it("shares durable preferences across fresh instances and rebuilt local candidates", () => {
    const temporaryDirectory = resolve("C:/isolated-temp");
    const first = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "0.1.4-build", {}, temporaryDirectory);
    const second = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "0.1.4-build", {}, temporaryDirectory);
    const rebuilt = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "0.1.5-build", {}, temporaryDirectory);

    expect(first.environment.A1_CONFIG_DIR).toBe(second.environment.A1_CONFIG_DIR);
    expect(first.environment.A1_CONFIG_DIR).toBe(rebuilt.environment.A1_CONFIG_DIR);
    expect(first.environment.A1_CONFIG_DIR).toBe(resolve(temporaryDirectory, "a1-development", first.checkoutId, "config"));
    expect(first.environment.A1_CONFIG_DIR).not.toContain(first.instanceId);
  });
});
