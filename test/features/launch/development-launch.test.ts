import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execute = promisify(execFile);
import { resolveDevelopmentLaunchEnvironment, resolvePromptHistoryDataDir } from "../../../src/features/launch/index.js";
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
    expect(resolveProductPaths(first.environment).runtimeDir).not.toBe(resolveProductPaths(second.environment).runtimeDir);
  });

  it("allows an explicit instance selector when intentional reconnection is needed", () => {
    const source = { A1_DEV_INSTANCE_ID: "shared-debug-instance" };
    const first = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "release", source, "D:/temp");
    const second = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "release", source, "D:/temp");

    expect(first.instanceId).toBe(second.instanceId);
    expect(first.developmentRoot).toBe(second.developmentRoot);
    expect(resolveProductPaths(first.environment).runtimeDir).toBe(resolveProductPaths(second.environment).runtimeDir);
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
      ADDONE_ENDPOINT: "legacy-endpoint",
    };
    const launch = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "release", legacy, "D:/temp");
    expect(JSON.stringify(resolveProductPaths(legacy))).not.toContain("legacy");

    expect(launch.developmentRoot).not.toContain("legacy/development");
    expect(launch.environment.A1_CONFIG_DIR).not.toContain("legacy/config");
    expect(launch.environment.A1_DATA_DIR).not.toContain("legacy/data");
    expect(launch.environment.A1_RUNTIME_DIR).not.toContain("legacy/runtime");
  });

  it("preserves explicit development path overrides", () => {
    const environment = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "release", {
      A1_DEV_ROOT: "D:/custom/root",
      A1_CONFIG_DIR: "D:/custom/config",
      A1_DATA_DIR: "D:/custom/data",
      A1_RUNTIME_DIR: "D:/custom/runtime",
    }, "D:/temp").environment;

    expect(environment).toMatchObject({
      A1_CONFIG_DIR: resolve("D:/custom/config"),
      A1_DATA_DIR: resolve("D:/custom/data"),
      A1_RUNTIME_DIR: resolve("D:/custom/runtime"),
      A1_DEV_HISTORY_DATA_DIR: resolve("D:/custom/data"),
    });
  });

  it.each([[], ["--pi-compatible"]].map(prefix => ({ prefix })))("prints explicit resource refusals, not crash-record pointers, through the actual UI entry $prefix", async ({ prefix }) => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-development-refusal-"));
    try {
      const extension = resolve(root, "broken.ts");
      await writeFile(extension, `throw new Error(${JSON.stringify("requested \x1b[31mworker\x1b[0m hooks failed\x07")});`);
      for (const { args, reason } of [
        { args: ["-e", extension], reason: `${extension}: Failed to load extension: requested worker hooks failed` },
        { args: ["--unregistered-worker-flag=value", "--", "say ok"], reason: "Unknown extension flag --unregistered-worker-flag" },
        { args: ["--model", "missing-provider/missing-model"], reason: "missing-model" },
      ]) {
        const result = await execute(process.execPath, [resolve("scripts/development/start-local.mjs"), ...prefix, "--no-session", "-na", ...args], {
          cwd: root, timeout: 15_000,
          env: { ...process.env, A1_PROFILE_HOME: root, PI_OFFLINE: "1", A1_SKIP_VERSION_CHECK: "1", A1_CONFIG_DIR: resolve(root, "config"), A1_DATA_DIR: resolve(root, "data"), A1_RUNTIME_DIR: resolve(root, "runtime") },
        }).catch(error => error as { code: number; stdout: string; stderr: string; killed?: boolean });
        expect(result).toMatchObject({ code: 1 });
        expect(result.stderr).toContain("A1 could not start:");
        expect(result.stderr).toContain(reason);
        expect(result.stderr).not.toContain("unexpected error");
        expect(result.stderr).not.toContain("Diagnostic:");
        expect(result.stderr).not.toMatch(/[\x1b\x07]/);
        expect(result).not.toHaveProperty("killed", true);
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it.each([[], ["--pi-compatible"]].map(prefix => ({ prefix })))("redacts invocation credentials from public and structured development diagnostics $prefix", async ({ prefix }) => {
    const profileHome = await mkdtemp(resolve(tmpdir(), "a1-development-credential-"));
    try {
      const key = "never-sent-development-fixture";
      const { stdout } = await execute(process.execPath, ["scripts/development/start-local.mjs", "--print-environment", ...prefix, "--no-session", "--model", "provider/model", "--api-key", key, "--no-approve", "--name", "Scratch"], { env: { ...process.env, A1_PROFILE_HOME: profileHome } });
      const result = JSON.parse(stdout);
      expect(stdout).not.toContain(key);
      expect(result.launchArguments).toContain("[redacted]");
      expect(JSON.parse(result.childArguments[1])).toMatchObject({ noSession: true, model: "provider/model", apiKey: "[redacted]", projectTrust: false, sessionName: "Scratch" });
    } finally { await rm(profileHome, { recursive: true, force: true }); }
  });

  it.each([[], ["--pi-compatible"]].map(prefix => ({ prefix })))("refuses headless resume before factories through the actual development entry $prefix", async ({ prefix }) => {
    const profileHome = await mkdtemp(resolve(tmpdir(), "a1-development-picker-"));
    const marker = resolve(profileHome, "factory-marker");
    try {
      const extensions = resolve(profileHome, ".a1/agent/extensions"); await mkdir(extensions, { recursive: true });
      await writeFile(resolve(extensions, "marker.ts"), `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "must not run"); export default function() {}`);
      await expect(execute(process.execPath, ["scripts/development/start-local.mjs", ...prefix, "--resume"], { timeout: 15_000, env: { ...process.env, A1_PROFILE_HOME: profileHome, PI_OFFLINE: "1", A1_CONFIG_DIR: resolve(profileHome, "config"), A1_DATA_DIR: resolve(profileHome, "data"), A1_RUNTIME_DIR: resolve(profileHome, "runtime") } })).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining("--resume requires an interactive terminal") });
      await expect(readFile(marker)).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await rm(profileHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
  });

  it("prepares isolated interactive profiles before development launch", async () => {
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
        selectedEntry: "bin/ui.js",
        profileConfigurationRoot: resolve(profileHome, ".a1/agent"),
        environment: {
          PI_CODING_AGENT_DIR: resolve(profileHome, ".a1/agent"),
          NODE_DISABLE_COMPILE_CACHE: "1",
        },
      });
      expect(JSON.parse(pi.stdout)).toMatchObject({
        launchArguments: ["pi"],
        directProfile: "pi",
        selectedEntry: "bin/ui.js",
        profileConfigurationRoot: null,
        environment: { PI_CODING_AGENT_DIR: null, NODE_DISABLE_COMPILE_CACHE: "1" },
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
      expect(JSON.parse(selected.stdout)).toMatchObject({ directProfile: "a1", selectedEntry: "bin/ui.js", childArguments: args });
      const fresh = await execute(process.execPath, ["scripts/development/start-local.mjs", "--print-environment"], { env });
      expect(JSON.parse(fresh.stdout)).toMatchObject({ directProfile: "a1", selectedEntry: "bin/ui.js", childArguments: [] });
    } finally {
      await rm(profileHome, { recursive: true, force: true });
    }
  });

  it("preserves owned and compatible literal startup payloads in the actual development launch", async () => {
    const home = await mkdtemp(resolve(tmpdir(), "a1-development-compatible-"));
    const env = { ...process.env, A1_PROFILE_HOME: home };
    const prompt = "quotes '\" spaces  🚢\n--model not-an-option";
    try {
      const ordinary = await execute(process.execPath, ["scripts/development/start-local.mjs", "--print-environment", "--session-color", "green", "--", prompt], { env });
      expect(JSON.parse(ordinary.stdout).childArguments).toEqual(["--session-color", "green", "--", prompt]);
      const compatible = await execute(process.execPath, ["scripts/development/start-local.mjs", "--print-environment", "--pi-compatible", "--model", "provider/model", "--thinking", "high", prompt], { env });
      const result = JSON.parse(compatible.stdout);
      expect(result).toMatchObject({ directProfile: "a1", selectedEntry: "bin/ui.js", profileConfigurationRoot: resolve(home, ".a1/agent") });
      expect(result.childArguments).toEqual(["--runtime-options", JSON.stringify({ model: "provider/model", thinking: "high" }), "--", prompt]);
    } finally { await rm(home, { recursive: true, force: true }); }
  });

  it("routes bare instructions through normal development UI without executing a live prompt", async () => {
    const profileHome = await mkdtemp(resolve(tmpdir(), "a1-development-prompt-"));
    try {
      const result = await execute(process.execPath, ["scripts/development/start-local.mjs", "--print-environment", "not-an-a1-command"], { env: { ...process.env, A1_PROFILE_HOME: profileHome, PI_OFFLINE: "1" } });
      expect(JSON.parse(result.stdout)).toMatchObject({ directProfile: "a1", selectedEntry: "bin/ui.js", childArguments: ["--", "not-an-a1-command"] });
      expect(result.stderr).toBe("");
    } finally { await rm(profileHome, { recursive: true, force: true }); }
  });

  it("shares durable preferences across fresh instances and rebuilt local candidates", () => {
    const temporaryDirectory = resolve("C:/isolated-temp");
    const first = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "0.1.4-build", {}, temporaryDirectory);
    const second = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "0.1.4-build", {}, temporaryDirectory);
    const rebuilt = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "0.1.5-build", {}, temporaryDirectory);

    expect(first.environment.A1_CONFIG_DIR).toBe(second.environment.A1_CONFIG_DIR);
    expect(first.environment.A1_CONFIG_DIR).toBe(rebuilt.environment.A1_CONFIG_DIR);
    expect(first.environment.A1_DEV_HISTORY_DATA_DIR).toBe(second.environment.A1_DEV_HISTORY_DATA_DIR);
    expect(first.environment.A1_DEV_HISTORY_DATA_DIR).toBe(rebuilt.environment.A1_DEV_HISTORY_DATA_DIR);
    expect(first.environment.A1_CONFIG_DIR).toBe(resolve(temporaryDirectory, "a1-development", first.checkoutId, "config"));
    expect(first.environment.A1_CONFIG_DIR).not.toContain(first.instanceId);
  });

  it("shares Shared history across launches without sharing their runtime state", async () => {
    const { resolvePromptHistoryPath } = await import("../../../src/features/prompt-history/index.js");
    const temporaryDirectory = resolve("C:/isolated-temp");
    const first = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "0.1.4-build", {}, temporaryDirectory);
    const second = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "0.1.4-build", {}, temporaryDirectory);
    const profile = resolve("D:/user/.a1/agent");
    const firstHistory = resolvePromptHistoryDataDir({ environment: first.environment });
    const secondHistory = resolvePromptHistoryDataDir({ environment: second.environment });
    expect(first.environment.A1_DEV_HISTORY_DATA_DIR).toBe(resolve(temporaryDirectory, "a1-development", first.checkoutId, "data"));
    expect(firstHistory).toBe(secondHistory);
    expect(firstHistory).not.toBe(first.environment.A1_DATA_DIR);
    expect(resolvePromptHistoryPath(firstHistory, profile, process.platform, "shared").path)
      .toBe(resolvePromptHistoryPath(secondHistory, profile, process.platform, "shared").path);
    expect(resolvePromptHistoryPath(firstHistory, profile, process.platform, "unique", "session-one").path)
      .not.toBe(resolvePromptHistoryPath(secondHistory, profile, process.platform, "unique", "session-two").path);
    expect(resolveProductPaths(first.environment).runtimeDir).not.toBe(resolveProductPaths(second.environment).runtimeDir);
  });

  it("keeps an explicit development root self-contained while allowing a history-only override", () => {
    const root = resolve("D:/custom/root");
    const launch = resolveDevelopmentLaunchEnvironment("D:/Git/a1", "release", { A1_DEV_ROOT: root }, "D:/temp");
    expect(resolvePromptHistoryDataDir({ environment: launch.environment })).toBe(resolve(root, "data"));
    expect(resolveDevelopmentLaunchEnvironment("D:/Git/a1", "release", {
      A1_DEV_ROOT: root, A1_DEV_HISTORY_DATA_DIR: "D:/shared-history",
    }, "D:/temp").environment.A1_DEV_HISTORY_DATA_DIR).toBe(resolve("D:/shared-history"));
  });
});
