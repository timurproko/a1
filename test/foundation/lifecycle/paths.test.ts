import { describe, expect, it } from "vitest";
import { resolveProductPaths } from "../../../src/foundation/lifecycle/index.js";

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
    });
    expect(JSON.stringify(paths)).not.toMatch(/AddOne|addone/);
  });

  it("honors A1 overrides and isolates concurrent runtime roots", () => {
    const first = resolveProductPaths({
      A1_CONFIG_DIR: "/custom/config",
      A1_DATA_DIR: "/custom/data",
      A1_RUNTIME_DIR: "/custom/runtime-one",
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
    });
    expect(second.runtimeDir).toBe("/custom/runtime-two");
  });

  it("ignores legacy-only path variables without fallback", () => {
    const paths = resolveProductPaths({
      HOME: "/home/alice",
      ADDONE_CONFIG_DIR: "/legacy/config",
      ADDONE_DATA_DIR: "/legacy/data",
      ADDONE_RUNTIME_DIR: "/legacy/runtime",
      ADDONE_ENDPOINT: "legacy-endpoint",
    }, "linux", "/fallback");

    expect(JSON.stringify(paths)).not.toContain("legacy");
    expect(paths.configDir).toBe("/home/alice/.config/a1");
    expect(paths.dataDir).toBe("/home/alice/.local/share/a1");
  });
});
