import { describe, expect, it } from "vitest";
import { interactiveLaunchIntent, type LaunchProfileId } from "../../../src/features/launch/index.js";

describe("interactive launch intents", () => {
  it.each(["a1", "pi"] as const)("defines the %s profile", profileId => {
    const typed: LaunchProfileId = profileId;
    expect(interactiveLaunchIntent(typed)).toEqual({ kind: "interactive", profileId });
  });
});
