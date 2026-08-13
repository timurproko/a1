import { describe, expect, it } from "vitest";
import { configurationRootForProfile, resolveLaunchProfilePaths } from "../../../src/features/launch/index.js";

describe("launch profile paths", () => {
  it("resolves AddOne roots from an absolute Unix home", () => {
    const paths = resolveLaunchProfilePaths({ home: "/home/alice", environment: {}, platform: "linux" });
    expect(paths).toEqual({
      home: "/home/alice",
      addoneRoot: "/home/alice/.a1",
      addoneAgent: "/home/alice/.a1/agent",
      sandbox: "/home/alice/.a1/sandbox",
    });
    expect(configurationRootForProfile("addone", paths)).toBe("/home/alice/.a1/agent");
    expect(configurationRootForProfile("sandbox", paths)).toBe("/home/alice/.a1/sandbox");
    expect(configurationRootForProfile("pi", paths)).toBeNull();
  });

  it("resolves AddOne roots from an absolute Windows home", () => {
    const paths = resolveLaunchProfilePaths({ home: "C:\\Users\\Alice", environment: {}, platform: "win32" });
    expect(paths.addoneAgent).toBe("C:\\Users\\Alice\\.a1\\agent");
    expect(paths.sandbox).toBe("C:\\Users\\Alice\\.a1\\sandbox");
  });

  it("uses a hermetic profile-home override before the operating-system home", () => {
    const root = process.platform === "win32" ? "D:\\fixture-home" : "/fixture-home";
    const paths = resolveLaunchProfilePaths({
      platform: process.platform,
      environment: {
        ADDONE_PROFILE_HOME: root,
        ADDONE_CONFIG_DIR: "ignored-config",
        ADDONE_DATA_DIR: "ignored-data",
        ADDONE_RUNTIME_DIR: "ignored-runtime",
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
