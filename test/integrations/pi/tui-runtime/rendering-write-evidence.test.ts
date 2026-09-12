import { describe, expect, it } from "vitest";
import { DamageAwareTerminalAdapter, type PiTuiDamageFrameDescriptor } from "../../../../src/integrations/pi/tui-runtime/index.js";
import { readVisibleHyperlinks } from "../../../../src/ui/components/visible-hyperlinks.js";
import { RecordingRenderingTerminal } from "../../../support/rendering/recording-rendering-terminal.js";
import { evaluateRenderingBudgets } from "../../../support/rendering/rendering-budgets.js";
import { summarizeRenderingProducer, type RenderingMatrixResult } from "../../../support/rendering/rendering-matrix.js";
import { isRenderingDamageDecision, type RenderingDamageDecision, type RenderingProducerCheckpoint, type RenderingProducerResult } from "../../../support/rendering/rendering-producer.js";

const SAFE = { overlayActive: false, selectionActive: false, replacementSurfaceActive: false };
const ROWS = ["A", "B", "C", "D", "E", "F", "editor", "footer"];
const CURSOR = "\u001b[?2026h\u001b[7;1H\u001b[?25l\u001b[?2026l";

function descriptor(frameId: number, shift = 0): PiTuiDamageFrameDescriptor {
  return { frameId, width: 40, height: 8, transcript: { rowStart: 1, rowEnd: 6 }, dock: { rowStart: 7, rowEnd: 8 },
    verticalShiftRows: shift, safeVerticalShift: shift > 0, cause: shift > 0 ? "follow-shift" : "steady" };
}

