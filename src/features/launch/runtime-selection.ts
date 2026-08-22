import { assertLaunchProfileId, type LaunchProfileId } from "../../foundation/lifecycle/index.js";

export type TransparentInteractiveProfileId = Extract<LaunchProfileId, "sandbox">;
export type OwnedUiProfileId = Exclude<LaunchProfileId, "sandbox">;

export type InteractiveRuntimeSelection =
  | { readonly kind: "owned-ui"; readonly profileId: OwnedUiProfileId; readonly ownedSurfaces: "on" | "off" }
  | { readonly kind: "transparent"; readonly profileId: TransparentInteractiveProfileId };

export interface InteractiveRuntimeRunners {
  readonly ownedUi: (profileId: OwnedUiProfileId, ownedSurfaces: "on" | "off") => Promise<number>;
  readonly transparent: (profileId: TransparentInteractiveProfileId) => Promise<number>;
}

export function selectInteractiveRuntime(profileId: string): InteractiveRuntimeSelection {
  assertLaunchProfileId(profileId);
  // Bare A1 is the product. `a1 pi` is the same rendering with A1's own
  // surfaces withheld, so only pinned Pi's interface is on screen.
  if (profileId === "a1") return Object.freeze({ kind: "owned-ui", profileId: "a1", ownedSurfaces: "on" });
  if (profileId === "pi") return Object.freeze({ kind: "owned-ui", profileId: "pi", ownedSurfaces: "off" });
  return Object.freeze({ kind: "transparent", profileId: "sandbox" });
}

export async function runSelectedInteractiveRuntime(
  profileId: string,
  runners: InteractiveRuntimeRunners,
): Promise<number> {
  const selection = selectInteractiveRuntime(profileId);
  return selection.kind === "owned-ui"
    ? await runners.ownedUi(selection.profileId, selection.ownedSurfaces)
    : await runners.transparent(selection.profileId);
}
