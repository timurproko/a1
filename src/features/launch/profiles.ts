import type { LaunchProfileId } from "../../foundation/lifecycle/index.js";

export type { LaunchProfileId } from "../../foundation/lifecycle/index.js";
export type ConfigurationRootPolicy = "agent-profile" | "pi-default" | "sandbox-profile";
export type ProjectTrustPolicy = "pi-default" | "ignore";

export interface LaunchProfileContract {
  readonly id: LaunchProfileId;
  readonly productSurface: "agent" | "vanilla-baseline" | "isolated-profile";
  readonly configurationRootPolicy: ConfigurationRootPolicy;
  readonly projectTrust: ProjectTrustPolicy;
  readonly terminalCapability: "owned-ui";
}

const contracts: Readonly<Record<LaunchProfileId, LaunchProfileContract>> = Object.freeze({
  "a1": Object.freeze({
    id: "a1",
    productSurface: "agent",
    configurationRootPolicy: "agent-profile",
    projectTrust: "pi-default",
    terminalCapability: "owned-ui",
  }),
  pi: Object.freeze({
    id: "pi",
    productSurface: "vanilla-baseline",
    configurationRootPolicy: "pi-default",
    projectTrust: "pi-default",
    terminalCapability: "owned-ui",
  }),
  sandbox: Object.freeze({
    id: "sandbox",
    productSurface: "isolated-profile",
    configurationRootPolicy: "sandbox-profile",
    projectTrust: "ignore",
    terminalCapability: "owned-ui",
  }),
});

export function launchProfileContract(id: LaunchProfileId): LaunchProfileContract {
  return contracts[id];
}
