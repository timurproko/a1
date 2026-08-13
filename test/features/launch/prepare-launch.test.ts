import { describe, expect, it, vi } from "vitest";
import { interactiveLaunchIntent, prepareInteractiveLaunch } from "../../../src/features/launch/index.js";

const home = process.platform === "win32" ? "C:\\fixture-home" : "/fixture-home";

describe("prepared Pi launch environment", () => {
  it("sets the AddOne agent profile and preserves provider credentials", async () => {
    const initializeProfile = vi.fn(async (root: string) => ({ root, directories: [] }));
    const result = await prepareInteractiveLaunch(interactiveLaunchIntent("addone"), {
      PI_CODING_AGENT_DIR: "inherited-must-change",
      ANTHROPIC_API_KEY: "provider-secret",
      PATH: "fixture-path",
    }, { home, platform: process.platform, initializeProfile });

    expect(result.configurationRoot).toBe(resolveExpected(".a1", "agent"));
    expect(result.environment).toMatchObject({
      PI_CODING_AGENT_DIR: result.configurationRoot,
      ANTHROPIC_API_KEY: "provider-secret",
      PATH: "fixture-path",
      ADDONE_LAUNCH_ARGUMENTS_JSON: "[]",
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
    expect(result.piArguments).toEqual([]);
    expect(initializeProfile).not.toHaveBeenCalled();
  });

  it("sets the sandbox profile and one-run project trust denial", async () => {
    const initializeProfile = vi.fn(async (root: string) => ({ root, directories: [] }));
    const result = await prepareInteractiveLaunch(interactiveLaunchIntent("sandbox"), {
      GEMINI_API_KEY: "provider-secret",
    }, { home, platform: process.platform, initializeProfile });

    expect(result.configurationRoot).toBe(resolveExpected(".a1", "sandbox"));
    expect(result.environment.PI_CODING_AGENT_DIR).toBe(result.configurationRoot);
    expect(result.environment.GEMINI_API_KEY).toBe("provider-secret");
    expect(result.piArguments).toEqual(["--no-approve"]);
    expect(result.environment.ADDONE_LAUNCH_ARGUMENTS_JSON).toBe('["--no-approve"]');
    expect(initializeProfile).toHaveBeenCalledExactlyOnceWith(result.configurationRoot);
  });
});

function resolveExpected(...segments: string[]): string {
  const separator = process.platform === "win32" ? "\\" : "/";
  return `${home}${separator}${segments.join(separator)}`;
}
