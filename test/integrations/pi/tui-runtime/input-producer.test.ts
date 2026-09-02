import { describe, expect, it } from "vitest";
import {
  runInputProducer,
  type InputProducerRequest,
} from "../../../support/input-responsiveness/input-producer.js";

function request(testBehavior: InputProducerRequest["testBehavior"] = "run"): InputProducerRequest {
  return {
    producer: "bare-a1",
    workloadId: "smoke-current-state",
    state: { cwd: process.cwd(), columns: 80, rows: 24, theme: "dark" },
    testBehavior,
  };
}

describe("input producer protocol", () => {
  it("returns bounded asynchronous input evidence after readiness", async () => {
    const processIds: number[] = [];
    const result = await runInputProducer(request(), { onSpawn: id => processIds.push(id) });
    expect(result.schema).toBe("a1-input-responsiveness-producer-v1");
    expect(result.processId).toBe(processIds[0]);
    expect(result.checkpoints).toHaveLength(3);
    expect(result.phases.some(event => event.phase === "receipt")).toBe(true);
    expect(result.phases.some(event => event.phase === "write-end" && event.revision > 0)).toBe(true);
    expect(result.restored).toBe(true);
  }, 60_000);

  it.each([
    ["fail", "exit", "completion"],
    ["malformed", "protocol", "protocol"],
    ["missing-checkpoint", "protocol", "protocol"],
  ] as const)("fails closed for %s", async (behavior, kind, phase) => {
    await expect(runInputProducer(request(behavior), { completionTimeoutMs: 20_000 })).rejects.toMatchObject({ kind, phase });
  }, 30_000);

  it("bounds startup and completion hangs and terminates their process trees", async () => {
    await expect(runInputProducer(request("startup-hang"), { startupTimeoutMs: 50 })).rejects.toMatchObject({ kind: "timeout", phase: "startup" });
    await expect(runInputProducer(request("hang"), { completionTimeoutMs: 50 })).rejects.toMatchObject({ kind: "timeout", phase: "completion" });
  }, 20_000);
});
