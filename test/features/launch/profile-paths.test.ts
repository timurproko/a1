import { describe, expect, it } from "vitest";
import { configurationRootForProfile, resolveLaunchProfilePaths } from "../../../src/features/launch/index.js";

describe("launch profile paths", () => {
  it("resolves A1 roots from an absolute Unix home", () => {
    const paths = resolveLaunchProfilePaths({ home: "/home/alice", environment: {}, platform: "linux" });
    expect(paths).toEqual({
      home: "/home/alice",
      a1Root: "/home/alice/.a1",
      a1Agent: "/home/alice/.a1/agent",
      sandbox: "/home/alice/.a1/sandbox",
    });
    expect(configurationRootForProfile("a1", paths)).toBe("/home/alice/.a1/agent");
    expect(configurationRootForProfile("sandbox", paths)).toBe("/home/alice/.a1/sandbox");
    expect(configurationRootForProfile("pi", paths)).toBeNull();
  });

  it("resolves A1 roots from an absolute Windows home", () => {
    const paths = resolveLaunchProfilePaths({ home: "C:\\Users\\Alice", environment: {}, platform: "win32" });
    expect(paths.a1Agent).toBe("C:\\Users\\Alice\\.a1\\agent");
    expect(paths.sandbox).toBe("C:\\Users\\Alice\\.a1\\sandbox");
  });

  it("ignores the legacy profile-home variable", () => {
    const selected = process.platform === "win32" ? "D:\\selected-home" : "/selected-home";
    const legacy = process.platform === "win32" ? "D:\\legacy-home" : "/legacy-home";
    const paths = resolveLaunchProfilePaths({
      platform: process.platform,
      environment: { ADDONE_PROFILE_HOME: legacy },
      readHome: () => selected,
    });

    expect(paths.home).toBe(selected);
    expect(paths.home).not.toBe(legacy);
  });

  it("uses a hermetic profile-home override before the operating-system home", () => {
    const root = process.platform === "win32" ? "D:\\fixture-home" : "/fixture-home";
    const paths = resolveLaunchProfilePaths({
      platform: process.platform,
      environment: {
        A1_PROFILE_HOME: root,
        A1_CONFIG_DIR: "ignored-config",
        A1_DATA_DIR: "ignored-data",
        A1_RUNTIME_DIR: "ignored-runtime",
      },
      readHome: () => { throw new Error("OS home must not be read"); },
    });
    expect(paths.home).toBe(root);
    expect(JSON.stringify(paths)).not.toMatch(/ignored-(?:config|data|runtime)/);
  });

  it.each(["", "relative/home", "bad\0home"])("rejects invalid effective home %j", home => {
    expect(() => resolveLaunchProfilePaths({ home, environment: {} })).toThrow(/effective user home/);
  });
});
