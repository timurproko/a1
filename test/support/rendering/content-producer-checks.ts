import { expect } from "vitest";
import { stripAnsi } from "../../../src/ui/components/text.js";
import type { CONTENT_RENDERING_WORKLOADS } from "./content-workloads.js";
import { runRenderingProducer, type RenderingProducerResult } from "./rendering-producer.js";
import { classifyTerminalPaint, replayTerminalCheckpoints, replayTerminalPaint } from "./terminal-paint-evidence.js";

const text = (rows: readonly string[]) => rows.map(stripAnsi).join("\n");
const requiredFinal = ["EARLIER_CONTENT", "COMMENTARY_CONTENT", "THINKING_CONTENT", "preserved", "FINAL_REQUIRED", "AUTHORITATIVE_DIFF", "POST_TOOLS_CONTENT"];

/** Check intermediate content independently from the eventual recovered final frame. */
function contentGate(result: RenderingProducerResult, frames: readonly { rows: readonly string[] }[]) {
  const live = result.checkpoints.findIndex(checkpoint => checkpoint.name === "live-paint");
  if (live < 0 || !text(frames[live]!.rows).includes("LIVE_REQUIRED_63")) throw new Error("live output missing after arguments completed");
  for (const name of ["before-settlement", "after-settlement", "scheduled-drain"]) {
    const index = result.checkpoints.findIndex(checkpoint => checkpoint.name === name);
    if (index < 0) continue;
    for (const marker of requiredFinal) if (!text(frames[index]!.rows).includes(marker)) throw new Error(`${name}: missing ${marker}`);
  }
  const retained = new Set<string>();
  for (const presentation of result.presentations ?? []) {
    const rows = text(presentation.rows);
    for (const marker of requiredFinal) {
      if (rows.includes(marker)) retained.add(marker);
      if (retained.has(marker) && !rows.includes(marker)) throw new Error(`transient retained-content omission: ${marker}`);
    }
  }
}

/** Shared content gate for separate smoke and full-suite owners; no duplicate producer captures within a scope. */
export async function verifyScheduledContent(workload: (typeof CONTENT_RENDERING_WORKLOADS)[number]): Promise<void> {
    const results: RenderingProducerResult[] = [];
    for (const producer of ["bare-a1", "pinned-pi"] as const) {
      const result = await runRenderingProducer({ producer, mode: "fullscreen", workloadId: workload.id, presentation: "scheduled",
        state: { profileId: producer === "bare-a1" ? "a1" : "pi", cwd: process.cwd(), theme: "dark", columns: workload.columns, rows: workload.rows, synchronizedUpdates: true } });
      results.push(result);
      const frames = await replayTerminalCheckpoints(result.writes, result.checkpoints);
      contentGate(result, frames);
      const final = result.checkpoints.at(-1)!;
      expect(final.transcript.filter(block => block.kind === "assistant")).toHaveLength(2);
      expect(final.transcript.filter(block => block.kind === "tool-result")).toHaveLength(2);
      expect(final.transcript.some(block => block.text.includes("EARLIER_CONTENT"))).toBe(true);
      const honored = await replayTerminalPaint(result.writes, { columns: workload.columns, rows: workload.rows, synchronizedUpdates: "honor", captureStyles: true });
      const ignored = await replayTerminalPaint(result.writes, { columns: workload.columns, rows: workload.rows, synchronizedUpdates: "ignore", captureStyles: true });
      expect(ignored.final).toEqual(honored.final);
      expect(ignored.finalStyles).toEqual(honored.finalStyles);
      expect(honored.finalStyles!.length).toBeGreaterThan(0);
      if (producer === "bare-a1") {
        expect(result.presentations!.length).toBeLessThan(32);
        expect(result.presentations!.some(frame => frame.blocks.some(block => block.id === "tool-edit" && block.semanticRevision > 0))).toBe(true);
        expect(result.presentations!.some(frame => frame.documentRange !== null)).toBe(true);
        expect(result.writes.some((write, index) => write.damageDecision?.frameId != null
          && result.presentations!.some(frame => frame.frameId === write.damageDecision!.frameId && frame.writeStart <= index))).toBe(true);
        expect(frames.at(-1)!.rows.some(row => row.includes("❯ x"))).toBe(true);
        expect(classifyTerminalPaint(result.writes.slice(result.checkpoints[0]!.writeEnd)).fullScreenClears).toBe(0);
        // Invariant: a later correct final snapshot cannot hide an omitted live or intermediate surface.
        const missingLive = frames.map((frame, index) => index === result.checkpoints.findIndex(checkpoint => checkpoint.name === "live-paint")
          ? { ...frame, rows: frame.rows.map(row => row.replaceAll("LIVE_REQUIRED_63", "")) } : frame);
        expect(() => contentGate(result, missingLive)).toThrow("live output missing");
        const beforeSettlement = result.checkpoints.findIndex(checkpoint => checkpoint.name === "before-settlement");
        for (const marker of ["EARLIER_CONTENT", "FINAL_REQUIRED", "AUTHORITATIVE_DIFF"]) {
          const omitted = frames.map((frame, index) => index === beforeSettlement ? { ...frame, rows: frame.rows.map(row => row.replaceAll(marker, "")) } : frame);
          expect(() => contentGate(result, omitted)).toThrow(`missing ${marker}`);
        }
        const presentations = [...result.presentations!];
        const last = presentations.at(-1)!;
        presentations.splice(presentations.length - 1, 0, { ...last, rows: [] });
        expect(() => contentGate({ ...result, presentations }, frames)).toThrow("transient retained-content omission");
        for (const marker of ["FINAL_REQUIRED", "AUTHORITATIVE_DIFF"]) {
          const stale = [...result.presentations!];
          stale.splice(stale.length - 1, 0, { ...last, rows: last.rows.map(row => row.replaceAll(marker, "STALE_CACHED_CONTENT")) });
          expect(() => contentGate({ ...result, presentations: stale }, frames)).toThrow(`transient retained-content omission: ${marker}`);
        }
      }
    }
    expect(results[0]!.processId).not.toBe(results[1]!.processId);
}
