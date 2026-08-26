import { assertLaunchProfileId, type LaunchProfileId } from "../../foundation/lifecycle/index.js";

/**
 * Both interactive commands use the owned composition. Bare A1 enables product
 * surfaces; the Pi comparison command withholds them and reads Pi's own profile.
 */
export type OwnedUiProfileId = LaunchProfileId;

export interface InteractiveRuntimeSelection {
  readonly kind: "owned-ui";
  readonly profileId: OwnedUiProfileId;
  readonly ownedSurfaces: "on" | "off";
}

export interface InteractiveRuntimeRunners {
  readonly ownedUi: (profileId: OwnedUiProfileId, ownedSurfaces: "on" | "off") => Promise<number>;
}

export function selectInteractiveRuntime(profileId: string): InteractiveRuntimeSelection {
  assertLaunchProfileId(profileId);
  return Object.freeze({
    kind: "owned-ui",
    profileId,
    ownedSurfaces: profileId === "a1" ? "on" : "off",
  });
}

export async function runSelectedInteractiveRuntime(
  profileId: string,
  runners: InteractiveRuntimeRunners,
): Promise<number> {
  const selection = selectInteractiveRuntime(profileId);
  return await runners.ownedUi(selection.profileId, selection.ownedSurfaces);
}
