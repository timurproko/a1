import { describe, expect, it } from "vitest";
import { resolveProductPaths } from "../../../src/foundation/lifecycle/index.js";

describe("product control paths", () => {
  it("uses A1 defaults on Windows", () => {
    const paths = resolveProductPaths({
      USERPROFILE: "C:\\Users\\Alice",
      APPDATA: "C:\\Users\\Alice\\AppData\\Roaming",
      LOCALAPPDATA: "C:\\Users\\Alice\\AppData\\Local",
    }, "win32", "C:\\fallback");

    expect(paths.configDir).toBe("C:\\Users\\Alice\\AppData\\Roaming\\A1");
    expect(paths.dataDir).toBe("C:\\Users\\Alice\\AppData\\Local\\A1");
    expect(paths.runtimeDir).toBe("C:\\Users\\Alice\\AppData\\Local\\A1\\runtime");
    expect(paths.databasePath).toBe("C:\\Users\\Alice\\AppData\\Local\\A1\\control.sqlite3");
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
});
