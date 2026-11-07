import { assertLaunchProfileId, type LaunchProfileId } from "../../foundation/lifecycle/model.js";

/**
 * Both interactive commands use the owned composition. Bare A1 enables product
 * surfaces; the Pi comparison command withholds them and reads Pi's own profile.
 */
export type OwnedUiProfileId = LaunchProfileId;

export interface InteractiveRuntimeSelection {
  readonly kind: "owned-ui";
  readonly profileId: OwnedUiProfileId;
  readonly productMode: "bare" | "comparison";
}

export interface InteractiveRuntimeRunners {
  readonly ownedUi: (profileId: OwnedUiProfileId, productMode: "bare" | "comparison") => Promise<number>;
}

export function selectInteractiveRuntime(profileId: string): InteractiveRuntimeSelection {
  assertLaunchProfileId(profileId);
  return Object.freeze({
    kind: "owned-ui",
    profileId,
    productMode: profileId === "a1" ? "bare" : "comparison",
  });
}

export async function runSelectedInteractiveRuntime(
  profileId: string,
  runners: InteractiveRuntimeRunners,
): Promise<number> {
  const selection = selectInteractiveRuntime(profileId);
  return await runners.ownedUi(selection.profileId, selection.productMode);
}
