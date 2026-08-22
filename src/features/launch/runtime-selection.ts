import { assertLaunchProfileId, type LaunchProfileId } from "../../foundation/lifecycle/index.js";

/**
 * Every interactive command is the same composition. What differs is the
 * configuration root each one reads and whether A1's own screens are reachable:
 * bare `a1` is the product, while `a1 pi` and `a1 sandbox` present pinned Pi's
 * interface and nothing of A1's own, against Pi's own profile and against an
 * isolated one.
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
