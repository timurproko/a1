import { getCellDimensions, setCellDimensions, stripTerminalSequences } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SubmittedImagePresentation, suppressClippedSixelRows } from "../../../../src/integrations/pi/components/submitted-image-presentation.js";
import type { PiShellImagePreview } from "../../../../src/integrations/pi/components/shell-shared-facade.js";

const cellDimensions = getCellDimensions();
afterEach(() => setCellDimensions(cellDimensions));

function fixture() {
  const jobs: Array<{ resolve: (result: PiShellImagePreview) => void; reject: (error: Error) => void; cancel: ReturnType<typeof vi.fn> }> = [];
  const preview = vi.fn(() => {
    let resolve!: (result: PiShellImagePreview) => void;
    let reject!: (error: Error) => void;
    const result = new Promise<PiShellImagePreview>((done, fail) => { resolve = done; reject = fail; });
    const cancel = vi.fn();
    jobs.push({ resolve, reject, cancel });
    return { result, cancel };
  });
  const changed = vi.fn();
  const component = new SubmittedImagePresentation(
    "asset", { type: "image", mimeType: "image/png", data: "AQID" }, preview, 60, changed,
  );
  return { jobs, preview, changed, component };
}

describe("submitted image presentation lifetime", () => {
  it("suppresses a late-row Sixel paint whose origin was clipped above the viewport", () => {
    const sixel = "\u001b_Gm=0;\u001b\\\u001b[2A\u001bPq~\u001b\\";
    expect(suppressClippedSixelRows([sixel, "dock"])).toEqual(["", "dock"]);
    expect(suppressClippedSixelRows(["prompt", "", "", sixel])).toEqual(["prompt", "", "", sixel]);
  });

  it("caches width-specific rows and clears derived state on invalidation", async () => {
    const { jobs, preview, component } = fixture();
    expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("preparing preview");
    await Promise.resolve();
    jobs[0]!.resolve({ kind: "cells", rows: ["\u001b[38;2;255;0;0;48;2;0;0;0m▛\u001b[39;49m"] });
    await vi.waitFor(() => expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("▛"));

    component.render(40);
    await Promise.resolve();
    expect(preview).toHaveBeenLastCalledWith("asset", expect.anything(), 38, { widthPx: 9, heightPx: 18 });
    jobs[1]!.resolve({ kind: "cells", rows: ["\u001b[38;2;0;255;0;48;2;0;0;0m▞\u001b[39;49m"] });
    await vi.waitFor(() => expect(stripTerminalSequences(component.render(40).join("\n"))).toContain("▞"));
    component.render(80);
    await Promise.resolve();
    expect(preview).toHaveBeenCalledTimes(2);

    setCellDimensions({ widthPx: 10, heightPx: 20 });
    component.render(80);
    await Promise.resolve();
    expect(preview).toHaveBeenCalledTimes(3);
    component.invalidate();
    expect(jobs[2]!.cancel).toHaveBeenCalledOnce();
    component.render(80);
    await Promise.resolve();
    expect(preview).toHaveBeenCalledTimes(4);
    component.dispose();
    expect(jobs[3]!.cancel).toHaveBeenCalledOnce();
  });

  it("ignores stale completion and fails closed on protocol or width-bearing rows", async () => {
    const { jobs, component, changed } = fixture();
    component.render(80);
    await Promise.resolve();
    component.invalidate();
    expect(jobs[0]!.cancel).toHaveBeenCalledOnce();
    component.render(80);
    await Promise.resolve();
    jobs[0]!.resolve({ kind: "cells", rows: ["\u001b[38;2;255;0;0m▀\u001b[39m"] });
    await Promise.resolve();
    expect(changed).not.toHaveBeenCalled();
    jobs[1]!.resolve({ kind: "cells", rows: ["\u001b_Ga=T;payload\u001b\\"] });
    await vi.waitFor(() => expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("Image unavailable"));
    expect(changed).toHaveBeenCalledOnce();
    component.dispose();
  });

  it("places a validated Sixel sequence on the final reserved row", async () => {
    const { jobs, component } = fixture();
    component.render(80);
    await Promise.resolve();
    const sequence = "\u001bP0;0;0q\"1;1;2;2#0;2;100;0;0#0~~\u001b\\";
    jobs[0]!.resolve({ kind: "sixel", sequence, rows: 3 });
    await vi.waitFor(() => expect(component.render(80).join("\n")).toContain(sequence));
    const rows = component.render(80);
    expect(rows).toHaveLength(3);
    expect(rows.slice(0, 2)).toEqual(["", ""]);
    expect(rows[2]).toBe(`\u001b_Gm=0;\u001b\\\u001b[2A${sequence}`);
    component.dispose();
  });

  it("rejects a partial or nested-control Sixel result", async () => {
    const { jobs, component } = fixture();
    component.render(80);
    await Promise.resolve();
    jobs[0]!.resolve({ kind: "sixel", sequence: "\u001bPq~\u001b]52;c;payload\u0007\u001b\\", rows: 2 });
    await vi.waitFor(() => expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("Image unavailable"));
    component.dispose();
  });

  it("shows an unavailable fallback after worker failure without retrying", async () => {
    const { jobs, preview, component } = fixture();
    component.render(80);
    await Promise.resolve();
    jobs[0]!.reject(new Error("private codec diagnostics"));
    await vi.waitFor(() => expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("Image unavailable: image/png"));
    component.render(80);
    await Promise.resolve();
    expect(preview).toHaveBeenCalledOnce();
    component.dispose();
  });
});
