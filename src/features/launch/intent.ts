import { sessionSelectionArguments, type SessionSelection } from "../../foundation/lifecycle/session-selection.js";
import type { LaunchProfileId } from "../../foundation/lifecycle/model.js";

export { parseSessionSelection } from "../../foundation/lifecycle/session-selection.js";
export type { SessionSelection } from "../../foundation/lifecycle/session-selection.js";
export type { LaunchProfileId } from "../../foundation/lifecycle/model.js";

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
