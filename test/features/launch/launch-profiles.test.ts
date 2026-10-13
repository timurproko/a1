import { describe, expect, it } from "vitest";
import { interactiveLaunchIntent, type LaunchProfileId } from "../../../src/features/launch/index.js";

describe("interactive launch intents", () => {
  it.each(["a1", "pi"] as const)("defines the %s profile", profileId => {
    const typed: LaunchProfileId = profileId;
    expect(interactiveLaunchIntent(typed)).toEqual({
      kind: "interactive",
      profileId,
      launchMode: profileId === "a1" ? "tabs" : "solo",
    });
  });

  it("supports an explicit solo A1 launch", () => {
    expect(interactiveLaunchIntent("a1", undefined, "solo")).toEqual({
      kind: "interactive", profileId: "a1", launchMode: "solo",
    });
  });
});
