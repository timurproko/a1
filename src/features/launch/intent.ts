import { launchProfileContract, type LaunchProfileContract, type LaunchProfileId } from "./profiles.js";

export interface InteractiveLaunchIntent {
  readonly kind: "interactive";
  readonly profile: LaunchProfileContract;
}

export type LaunchIntent = InteractiveLaunchIntent;

export function interactiveLaunchIntent(profileId: LaunchProfileId): InteractiveLaunchIntent {
  return Object.freeze({ kind: "interactive", profile: launchProfileContract(profileId) });
}
