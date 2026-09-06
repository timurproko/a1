import { describe, expect, it } from "vitest";
import { resolveCohortEndpoint, resolveProductPaths } from "../../../src/foundation/lifecycle/index.js";

describe("product control paths", () => {
  it("uses lowercase a1 defaults on Windows", () => {
    const paths = resolveProductPaths({
      USERPROFILE: "C:\\Users\\Alice",
      APPDATA: "C:\\Users\\Alice\\AppData\\Roaming",
      LOCALAPPDATA: "C:\\Users\\Alice\\AppData\\Local",
    }, "win32", "C:\\fallback");

    expect(paths.configDir).toBe("C:\\Users\\Alice\\AppData\\Roaming\\a1");
    expect(paths.dataDir).toBe("C:\\Users\\Alice\\AppData\\Local\\a1");
    expect(paths.runtimeDir).toBe("C:\\Users\\Alice\\AppData\\Local\\a1\\runtime");
    expect(paths.databasePath).toBe("C:\\Users\\Alice\\AppData\\Local\\a1\\control.sqlite3");
    expect(paths.endpoint).toMatch(/^\\\\\.\\pipe\\a1-[a-f0-9]{20}$/);
    expect(JSON.stringify(paths)).not.toMatch(/AddOne|addone/);
  });

  it("uses a1 defaults on Unix platforms", () => {
    const paths = resolveProductPaths({
      HOME: "/home/alice",
      XDG_CONFIG_HOME: "/config",
      XDG_DATA_HOME: "/data",
      XDG_RUNTIME_DIR: "/run/user/1000",
    }, "linux", "/fallback");

    expect(paths).toMatchObject({
      configDir: "/config/a1",
      dataDir: "/data/a1",
      runtimeDir: "/run/user/1000/a1",
      databasePath: "/data/a1/control.sqlite3",
      endpoint: "/run/user/1000/a1/supervisor.sock",
    });
    expect(JSON.stringify(paths)).not.toMatch(/AddOne|addone/);
  });

  it("honors A1 overrides and isolates concurrent runtime roots", () => {
    const first = resolveProductPaths({
      A1_CONFIG_DIR: "/custom/config",
      A1_DATA_DIR: "/custom/data",
      A1_RUNTIME_DIR: "/custom/runtime-one",
      A1_DATABASE_PATH: "/custom/database.sqlite3",
    }, "linux", "/fallback");
    const second = resolveProductPaths({
      A1_CONFIG_DIR: "/custom/config",
      A1_DATA_DIR: "/custom/data",
      A1_RUNTIME_DIR: "/custom/runtime-two",
    }, "linux", "/fallback");

    expect(first).toMatchObject({
      configDir: "/custom/config",
      dataDir: "/custom/data",
      runtimeDir: "/custom/runtime-one",
      databasePath: "/custom/database.sqlite3",
    });
    expect(first.endpoint).not.toBe(second.endpoint);
  });

  it("ignores legacy-only path variables without fallback", () => {
    const paths = resolveProductPaths({
      HOME: "/home/alice",
      ADDONE_CONFIG_DIR: "/legacy/config",
      ADDONE_DATA_DIR: "/legacy/data",
      ADDONE_RUNTIME_DIR: "/legacy/runtime",
      ADDONE_DATABASE_PATH: "/legacy/database.sqlite3",
      ADDONE_ENDPOINT: "legacy-endpoint",
    }, "linux", "/fallback");

    expect(JSON.stringify(paths)).not.toContain("legacy");
    expect(paths.configDir).toBe("/home/alice/.config/a1");
    expect(paths.dataDir).toBe("/home/alice/.local/share/a1");
  });

  it("normalizes Windows runtime casing to one endpoint namespace", () => {
    const upper = resolveProductPaths({ A1_RUNTIME_DIR: "C:\\A1\\Runtime" }, "win32", "C:\\home");
    const lower = resolveProductPaths({ A1_RUNTIME_DIR: "c:\\a1\\runtime" }, "win32", "C:\\home");
    expect(upper.endpoint).toBe(lower.endpoint);
  });

  it("gives each cohort its own endpoint so two can be live at once", () => {
    const environment = { A1_RUNTIME_DIR: "/run/a1" };
    const paths = resolveProductPaths(environment, "linux", "/fallback");
    const first = resolveCohortEndpoint(paths, "0.1.8-aaaaaaaaaaaaaaaaaaaa", environment, "linux");
    const second = resolveCohortEndpoint(paths, "0.1.9-bbbbbbbbbbbbbbbbbbbb", environment, "linux");

    expect(first.endpoint).not.toBe(second.endpoint);
    expect(first.endpointMetadataPath).not.toBe(second.endpointMetadataPath);
    expect(first.endpoint.startsWith(paths.runtimeDir)).toBe(true);
    expect(first.endpointMetadataPath.startsWith(paths.endpointsDir)).toBe(true);
    // Invariant: neither is the endpoint a release without cohort identity published.
    expect(first.endpoint).not.toBe(paths.endpoint);
    expect(first.endpointMetadataPath).not.toBe(paths.endpointMetadataPath);
    expect(resolveCohortEndpoint(paths, "0.1.8-aaaaaaaaaaaaaaaaaaaa", environment, "linux")).toEqual(first);
  });

  it("names a Windows cohort endpoint under the runtime namespace", () => {
    const environment = { A1_RUNTIME_DIR: "C:\\A1\\Runtime" };
    const paths = resolveProductPaths(environment, "win32", "C:\\home");
    const cohort = resolveCohortEndpoint(paths, "0.1.8-aaaaaaaaaaaaaaaaaaaa", environment, "win32");

    expect(cohort.endpoint.startsWith(`${paths.endpoint}-`)).toBe(true);
    expect(cohort.endpoint).toMatch(/^\\\\\.\\pipe\\a1-[a-f0-9]{20}-[a-f0-9]{16}$/);
    expect(cohort.endpointMetadataPath.startsWith(paths.endpointsDir)).toBe(true);
  });

  it("keeps one endpoint when the address is pinned by an override", () => {
    const environment = { A1_RUNTIME_DIR: "/run/a1", A1_ENDPOINT: "/tmp/pinned.sock" };
    const paths = resolveProductPaths(environment, "linux", "/fallback");
    const cohort = resolveCohortEndpoint(paths, "0.1.8-aaaaaaaaaaaaaaaaaaaa", environment, "linux");

    expect(cohort).toEqual({ endpoint: "/tmp/pinned.sock", endpointMetadataPath: paths.endpointMetadataPath });
  });

  it("uses a short stable socket namespace for long Darwin runtime roots", () => {
    const environment = { A1_RUNTIME_DIR: "/var/folders/bl/very-long-runner-namespace/T/a1-validation-package-abcdef/runtime" };
    const paths = resolveProductPaths(environment, "darwin", "/Users/runner");
    const cohort = resolveCohortEndpoint(paths, "0.1.8-dev.254-aaaaaaaaaaaaaaaaaaaa", environment, "darwin");

    expect(paths.runtimeDir).toBe(environment.A1_RUNTIME_DIR);
    expect(paths.endpointDirectory).toMatch(/^\/tmp\/a1-[a-f0-9]{20}$/);
    expect(paths.endpoint).toBe(`${paths.endpointDirectory}/supervisor.sock`);
    expect(cohort.endpoint).toMatch(/^\/tmp\/a1-[a-f0-9]{20}\/[a-f0-9]{16}-supervisor\.sock$/);
    expect(Buffer.byteLength(cohort.endpoint)).toBeLessThan(104);
    expect(cohort.endpointMetadataPath.startsWith(paths.endpointsDir)).toBe(true);
  });
});
