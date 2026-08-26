import type { LaunchProfileId } from "../../foundation/lifecycle/index.js";

export type { LaunchProfileId } from "../../foundation/lifecycle/index.js";

export interface InteractiveLaunchIntent {
  readonly kind: "interactive";
  readonly profileId: LaunchProfileId;
}

export type LaunchIntent = InteractiveLaunchIntent;

export function interactiveLaunchIntent(profileId: LaunchProfileId): InteractiveLaunchIntent {
  return Object.freeze({ kind: "interactive", profileId });
}
