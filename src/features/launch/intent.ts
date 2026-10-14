import { sessionSelectionArguments, type SessionSelection } from "../../foundation/lifecycle/index.js";
import type { LaunchProfileId } from "../../foundation/lifecycle/index.js";

export { parseSessionSelection } from "../../foundation/lifecycle/index.js";
export type { SessionSelection } from "../../foundation/lifecycle/index.js";
export type { LaunchProfileId } from "../../foundation/lifecycle/index.js";

export type InteractiveLaunchMode = "tabs" | "solo";

export interface InteractiveLaunchIntent {
  readonly kind: "interactive";
  readonly profileId: LaunchProfileId;
  readonly launchMode: InteractiveLaunchMode;
  readonly sessionSelection?: SessionSelection;
}

export type LaunchIntent = InteractiveLaunchIntent;

export function interactiveLaunchIntent(
  profileId: LaunchProfileId,
  sessionSelection?: SessionSelection,
  launchMode: InteractiveLaunchMode = profileId === "a1" ? "tabs" : "solo",
): InteractiveLaunchIntent {
  if (sessionSelection !== undefined && (profileId !== "a1" || launchMode === "solo")) {
    throw new Error("session selection requires the normal tabbed A1 launch");
  }
  if (profileId === "pi" && launchMode !== "solo") throw new Error("the Pi comparison launch is always solo");
  sessionSelectionArguments(sessionSelection);
  return Object.freeze({ kind: "interactive", profileId, launchMode, ...(sessionSelection === undefined ? {} : { sessionSelection }) });
}
