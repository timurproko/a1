import { describe, expect, it } from "vitest";
import { assertInputSmokeContracts } from "../../../support/input-responsiveness/input-smoke-contract.js";
import { captureInputResponsivenessGate } from "../../../support/input-responsiveness/input-gate.js";

const capture = captureInputResponsivenessGate("smoke");

describe("input responsiveness smoke evidence", () => {
  it("captures typing, editing, menu navigation, submit, and stream preemption once per producer", async () => {
    const evidence = await capture;
    expect(evidence.structure).toEqual({ workloadCaptures: 2, deliberateRepeatCaptures: 0, producerLaunches: 3 });
    expect([...evidence.matrices]).toHaveLength(2);
    assertInputSmokeContracts(evidence);
  }, 120_000);
});
