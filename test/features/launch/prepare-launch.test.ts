import { describe, expect, it, vi } from "vitest";
import { initializeInteractiveProcessIdentity, interactiveLaunchIntent, prepareInteractiveLaunch } from "../../../src/features/launch/index.js";

const home = process.platform === "win32" ? "C:\\fixture-home" : "/fixture-home";

describe("prepared Pi launch environment", () => {
  it("sets the A1 agent profile and preserves provider credentials", async () => {
    const initializeProfile = vi.fn(async (root: string) => ({ root, directories: [] }));
    const result = await prepareInteractiveLaunch(interactiveLaunchIntent("a1"), {
      PI_CODING_AGENT_DIR: "inherited-must-change",
      ANTHROPIC_API_KEY: "provider-secret",
      PATH: "fixture-path",
    }, { home, platform: process.platform, initializeProfile });

    expect(result.configurationRoot).toBe(resolveExpected(".a1", "agent"));
    expect(result.environment).toMatchObject({
      PI_CODING_AGENT_DIR: result.configurationRoot,
      ANTHROPIC_API_KEY: "provider-secret",
      PATH: "fixture-path",
      AI_AGENT: "pi",
      PI_CODING_AGENT: "true",
    });
    expect(initializeProfile).toHaveBeenCalledExactlyOnceWith(result.configurationRoot);
  });

  it("removes the override for vanilla Pi without initializing another profile", async () => {
    const initializeProfile = vi.fn();
    const result = await prepareInteractiveLaunch(interactiveLaunchIntent("pi"), {
      PI_CODING_AGENT_DIR: "inherited-must-be-removed",
      OPENAI_API_KEY: "provider-secret",
    }, { home, platform: process.platform, initializeProfile });

    expect(result.configurationRoot).toBeNull();
    expect(result.environment.PI_CODING_AGENT_DIR).toBeUndefined();
    expect(result.environment.OPENAI_API_KEY).toBe("provider-secret");
    expect(initializeProfile).not.toHaveBeenCalled();
  });
});

describe("independent interactive host identity", () => {
  it.each(["win32", "linux"] as const)("retires parent authority only in the new %s host", platform => {
    const parent = {
      AI_AGENT: "other", PI_CODING_AGENT: "false",
      FM_PI_SESSION_PID: "123", FM_PI_SESSION_START: "456",
      PI_SESSION_ID: "parent", PI_SESSION_FILE: "/parent.jsonl",
      PI_PROVIDER: "old-provider", PI_MODEL: "old-model", PI_REASONING_LEVEL: "high",
      FM_HOME: "/operational-home", PI_CODING_AGENT_DIR: "/a1-profile", PATH: "/commands",
    };
    const child = { ...parent };
    initializeInteractiveProcessIdentity(child, platform);
    expect(child).toEqual({
      AI_AGENT: "pi", PI_CODING_AGENT: "true", FM_HOME: "/operational-home",
      PI_CODING_AGENT_DIR: "/a1-profile", PATH: "/commands",
    });
    expect(parent.FM_PI_SESSION_PID).toBe("123");
    // Invariant: Firstmate's own publication must survive same-process sessions and ordinary helpers.
    Object.assign(child, { FM_PI_SESSION_PID: "789", FM_PI_SESSION_START: "999" });
    expect({ ...child }.FM_PI_SESSION_PID).toBe("789");
  });

  it("removes Windows case aliases before publishing canonical markers", () => {
    const environment = { fm_pi_session_pid: "123", Fm_Pi_Session_Start: "456", pi_model: "parent", ai_agent: "other", pi_coding_agent: "false" };
    initializeInteractiveProcessIdentity(environment, "win32");
    expect(environment).toEqual({ AI_AGENT: "pi", PI_CODING_AGENT: "true" });
  });
});

function resolveExpected(...segments: string[]): string {
  const separator = process.platform === "win32" ? "\\" : "/";
  return `${home}${separator}${segments.join(separator)}`;
}