function rowsWrite(rows: readonly string[]): string {
  return `\u001b[?2026h${rows.map((row, index) => `\u001b[${index + 1};1H\u001b[2K${row}`).join("")}\u001b[7;1H\u001b[?25l\u001b[?2026l`;
}

function fixture() {
  const terminal = new RecordingRenderingTerminal(40, 8);
  const adapter = new DamageAwareTerminalAdapter(terminal, { regionalScroll: true, inspectHyperlinks: readVisibleHyperlinks });
  terminal.observeDamageDecisions(() => adapter.lastDecision);
  const checkpoint = (name: string): RenderingProducerCheckpoint => ({
    name, atMs: 1, writeEnd: terminal.writes.length, columns: 40, rows: 8, transcript: [], damageDecision: adapter.lastDecision,
  });
  terminal.setClock(0, "initial");
  adapter.arm(descriptor(1), SAFE);
  adapter.write(rowsWrite(ROWS));
  const initial = checkpoint("initial");
  terminal.setClock(1, "link-tail-settled");
  const result = (name = "link-tail-settled"): RenderingProducerResult => ({
    producer: "bare-a1", processId: 1, effectiveMode: "fullscreen",
    state: { profileId: "a1", cwd: ".", theme: "dark", columns: 40, rows: 8, synchronizedUpdates: true },
    writes: [...terminal.writes], checkpoints: [initial, checkpoint(name)],
  });
  return { terminal, adapter, result };
}

async function matrix(result: RenderingProducerResult): Promise<RenderingMatrixResult> {
  return {
    schema: "a1-rendering-stability-matrix-v1", workloadId: "streamed-prose", geometry: { columns: 40, rows: 8 },
    defaultMode: [await summarizeRenderingProducer(result, "regular")], fullscreenMode: [],
    comparisonSemanticParity: { regular: true, fullscreen: true },
    findings: { customViewportMaximumRowClearsPerStreamCheckpoint: 0, customViewportUnexpectedFullScreenClears: 0, safeShiftCheckpoints: [], dockGeometry: [] },
  };
}

describe("write-local rendering evidence", () => {
  it("keeps a bounded cleanup associated with its write after a cursor-only frame overwrites lastDecision", async () => {
    const { adapter, result } = fixture();
    adapter.requestHyperlinkCleanup();
    adapter.arm(descriptor(2), SAFE);
    adapter.write(rowsWrite(ROWS));
    adapter.arm(descriptor(3), SAFE);
    adapter.write(CURSOR);
    expect(adapter.lastDecision.reason).toBe("unsafe-frame");

    const captured = await matrix(result());
    const settled = captured.defaultMode[0]!.checkpoints[1]!;
    expect(settled.paint.fullScreenClears).toBe(0);
    expect(settled.writePaints?.map(write => [write.writeIndex, write.paint.fullScreenClears, write.damageDecision?.reason]))
      .toEqual([[1, 0, "hyperlink-cleanup"], [2, 0, "unsafe-frame"]]);
    expect(evaluateRenderingBudgets(captured)).toEqual({ passed: true, violations: [] });
  });

  it.each(["before", "after"] as const)("rejects an unapproved direct clear %s an allowed cleanup in the same checkpoint", async order => {
    const { terminal, adapter, result } = fixture();
    if (order === "before") terminal.clearScreen();
    adapter.requestHyperlinkCleanup();
    adapter.arm(descriptor(2), SAFE);
    adapter.write(rowsWrite(ROWS));
    if (order === "after") {
      terminal.clearScreen();
      terminal.write(rowsWrite(ROWS));
    }
    expect(adapter.lastDecision.reason).toBe("hyperlink-cleanup");
    const captured = await matrix(result());
    const violations = evaluateRenderingBudgets(captured).violations;
    const label = "streamed-prose/bare-a1/regular/link-tail-settled";
    expect(violations).toEqual([
      // Invariant: a bypassed direct clear can also leave a blank frame now that
      // legitimate cleanup no longer republishes unrelated unchanged rows.
      ...(order === "before" ? [`${label}: blank final cell frame`] : []),
      `${label}/write-${order === "before" ? 1 : 2}: unexpected full-screen clear`,
    ]);
  });

  it("does not use a checkpoint-level cleanup label when the clearing write lacks attribution", async () => {
    const { adapter, result } = fixture();
    adapter.requestHyperlinkCleanup();
    adapter.arm(descriptor(2), SAFE);
    adapter.write(rowsWrite(ROWS));
    const raw = result();
    const captured = await matrix({ ...raw, writes: raw.writes.map(({ damageDecision: _decision, ...write }, index) => index !== 1 ? write : {
      ...write, data: rowsWrite(ROWS).replace("\u001b[?2026h", "\u001b[?2026h\u001b[2J"),
    }) });
    expect(captured.defaultMode[0]!.checkpoints[1]!.damageDecision?.reason).toBe("hyperlink-cleanup");
    expect(evaluateRenderingBudgets(captured).violations).toEqual([
      "streamed-prose/bare-a1/regular/link-tail-settled/write-1: unexpected full-screen clear",
    ]);
  });

  it("rejects omitted per-write evidence even when the remaining write looks harmless", async () => {
    const { terminal, adapter, result } = fixture();
    terminal.clearScreen();
    terminal.write(rowsWrite(ROWS));
    adapter.arm(descriptor(2), SAFE);
    adapter.write(CURSOR);
    const captured = await matrix(result());
    const producer = captured.defaultMode[0]!;
    const corrupted = { ...captured, defaultMode: [{ ...producer, checkpoints: producer.checkpoints.map((checkpoint, index) => index === 0 ? checkpoint : {
      ...checkpoint, writePaints: checkpoint.writePaints!.slice(1),
    }) }] };
    expect(evaluateRenderingBudgets(corrupted).violations).toEqual([
      "streamed-prose/bare-a1/regular/link-tail-settled: missing or inconsistent per-write paint evidence",
    ]);
  });

  it("validates a transformed write independently of a later cursor-only frame", async () => {
    const { adapter, result } = fixture();
    adapter.arm(descriptor(2, 1), SAFE);
    adapter.write(rowsWrite(["B", "C", "D", "E", "F", "G"]));
    adapter.arm(descriptor(3), SAFE);
    adapter.write(CURSOR);
    const raw = result();
    expect(raw.writes[1]!.damageDecision?.reason).toBe("transformed");
    expect(evaluateRenderingBudgets(await matrix(raw)).passed).toBe(true);
    const corrupted = { ...raw, writes: raw.writes.map((write, index) => index !== 1 ? write : {
      ...write, damageDecision: { ...write.damageDecision!, shiftRows: 3, paintedRows: [] },
    }) };
    expect(evaluateRenderingBudgets(await matrix(corrupted)).violations).toEqual([
      "streamed-prose/bare-a1/regular/link-tail-settled/write-1: transformed shift disagrees with terminal movement",
      "streamed-prose/bare-a1/regular/link-tail-settled/write-1: transformed paint cleared undeclared rows",
      "streamed-prose/bare-a1/regular/link-tail-settled/write-1: transformed paint addressed undeclared rows",
    ]);
  });

  it("rejects cleanup-tagged clears for code and paths while retaining structural resize allowance", async () => {
    const { adapter, result } = fixture();
    adapter.requestHyperlinkCleanup();
    adapter.arm(descriptor(2), SAFE);
    adapter.write(rowsWrite(ROWS));
    const withClear = (name?: string): RenderingProducerResult => {
      const raw = result(name);
      return { ...raw, writes: raw.writes.map((write, index) => index !== 1 ? write : {
        ...write, data: rowsWrite(ROWS).replace("\u001b[?2026h", "\u001b[?2026h\u001b[2J"),
      }) };
    };
    const captured = await matrix(withClear());
    for (const workloadId of ["streamed-prose", "streamed-code-block", "link-bearing-prose"]) {
      expect(evaluateRenderingBudgets({ ...captured, workloadId }).violations
        .some(message => message.includes("write-1: unexpected full-screen clear"))).toBe(true);
    }
    const structural = await matrix(withClear("resize-structural"));
    expect(evaluateRenderingBudgets({ ...structural, workloadId: "resize-during-stream" }).passed).toBe(true);
  });

  it("rejects a clear attributed to redundant-clear suppression", async () => {
    const { adapter, result } = fixture();
    adapter.requestHyperlinkCleanup();
    adapter.arm(descriptor(2), SAFE);
    adapter.write(rowsWrite(ROWS));
    const raw = result();
    const corrupted = { ...raw, writes: raw.writes.map((write, index) => index !== 1 ? write : {
      ...write, data: rowsWrite(ROWS).replace("\u001b[?2026h", "\u001b[?2026h\u001b[2J"),
      damageDecision: { ...write.damageDecision!, reason: "suppressed-redundant-clear" },
    }) };
    expect(evaluateRenderingBudgets(await matrix(corrupted)).violations.some(message => message.includes("redundant clear was not suppressed"))).toBe(true);
  });

  it("snapshots fresh decisions and does not assign them to later direct writes", () => {
    const terminal = new RecordingRenderingTerminal(40, 8);
    let decision: RenderingDamageDecision = { frameId: 1, transformed: false, reason: "unsafe-frame", shiftRows: 0, paintedRows: [] };
    terminal.observeDamageDecisions(() => decision);
    terminal.write(CURSOR);
    const rows = [1, 2];
    decision = { frameId: 2, transformed: true, reason: "hyperlink-cleanup", shiftRows: 0, paintedRows: rows };
    terminal.write(CURSOR);
    rows.push(3);
    terminal.write(CURSOR);
    expect(terminal.writes.map(write => write.damageDecision?.paintedRows)).toEqual([undefined, [1, 2], undefined]);
  });

  it("leaves comparison producers outside owned damage attribution", async () => {
    const { result } = fixture();
    const raw = result();
    const comparison = { ...raw, producer: "pinned-pi" as const, writes: raw.writes.map(({ damageDecision: _decision, ...write }) => write),
      checkpoints: raw.checkpoints.map(({ damageDecision: _decision, ...checkpoint }) => checkpoint) };
    expect((await summarizeRenderingProducer(comparison, "regular")).checkpoints.every(checkpoint => checkpoint.writePaints === undefined)).toBe(true);
    await expect(summarizeRenderingProducer({ ...comparison, writes: raw.writes }, "regular"))
      .rejects.toThrow("comparison producer entered A1 damage path");
  });

  it("rejects malformed write-decision payloads", () => {
    const valid = { frameId: 1, transformed: true, reason: "hyperlink-cleanup", shiftRows: 0, paintedRows: [1, 2] };
    expect(isRenderingDamageDecision(valid)).toBe(true);
    for (const invalid of [null, {}, { ...valid, frameId: undefined }, { ...valid, transformed: "yes" }, { ...valid, paintedRows: ["1"] }, { ...valid, shiftRows: NaN }]) {
      expect(isRenderingDamageDecision(invalid)).toBe(false);
    }
  });
});
