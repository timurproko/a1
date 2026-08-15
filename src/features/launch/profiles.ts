import type { LaunchProfileId } from "../../foundation/lifecycle/index.js";

export type { LaunchProfileId } from "../../foundation/lifecycle/index.js";
export type PiConfigurationRootPolicy = "addone-agent" | "pi-default" | "addone-sandbox";
export type ProjectTrustPolicy = "pi-default" | "ignore";

export interface LaunchProfileContract {
  readonly id: LaunchProfileId;
  readonly productSurface: "agent" | "vanilla-baseline" | "isolated-profile";
  readonly piConfigurationRoot: PiConfigurationRootPolicy;
  readonly projectTrust: ProjectTrustPolicy;
  readonly terminalCapability: "owned-ui" | "transparent";
}

const contracts: Readonly<Record<LaunchProfileId, LaunchProfileContract>> = Object.freeze({
  addone: Object.freeze({
    id: "addone",
    productSurface: "agent",
    piConfigurationRoot: "addone-agent",
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
    piConfigurationRoot: "addone-sandbox",
    projectTrust: "ignore",
    terminalCapability: "transparent",
  }),
});

export function launchProfileContract(id: LaunchProfileId): LaunchProfileContract {
  return contracts[id];
}
