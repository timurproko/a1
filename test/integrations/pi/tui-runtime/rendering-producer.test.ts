import { describe, expect, it } from "vitest";
import { runRenderingProducer, type RenderingProducerRequest } from "../../../support/rendering/rendering-producer.js";
import { STREAM_RENDERING_WORKLOADS } from "../../../support/rendering/streaming-workloads.js";

const prose = STREAM_RENDERING_WORKLOADS.find(workload => workload.id === "streamed-prose")!;

function request(testBehavior: RenderingProducerRequest["testBehavior"] = "run"): RenderingProducerRequest {
  return {
    producer: "pinned-pi",
    mode: "regular",
    workloadId: prose.id,
    state: { profileId: "pi", cwd: process.cwd(), theme: "dark", columns: prose.columns, rows: prose.rows, synchronizedUpdates: true },
    testBehavior,
  };
}

describe("isolated rendering producer protocol failures", () => {
  it("classifies startup and completion timeouts and terminates each process tree", async () => {
    for (const [testBehavior, options, phase] of [
      ["startup-hang", { startupTimeoutMs: 250 }, "startup"],
      ["hang", { completionTimeoutMs: 250 }, "completion"],
    ] as const) {
      let processId = 0;
      await expect(runRenderingProducer(request(testBehavior), {
        ...options,
        onSpawn: pid => { processId = pid; },
      })).rejects.toMatchObject({ kind: "timeout", diagnostics: { phase } });
      expect(processId).toBeGreaterThan(0);
      expect(() => process.kill(processId, 0)).toThrow();
    }
  }, 30_000);

  it("retains bounded diagnostics for producer failures", async () => {
    await expect(runRenderingProducer(request("fail"))).rejects.toMatchObject({ kind: "exit", diagnostics: { phase: "completion" } });
  }, 120_000);

  it("rejects malformed requests through the isolated protocol", async () => {
    await expect(runRenderingProducer({ ...request(), workloadId: "missing" })).rejects.toMatchObject({ kind: "exit" });
  }, 120_000);
});
