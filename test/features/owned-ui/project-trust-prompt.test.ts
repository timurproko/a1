import { Readable, Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createConsoleProjectTrustPrompt } from "../../../src/features/owned-ui/index.js";
import { firstVisibleTextColumn } from "../../support/dialog-alignment.js";

class TtyInput extends Readable {
  readonly isTTY = true;
  isRaw = false;
  readonly rawTransitions: boolean[] = [];
  #sent = false;
  private readonly keys: string;
  constructor(keys: string) { super(); this.keys = keys; }
  setRawMode(enabled: boolean): this {
    this.isRaw = enabled;
    this.rawTransitions.push(enabled);
    return this;
  }
  override _read(): void {
    if (this.#sent) return;
    this.#sent = true;
    this.push(this.keys);
    this.push(null);
  }
}

class TtyOutput extends Writable {
  readonly isTTY = true;
  readonly columns: number;
  readonly rows: number;
  text = "";
  constructor(columns = 100, rows = 18) {
    super();
    this.columns = columns;
    this.rows = rows;
  }
  override _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.text += chunk.toString();
    callback();
  }
}

describe("bounded project trust terminal preflight", () => {
  it.each([
    ["\r", true],
    ["\u001b[B\r", false],
    ["y", true],
    ["n", false],
  ] as const)("maps selector keys %j to %s", async (keys, expected) => {
    const input = new TtyInput(keys);
    const output = new TtyOutput();
    const prompt = createConsoleProjectTrustPrompt({ input, output });
    await expect(prompt({ cwd: "D:/work", defaultDecision: "ask" })).resolves.toBe(expected);
    expect(output.text).toContain("Trust project folder?");
    expect(output.text).toContain("D:/work");
    const visible = output.text.replace(/\u001b\[[0-9;?]*[A-Za-z]/gu, "").replace(/\s+/gu, " ");
    expect(visible).toContain("This allows to load project settings and resources, install missing project packages, and execute project extensions.");
    expect(visible).not.toContain("This allows a1 to load");
    expect(output.text).toContain("→ Trust");
    expect(output.text).toContain("Do not trust");
    expect(output.text).toContain("\u001b[38;2;102;102;102m↑/↓\u001b[38;2;128;128;128m to navigate  \u001b[38;2;102;102;102mEnter\u001b[38;2;128;128;128m to select");
    expect(output.text).toContain("Ctrl+C\u001b[38;2;128;128;128m to exit");
    expect(output.text).not.toContain("Esc\u001b[38;2;128;128;128m to cancel");
    expect(output.text).not.toMatch(/[·•]/u);
    const lastFrame = output.text.split("\u001b[2J\u001b[H").reverse()
      .find(frame => frame.includes("Trust project folder?"))!.split("\n");
    const heading = lastFrame.find(line => line.includes("Trust project folder?"))!;
    const hint = lastFrame.find(line => line.includes("↑/↓"))!;
    expect(firstVisibleTextColumn(hint)).toBe(firstVisibleTextColumn(heading));
    expect(lastFrame.findIndex(line => line.includes("─"))).toBe(6);
    expect(lastFrame.findLastIndex(line => line.includes("─"))).toBe(17);
    const rules = lastFrame.filter(line => line.includes("─"));
    expect(rules).toHaveLength(2);
    expect(rules.every(line => line.startsWith("\u001b[38;2;95;135;255m"))).toBe(true);
    expect(rules.every(line => line.replace(/\u001b\[[0-9;:]*m/gu, "").length === output.columns)).toBe(true);
    expect(input.rawTransitions).toEqual([true, false]);
  });

  it("requires a decision when Escape is pressed", async () => {
    const input = new TtyInput("\u001b\u001b[B\r");
    const output = new TtyOutput();
    const prompt = createConsoleProjectTrustPrompt({ input, output });
    await expect(prompt({ cwd: "D:/work", defaultDecision: "ask" })).resolves.toBe(false);
    expect(input.rawTransitions).toEqual([true, false]);
  });

  it("aborts startup on Ctrl+C after restoring the terminal", async () => {
    const input = new TtyInput("\u0003");
    const output = new TtyOutput();
    const prompt = createConsoleProjectTrustPrompt({ input, output });
    await expect(prompt({ cwd: "D:/work", defaultDecision: "ask" })).rejects.toMatchObject({
      name: "ProjectTrustPromptInterruptedError",
      exitCode: 130,
    });
    expect(input.rawTransitions).toEqual([true, false]);
    expect(output.text.endsWith("\u001b[2J\u001b[H\u001b[?25h\u001b[?1049l")).toBe(true);
  });

  it("keeps decisions and controls visible in a short narrow terminal", async () => {
    const output = new TtyOutput(30, 5);
    const prompt = createConsoleProjectTrustPrompt({ input: new TtyInput("n"), output });
    await prompt({ cwd: "D:/work", defaultDecision: "ask" });
    const frame = output.text.split("\u001b[2J\u001b[H").find(part => part.includes("Trust project folder?"))!;
    expect(frame.split("\n")).toHaveLength(5);
    expect(frame).toContain("→ Trust");
    expect(frame).toContain("Do not trust");
    expect(frame).toContain("↑/↓");
    expect(frame).not.toContain("─");
  });

  it("does not replay control bytes from the working directory", async () => {
    const output = new TtyOutput();
    const prompt = createConsoleProjectTrustPrompt({ input: new TtyInput("n"), output });
    await prompt({ cwd: "D:/bad\u001b]52;clipboard\u0007", defaultDecision: "ask" });
    expect(output.text).not.toContain("\u001b]52;clipboard");
    expect(output.text).toContain("D:/bad�]52;clipboard�");
  });

  it("retains the comparison profile's top-left startup presentation", async () => {
    const output = new TtyOutput();
    const prompt = createConsoleProjectTrustPrompt({
      input: new TtyInput("\u001b"), output, presentation: "comparison",
    });
    await prompt({ cwd: "D:/work", defaultDecision: "ask" });
    const frame = output.text.split("\u001b[2J\u001b[H").find(part => part.includes("Trust project folder?"))!;
    expect(frame.startsWith("\u001b[1m\u001b[38;2;138;190;183mTrust project folder?")).toBe(true);
    expect(frame).not.toContain("─");
  });

  it("restores the terminal after clearing the selector", async () => {
    const output = new TtyOutput();
    const prompt = createConsoleProjectTrustPrompt({ input: new TtyInput("\u001b[B\r"), output });
    await prompt({ cwd: "D:/work", defaultDecision: "ask" });
    expect(output.text.indexOf("\u001b[?1049h")).toBeLessThan(output.text.indexOf("Trust project folder?"));
    expect(output.text.lastIndexOf("\u001b[2J\u001b[H")).toBeLessThan(output.text.lastIndexOf("\u001b[?1049l"));
    expect(output.text.endsWith("\u001b[2J\u001b[H\u001b[?25h\u001b[?1049l")).toBe(true);
  });

  it("reports unavailable interaction instead of inventing trust or writing a frame", async () => {
    const input = new TtyInput("\r") as TtyInput & { isTTY: boolean };
    Object.defineProperty(input, "isTTY", { value: false });
    const output = new TtyOutput();
    const prompt = createConsoleProjectTrustPrompt({ input, output });
    await expect(prompt({ cwd: "D:/work", defaultDecision: "ask" })).rejects.toThrow(/unavailable/);
    expect(output.text).toBe("");
  });
});
