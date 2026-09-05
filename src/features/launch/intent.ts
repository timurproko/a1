import { sessionSelectionArguments, type SessionSelection, type LaunchProfileId } from "../../foundation/lifecycle/index.js";

export { parseSessionSelection } from "../../foundation/lifecycle/index.js";
export type { LaunchProfileId, SessionSelection } from "../../foundation/lifecycle/index.js";

export interface InteractiveLaunchIntent {
  readonly kind: "interactive";
  readonly profileId: LaunchProfileId;
  readonly sessionSelection?: SessionSelection;
}

export type LaunchIntent = InteractiveLaunchIntent;

export function interactiveLaunchIntent(profileId: LaunchProfileId, sessionSelection?: SessionSelection): InteractiveLaunchIntent {
  if (sessionSelection !== undefined && profileId !== "a1") throw new Error("session selection requires the normal A1 profile");
  sessionSelectionArguments(sessionSelection);
  return Object.freeze({ kind: "interactive", profileId, ...(sessionSelection === undefined ? {} : { sessionSelection }) });
}
