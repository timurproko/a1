import { Readable, Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createConsoleProjectTrustPrompt } from "../../../src/features/owned-ui/index.js";

class TtyInput extends Readable {
  readonly isTTY = true;
  isRaw = false;
  readonly rawTransitions: boolean[] = [];
  #sent = false;
  constructor(private readonly keys: string) { super(); }
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
  readonly columns = 100;
  text = "";
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
    ["\u001b", null],
    ["\u0003", null],
  ] as const)("maps selector keys %j to %s", async (keys, expected) => {
    const input = new TtyInput(keys);
    const output = new TtyOutput();
    const prompt = createConsoleProjectTrustPrompt({ input, output });
    await expect(prompt({ cwd: "D:/work", defaultDecision: "ask" })).resolves.toBe(expected);
    expect(output.text).toContain("Trust project folder?");
    expect(output.text).toContain("D:/work");
    expect(output.text).toContain("→ Trust");
    expect(output.text).toContain("Do not trust");
    expect(input.rawTransitions).toEqual([true, false]);
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
