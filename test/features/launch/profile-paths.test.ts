import { describe, expect, it } from "vitest";
import { configurationRootForProfile, resolveLaunchProfilePaths } from "../../../src/features/launch/index.js";

describe("launch profile paths", () => {
  it("resolves Unix profile roots", () => {
    const paths = resolveLaunchProfilePaths({ home: "/home/alice", environment: {}, platform: "linux" });
    expect(paths).toEqual({
      home: "/home/alice",
      managedStateRoot: "/home/alice/.a1",
      agentProfile: "/home/alice/.a1/agent",
    });
    expect(configurationRootForProfile("a1", paths)).toBe("/home/alice/.a1/agent");
    expect(configurationRootForProfile("pi", paths)).toBeNull();
  });

  it("resolves Windows profile roots", () => {
    const paths = resolveLaunchProfilePaths({ home: "C:\\Users\\Alice", environment: {}, platform: "win32" });
    expect(paths.agentProfile).toBe("C:\\Users\\Alice\\.a1\\agent");
  });
});
