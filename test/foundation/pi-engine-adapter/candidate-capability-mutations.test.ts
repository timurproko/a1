import { describe, expect, it } from "vitest";
import {
  PiCapabilityCompatibilityError,
  REQUIRED_PI_CAPABILITY_OPERATIONS,
  validatePiCapabilityResults,
  type PiCapabilityConformanceResult,
} from "../../../src/foundation/pi-engine-adapter/index.js";

function accepted(): PiCapabilityConformanceResult[] {
  return Object.entries(REQUIRED_PI_CAPABILITY_OPERATIONS).map(([capability, operations]) => ({ capability, operations, passed: true }));
}

describe("Pi candidate capability mutations", () => {
  it.each(Object.keys(REQUIRED_PI_CAPABILITY_OPERATIONS))("fails closed when %s is removed", capability => {
    const results = accepted().filter(result => result.capability !== capability);
    expectFailure(() => validatePiCapabilityResults("9.8.7", results), capability);
  });

  it.each(Object.keys(REQUIRED_PI_CAPABILITY_OPERATIONS))("fails closed when %s changes incompatibly", capability => {
    const results = accepted().map(result => result.capability === capability ? { ...result, passed: false } : result);
    expectFailure(() => validatePiCapabilityResults("9.8.7", results), capability);
  });

  it("names the exact missing operation", () => {
    const results = accepted();
    results[0] = { ...results[0]!, operations: results[0]!.operations.slice(1) };
    try {
      validatePiCapabilityResults("9.8.7", results);
      throw new Error("expected mutation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(PiCapabilityCompatibilityError);
      expect(error).toMatchObject({ packageVersion: "9.8.7", capability: "public-exports", operation: "services.create" });
    }
  });
});

function expectFailure(run: () => void, capability: string): void {
  try {
    run();
    throw new Error("expected mutation failure");
  } catch (error) {
    expect(error).toBeInstanceOf(PiCapabilityCompatibilityError);
    expect(error).toMatchObject({ packageVersion: "9.8.7", capability });
    expect((error as Error).message).toContain("operation");
  }
}
