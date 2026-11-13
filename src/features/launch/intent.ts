import { interactiveStartupArguments } from "../../foundation/launch-context/index.js";
import { sessionSelectionArguments, type SessionSelection } from "../../foundation/lifecycle/index.js";
import { parseInteractiveLaunchArguments, type InteractiveLaunchArguments } from "./interactive-arguments.js";
import type { LaunchProfileId } from "../../foundation/lifecycle/index.js";

export { parseSessionSelection } from "../../foundation/lifecycle/index.js";
export type { SessionSelection } from "../../foundation/lifecycle/index.js";
export type { LaunchProfileId } from "../../foundation/lifecycle/index.js";

export interface InteractiveLaunchIntent extends InteractiveLaunchArguments {
  readonly kind: "interactive";
  readonly profileId: LaunchProfileId;
  readonly sessionSelection?: SessionSelection;
}

export type LaunchIntent = InteractiveLaunchIntent;

export function interactiveLaunchIntent(
  profileId: LaunchProfileId,
  sessionSelection?: SessionSelection,
  startup: Pick<InteractiveLaunchArguments, "sessionColor" | "promptArguments" | "runtimeOptions"> = {},
): InteractiveLaunchIntent {
  if (sessionSelection !== undefined && profileId !== "a1") {
    throw new Error("session selection requires the A1 profile");
  }
  if (profileId !== "a1" && (startup.sessionColor !== undefined || startup.promptArguments !== undefined || startup.runtimeOptions !== undefined)) throw new Error("startup presentation requires the A1 profile");
  const validated = parseInteractiveLaunchArguments([
    ...sessionSelectionArguments(sessionSelection),
    ...interactiveStartupArguments(startup),
  ]);
  return Object.freeze({ kind: "interactive", profileId, ...validated });
}
