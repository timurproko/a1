import type { LaunchProfileId } from "../../foundation/lifecycle/index.js";

export type { LaunchProfileId } from "../../foundation/lifecycle/index.js";
export type PiConfigurationRootPolicy = "agent-profile" | "pi-default" | "sandbox-profile";
export type ProjectTrustPolicy = "pi-default" | "ignore";

export interface LaunchProfileContract {
  readonly id: LaunchProfileId;
  readonly productSurface: "agent" | "vanilla-baseline" | "isolated-profile";
  readonly piConfigurationRoot: PiConfigurationRootPolicy;
  readonly projectTrust: ProjectTrustPolicy;
  readonly terminalCapability: "owned-ui" | "transparent";
}

const contracts: Readonly<Record<LaunchProfileId, LaunchProfileContract>> = Object.freeze({
  a1: Object.freeze({
    id: "a1",
    productSurface: "agent",
    piConfigurationRoot: "agent-profile",
    projectTrust: "pi-default",
    terminalCapability: "owned-ui",
  }),
  pi: Object.freeze({
    id: "pi",
    productSurface: "vanilla-baseline",
    piConfigurationRoot: "pi-default",
    projectTrust: "pi-default",
    terminalCapability: "transparent",
  }),
  sandbox: Object.freeze({
    id: "sandbox",
    productSurface: "isolated-profile",
    piConfigurationRoot: "sandbox-profile",
    projectTrust: "ignore",
    terminalCapability: "transparent",
  }),
});

export function launchProfileContract(id: LaunchProfileId): LaunchProfileContract {
  return contracts[id];
}
