import { describe, expect, it } from "vitest";
import {
  configureOwnedHttpDispatcher,
  configuredOwnedHttpIdleTimeoutMs,
} from "../../../../src/integrations/pi/engine/index.js";

describe("owned Pi HTTP dispatcher", () => {
  it("applies sequential profiles and preserves zero's disabled semantics", () => {
    configureOwnedHttpDispatcher(30_000);
    expect(configuredOwnedHttpIdleTimeoutMs()).toBe(30_000);
    configureOwnedHttpDispatcher(0);
    expect(configuredOwnedHttpIdleTimeoutMs()).toBe(0);
    configureOwnedHttpDispatcher(120_000);
    expect(configuredOwnedHttpIdleTimeoutMs()).toBe(120_000);
  });

  it("rejects immediate-timeout and malformed values", () => {
    expect(() => configureOwnedHttpDispatcher(-1)).toThrow("invalid");
    expect(() => configureOwnedHttpDispatcher(0.5)).toThrow("invalid");
  });
});
