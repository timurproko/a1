import { describe, expect, it } from "vitest";
import { interactiveLaunchIntent, launchProfileContract, type LaunchProfileId } from "../../../src/features/launch/index.js";

const expected = {
  "a1": {
    id: "a1",
    productSurface: "agent",
    configurationRootPolicy: "agent-profile",
    projectTrust: "pi-default",
    terminalCapability: "owned-ui",
  },
  pi: {
    id: "pi",
    productSurface: "vanilla-baseline",
    configurationRootPolicy: "pi-default",
    projectTrust: "pi-default",
    terminalCapability: "owned-ui",
  },
  sandbox: {
    id: "sandbox",
    productSurface: "isolated-profile",
    configurationRootPolicy: "sandbox-profile",
    projectTrust: "ignore",
    terminalCapability: "owned-ui",
  },
} as const;

describe("launch profile contracts", () => {
  it.each(Object.keys(expected) as LaunchProfileId[])("defines %s without terminal implementation policy", id => {
    expect(launchProfileContract(id)).toEqual(expected[id]);
    expect(interactiveLaunchIntent(id)).toEqual({ kind: "interactive", profile: expected[id] });
  });

  it("keeps bare A1 as the owned agent surface and sandbox as profile isolation", () => {
    expect(launchProfileContract("a1")).toMatchObject({
      productSurface: "agent",
      terminalCapability: "owned-ui",
    });
    expect(launchProfileContract("sandbox")).toMatchObject({
      productSurface: "isolated-profile",
      projectTrust: "ignore",
      terminalCapability: "owned-ui",
    });
    expect(JSON.stringify(expected)).not.toMatch(/pty|renderer|security-boundary|a1 agent/i);
  });
});
