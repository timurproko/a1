import { getCellDimensions, setCellDimensions, stripTerminalSequences } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SubmittedImagePresentation } from "../../../../src/integrations/pi/components/submitted-image-presentation.js";

const cellDimensions = getCellDimensions();
afterEach(() => setCellDimensions(cellDimensions));

function fixture() {
  const jobs: Array<{ resolve: (rows: readonly string[]) => void; reject: (error: Error) => void; cancel: ReturnType<typeof vi.fn> }> = [];
  const preview = vi.fn(() => {
    let resolve!: (rows: readonly string[]) => void;
    let reject!: (error: Error) => void;
    const result = new Promise<readonly string[]>((done, fail) => { resolve = done; reject = fail; });
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
  it("caches width-specific rows and clears derived state on invalidation", async () => {
    const { jobs, preview, component } = fixture();
    expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("preparing preview");
    await Promise.resolve();
    jobs[0]!.resolve(["\u001b[38;2;255;0;0;48;2;0;0;0m▀\u001b[39;49m"]);
    await vi.waitFor(() => expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("▀"));

    component.render(40);
    await Promise.resolve();
    expect(preview).toHaveBeenLastCalledWith("asset", expect.anything(), 38, { widthPx: 9, heightPx: 18 });
    jobs[1]!.resolve(["\u001b[38;2;0;255;0;48;2;0;0;0m▀\u001b[39;49m"]);
    await vi.waitFor(() => expect(stripTerminalSequences(component.render(40).join("\n"))).toContain("▀"));
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
    jobs[0]!.resolve(["\u001b[38;2;255;0;0m▀\u001b[39m"]);
    await Promise.resolve();
    expect(changed).not.toHaveBeenCalled();
    jobs[1]!.resolve(["\u001b_Ga=T;payload\u001b\\"]);
    await vi.waitFor(() => expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("Image unavailable"));
    expect(changed).toHaveBeenCalledOnce();
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
