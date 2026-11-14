import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { createConsoleSessionPicker, createConsoleStartupDialogs } from "../../../src/features/owned-ui/startup-dialogs.js";

function terminal() {
  const input = Object.assign(new PassThrough(), { isTTY: true, isRaw: true, setRawMode: vi.fn() });
  const output = Object.assign(new PassThrough(), { isTTY: true });
  let text = ""; output.on("data", chunk => { text += String(chunk); });
  return { input, output, text: () => text, dialogs: createConsoleStartupDialogs({ input, output }) };
}
describe("owned pre-resource dialogs", () => {
  it("advertises no UI and consumes no input without a terminal", async () => {
    const input = new PassThrough(), output = new PassThrough(); const write = vi.spyOn(output, "write");
    const dialogs = createConsoleStartupDialogs({ input, output });
    expect(dialogs.hasUI).toBe(false);
    expect(await dialogs.ui.select("Select", ["one"])).toBeUndefined();
    expect(await dialogs.ui.confirm("Confirm", "Question")).toBe(false);
    expect(await dialogs.ui.input("Input")).toBeUndefined();
    dialogs.ui.notify("notice"); expect(write).not.toHaveBeenCalled();
    expect(input.listenerCount("data")).toBe(0);
  });
  it("returns selected values and restores raw/input/listener ownership after each dialog", async () => {
    const f = terminal();
    const select = f.dialogs.ui.select("Select", ["one", "two"]); f.input.write("2\n");
    expect(await select).toBe("two");
    const confirm = f.dialogs.ui.confirm("Confirm", "Question"); f.input.write("yes\n");
    expect(await confirm).toBe(true);
    const input = f.dialogs.ui.input("Input", "hint"); f.input.write("literal ' value\n");
    expect(await input).toBe("literal ' value");
    expect(f.input.setRawMode.mock.calls).toEqual([[false], [true], [false], [true], [false], [true]]);
    expect(f.input.listenerCount("data")).toBe(0); expect(f.input.listenerCount("error")).toBe(0);
  });
  it("cancels on stream end and restores the terminal", async () => {
    const f = terminal(); const selection = f.dialogs.ui.select("Select", ["one"]); f.input.end();
    expect(await selection).toBeUndefined(); expect(f.input.setRawMode).toHaveBeenLastCalledWith(true);
  });
  it("chooses actual session paths and strips transcript control characters from labels", async () => {
    const f = terminal(); const pick = createConsoleSessionPicker(f.dialogs);
    const selection = pick({ sessions: [{ path: "/fixture/session.jsonl", cwd: "/fixture", name: "Task\u001b[2J", firstMessage: "first" }] });
    f.input.write("1\n"); expect(await selection).toBe("/fixture/session.jsonl"); expect(f.text()).not.toContain("\u001b");
  });
});
