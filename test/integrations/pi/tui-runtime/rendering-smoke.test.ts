import { describe, expect, it } from "vitest";
import { captureRenderingGate } from "../../../support/rendering/rendering-gate.js";
import { CONTENT_RENDERING_WORKLOADS } from "../../../support/rendering/content-workloads.js";
import { verifyScheduledContent } from "../../../support/rendering/content-producer-checks.js";
import { assertRenderingSmokeContracts, RENDERING_SMOKE_WORKLOADS } from "../../../support/rendering/rendering-smoke-contract.js";

describe("rendering smoke gate", () => {
  it.each(CONTENT_RENDERING_WORKLOADS)("checks scheduled content at $columns x $rows", verifyScheduledContent, 120_000);

  it("covers independent producers, both modes, replay, parity, status, and followed damage", async () => {
    const captured = await captureRenderingGate(RENDERING_SMOKE_WORKLOADS);
    expect(captured.structure).toEqual({ workloadCaptures: 2, deliberateRepeatCaptures: 0, producerLaunches: 12 });
    assertRenderingSmokeContracts(captured.matrices);
  }, 300_000);
});
