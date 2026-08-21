import { assertLaunchProfileId, type LaunchProfileId } from "../../foundation/lifecycle/index.js";

export type TransparentInteractiveProfileId = Exclude<LaunchProfileId, "a1">;

export type InteractiveRuntimeSelection =
  | { readonly kind: "owned-ui"; readonly profileId: Extract<LaunchProfileId, "a1"> }
  | { readonly kind: "transparent"; readonly profileId: TransparentInteractiveProfileId };

export interface InteractiveRuntimeRunners {
  readonly ownedUi: (profileId: Extract<LaunchProfileId, "a1">) => Promise<number>;
  readonly transparent: (profileId: TransparentInteractiveProfileId) => Promise<number>;
}

export function selectInteractiveRuntime(profileId: string): InteractiveRuntimeSelection {
  assertLaunchProfileId(profileId);
  return profileId === "a1"
    ? Object.freeze({ kind: "owned-ui", profileId: "a1" })
    : Object.freeze({ kind: "transparent", profileId });
}

export async function runSelectedInteractiveRuntime(
  profileId: string,
  runners: InteractiveRuntimeRunners,
): Promise<number> {
  const selection = selectInteractiveRuntime(profileId);
  return selection.kind === "owned-ui"
    ? await runners.ownedUi(selection.profileId)
    : await runners.transparent(selection.profileId);
}
