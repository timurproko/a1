import { describe, expect, it } from "vitest";
import { runRenderingProducer, type RenderingProducerRequest } from "./rendering-producer.js";
import { STREAM_RENDERING_WORKLOADS } from "./streaming-workloads.js";

const prose = STREAM_RENDERING_WORKLOADS.find(workload => workload.id === "streamed-prose")!;

function request(
  producer: RenderingProducerRequest["producer"],
  mode: RenderingProducerRequest["mode"],
  testBehavior: RenderingProducerRequest["testBehavior"] = "run",
): RenderingProducerRequest {
  return {
    producer,
    mode,
    workloadId: prose.id,
    state: {
      profileId: producer === "bare-a1" ? "a1" : "pi",
      cwd: process.cwd(),
      theme: "dark",
      columns: prose.columns,
      rows: prose.rows,
      synchronizedUpdates: true,
    },
    testBehavior,
  };
}

describe("isolated rendering producers", () => {
  it("runs bare A1, the A1 Pi comparison, and untouched pinned components in separate processes", async () => {
    const results = await Promise.all([
      runRenderingProducer(request("bare-a1", "regular")),
      runRenderingProducer(request("a1-pi", "regular")),
      runRenderingProducer(request("pinned-pi", "regular")),
    ]);

    expect(new Set(results.map(result => result.processId)).size).toBe(3);
    expect(results.map(result => result.effectiveMode)).toEqual(["fullscreen", "regular", "regular"]);
    expect(results.map(result => result.state.profileId)).toEqual(["a1", "pi", "pi"]);
    for (const result of results) {
      expect(result.writes.length).toBeGreaterThan(0);
      expect(result.checkpoints.map(checkpoint => checkpoint.name)).toEqual([
        "initial",
        ...prose.steps.map(step => step.checkpoint),
      ]);
      expect(result.checkpoints.at(-1)?.transcript.some(block => block.text.includes("Stable prose"))).toBe(true);
    }
  }, 30_000);

  it("honors equivalent fullscreen mode for comparison producers", async () => {
    const [comparison, pinned] = await Promise.all([
      runRenderingProducer(request("a1-pi", "fullscreen")),
      runRenderingProducer(request("pinned-pi", "fullscreen")),
    ]);
    expect(comparison.effectiveMode).toBe("fullscreen");
    expect(pinned.effectiveMode).toBe("fullscreen");
    expect(comparison.state).toEqual(pinned.state);
    expect(comparison.checkpoints.map(checkpoint => checkpoint.name)).toEqual(
      pinned.checkpoints.map(checkpoint => checkpoint.name),
    );
  }, 30_000);

  it("bounds producer failures and terminates a timed-out worker", async () => {
    await expect(runRenderingProducer(request("pinned-pi", "regular", "fail"))).rejects.toMatchObject({ kind: "exit" });
    let processId = 0;
    await expect(runRenderingProducer(request("pinned-pi", "regular", "hang"), {
      timeoutMs: 150,
      onSpawn: pid => { processId = pid; },
    })).rejects.toMatchObject({ kind: "timeout" });
    expect(processId).toBeGreaterThan(0);
    expect(() => process.kill(processId, 0)).toThrow();
  }, 30_000);

  it("rejects malformed requests through the isolated protocol", async () => {
    const invalid = { ...request("bare-a1", "regular"), workloadId: "missing" };
    await expect(runRenderingProducer(invalid)).rejects.toMatchObject({ kind: "exit" });
  });
});
