import { describe, expect, it } from "vitest";
import { MouseReportInput } from "../../../../src/integrations/pi/tui-runtime/mouse-report-input.js";

const press = "\u001b[<0;12;3M";
const release = "\u001b[<0;12;3m";

describe("ordered mouse report framing", () => {
  it("delivers interleaved keys and reports in their original order", () => {
    const inputs: string[] = [];
    const input = new MouseReportInput(data => inputs.push(data));
    input.accept(`before${press}middle${release}\u0003`);
    expect(inputs).toEqual(["before", press, "middle", release, "\u0003"]);
  });

  it.each([3, 4, 7, 9])("buffers an SGR report split at byte %i", split => {
    const inputs: string[] = [];
    const input = new MouseReportInput(data => inputs.push(data));
    input.accept(press.slice(0, split));
    expect(inputs).toEqual([]);
    input.accept(press.slice(split) + release);
    expect(inputs).toEqual([press, release]);
  });

  it("does not parse mouse-looking bytes inside a bracketed paste", () => {
    const inputs: string[] = [];
    const input = new MouseReportInput(data => inputs.push(data));
    const paste = `\u001b[200~text ${press} text\u001b[201~`;
    input.accept(`before${paste}${release}`);
    expect(inputs).toEqual(["before", paste, release]);
  });

  it("does not hold escape or unrelated keys, and resets partial report state", () => {
    const inputs: string[] = [];
    const input = new MouseReportInput(data => inputs.push(data));
    input.accept("\u001b");
    input.accept("\u001b[A");
    input.accept("\u001b[<0;12;");
    input.reset();
    input.accept("x");
    expect(inputs).toEqual(["\u001b", "\u001b[A", "x"]);
  });
});
