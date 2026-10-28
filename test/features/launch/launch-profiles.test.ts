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

  it("supports fresh and selected solo A1 launches but keeps comparison sessions separate", () => {
    expect(interactiveLaunchIntent("a1", undefined, "solo")).toEqual({
      kind: "interactive", profileId: "a1", launchMode: "solo",
    });
    expect(interactiveLaunchIntent("a1", { target: "saved-id", sessionDir: "D:/my sessions" }, "solo"))
      .toEqual({ kind: "interactive", profileId: "a1", launchMode: "solo",
        sessionSelection: { target: "saved-id", sessionDir: "D:/my sessions" } });
    expect(() => interactiveLaunchIntent("pi", { target: "saved-id" }, "solo"))
      .toThrow(/A1 profile/);
  });
});
