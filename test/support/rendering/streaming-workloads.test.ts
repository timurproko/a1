import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { STREAM_RENDERING_WORKLOADS } from "./streaming-workloads.js";

const REQUIRED_WORKLOADS = [
  "streamed-prose",
  "incomplete-markdown",
  "streamed-thinking",
  "streamed-tool-output",
  "fit-overflow-boundary",
  "long-transcript-follow",
  "resize-during-stream",
  "detached-scroll",
] as const;

describe("deterministic rendering workloads", () => {
  it("declares every required analysis workload with unique named checkpoints", () => {
    expect(STREAM_RENDERING_WORKLOADS.map(workload => workload.id)).toEqual(REQUIRED_WORKLOADS);
    const workloadIds = new Set<string>();
    for (const workload of STREAM_RENDERING_WORKLOADS) {
      expect(workloadIds.has(workload.id)).toBe(false);
      workloadIds.add(workload.id);
      expect(workload.description.length).toBeGreaterThan(20);
      expect(workload.columns).toBeGreaterThan(20);
      expect(workload.rows).toBeGreaterThan(5);
      expect(workload.steps.length).toBeGreaterThan(1);
      const checkpoints = new Set<string>();
      let previousAt = -1;
      for (const step of workload.steps) {
        expect(step.atMs).toBeGreaterThanOrEqual(previousAt);
        previousAt = step.atMs;
        expect(step.checkpoint).toMatch(/^[a-z0-9-]+$/);
        expect(checkpoints.has(step.checkpoint)).toBe(false);
        checkpoints.add(step.checkpoint);
      }
    }
  });

  it("uses semantic source events and physical actions without production row comparison", async () => {
    const source = await readFile(new URL("./streaming-workloads.ts", import.meta.url), "utf8");
    expect(source).not.toContain("src/");
    expect(source).not.toMatch(/render\(|stripAnsi|visibleWidth|terminal rows differ/u);
    for (const workload of STREAM_RENDERING_WORKLOADS) {
      for (const step of workload.steps) {
        if (step.action.type !== "event") continue;
        expect(typeof step.action.value.type).toBe("string");
      }
    }
  });

  it("covers structural and interaction actions separately from stream events", () => {
    const resize = STREAM_RENDERING_WORKLOADS.find(workload => workload.id === "resize-during-stream");
    const detached = STREAM_RENDERING_WORKLOADS.find(workload => workload.id === "detached-scroll");
    expect(resize?.steps.some(step => step.action.type === "resize")).toBe(true);
    expect(detached?.steps.some(step => step.action.type === "input")).toBe(true);
    expect(STREAM_RENDERING_WORKLOADS.find(workload => workload.id === "fit-overflow-boundary")?.steps
      .some(step => step.action.type === "event" && step.action.value.type === "queue_update")).toBe(true);
  });
});
