import { describe, expect, it } from "vitest";
import { interactiveLaunchIntent, type LaunchProfileId } from "../../../src/features/launch/index.js";

describe("interactive launch intents", () => {
  it.each(["a1", "pi"] as const)("defines the %s profile", profileId => {
    const typed: LaunchProfileId = profileId;
    expect(interactiveLaunchIntent(typed)).toEqual({ kind: "interactive", profileId });
  });

  it("supports fresh and selected A1 launches but keeps comparison sessions separate", () => {
    expect(interactiveLaunchIntent("a1", { target: "saved-id", sessionDir: "D:/my sessions" }))
      .toEqual({ kind: "interactive", profileId: "a1", sessionSelection: { target: "saved-id", sessionDir: "D:/my sessions" } });
    expect(() => interactiveLaunchIntent("pi", { target: "saved-id" })).toThrow(/A1 profile/);
  });
});
