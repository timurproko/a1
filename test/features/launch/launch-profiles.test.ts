import { describe, expect, it } from "vitest";
import { interactiveLaunchIntent, launchProfileContract, type LaunchProfileId } from "../../../src/features/launch/index.js";

const expected = {
  addone: {
    id: "addone",
    productSurface: "agent",
    piConfigurationRoot: "addone-agent",
    projectTrust: "pi-default",
    terminalCapability: "owned-ui",
  },
  pi: {
    id: "pi",
    productSurface: "vanilla-baseline",
    piConfigurationRoot: "pi-default",
    projectTrust: "pi-default",
    terminalCapability: "transparent",
  },
  sandbox: {
    id: "sandbox",
    productSurface: "isolated-profile",
    piConfigurationRoot: "addone-sandbox",
    projectTrust: "ignore",
    terminalCapability: "transparent",
  },
} as const;

describe("launch profile contracts", () => {
  it.each(Object.keys(expected) as LaunchProfileId[])("defines %s without terminal implementation policy", id => {
    expect(launchProfileContract(id)).toEqual(expected[id]);
    expect(interactiveLaunchIntent(id)).toEqual({ kind: "interactive", profile: expected[id] });
  });

  it("keeps bare AddOne as the owned agent surface and sandbox as profile isolation", () => {
    expect(launchProfileContract("addone")).toMatchObject({
      productSurface: "agent",
      terminalCapability: "owned-ui",
    });
    expect(launchProfileContract("sandbox")).toMatchObject({
      productSurface: "isolated-profile",
      projectTrust: "ignore",
      terminalCapability: "transparent",
    });
    expect(JSON.stringify(expected)).not.toMatch(/pty|renderer|security-boundary|a1 agent/i);
  });
});
