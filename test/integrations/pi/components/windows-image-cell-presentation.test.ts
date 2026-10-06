import { compositeTuiLine, setCellDimensions, stripTerminalSequences } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WindowsImageCellPresentation } from "../../../../src/integrations/pi/components/windows-image-cell-presentation.js";

const row = "\u001b[38;2;255;0;0;48;2;0;0;0m▀\u001b[0m";

afterEach(() => setCellDimensions({ widthPx: 9, heightPx: 18 }));

function fixture() {
  const jobs: Array<{ resolve: (value: { rows: readonly string[] }) => void; cancel: ReturnType<typeof vi.fn> }> = [];
  const preview = vi.fn(() => {
    let resolve!: (value: { rows: readonly string[] }) => void;
    const result = new Promise<{ rows: readonly string[] }>(done => { resolve = done; });
    const cancel = vi.fn();
    jobs.push({ resolve, cancel });
    return { result, cancel };
  });
  const changed = vi.fn();
  const component = new WindowsImageCellPresentation(
    "asset", { type: "image", mimeType: "image/png", data: "AQID" }, preview, 60, changed,
  );
  return { component, preview, jobs, changed };
}

describe("Windows image cell presentation", () => {
  it("renders bounded rows with hard style boundaries and invalidates by width", async () => {
    const { component, preview, jobs, changed } = fixture();
    expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("preparing preview");
    jobs[0]!.resolve({ rows: [row] });
    await vi.waitFor(() => expect(changed).toHaveBeenCalledOnce());
    const rendered = component.render(80)[0]!;
    expect(rendered.startsWith("\u001b[0m ")).toBe(true);
    expect(rendered.endsWith("\u001b[0m")).toBe(true);
    expect(stripTerminalSequences(rendered)).toBe(" ▀");

    component.render(40);
    expect(preview).toHaveBeenCalledTimes(2);
    component.dispose();
    expect(jobs[1]!.cancel).toHaveBeenCalledOnce();
  });

  it("regenerates when a terminal cell-size response changes physical proportions", () => {
    const { component, preview, jobs } = fixture();
    setCellDimensions({ widthPx: 9, heightPx: 18 });
    component.render(80);
    expect((preview.mock.calls[0] as unknown[])[3]).toEqual({ widthPx: 9, heightPx: 18 });

    setCellDimensions({ widthPx: 10, heightPx: 25 });
    component.invalidate();
    component.render(80);
    expect((preview.mock.calls[1] as unknown[])[3]).toEqual({ widthPx: 10, heightPx: 25 });
    expect(jobs[0]!.cancel).toHaveBeenCalledOnce();
    component.dispose();
  });

  it("remains visible when top rows clip and composes below opaque dialog rows", async () => {
    const { component, jobs, changed } = fixture();
    component.render(80);
    jobs[0]!.resolve({ rows: [row, row, row] });
    await vi.waitFor(() => expect(changed).toHaveBeenCalledOnce());
    const rendered = component.render(80);
    expect(rendered.slice(1)).toHaveLength(2);
    expect(rendered.slice(1).every(line => stripTerminalSequences(line).includes("▀"))).toBe(true);
    expect(rendered.join("\n")).not.toMatch(/\u001b_G|\u001bP|\u001b\]1337;File=/u);

    const covered = compositeTuiLine(rendered[0]!, "\u001b[48;2;1;2;3m        \u001b[0m", 0, 8, 80);
    expect(stripTerminalSequences(covered).slice(0, 8)).toBe("        ");
  });

  it("ignores completion after disposal", async () => {
    const { component, jobs, changed } = fixture();
    component.render(80);
    component.dispose();
    jobs[0]!.resolve({ rows: [row] });
    await Promise.resolve();
    expect(changed).not.toHaveBeenCalled();
  });
});
