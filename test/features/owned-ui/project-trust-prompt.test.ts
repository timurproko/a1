import { Readable, Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createConsoleProjectTrustPrompt } from "../../../src/features/owned-ui/index.js";

class TtyInput extends Readable {
  readonly isTTY = true;
  #sent = false;
  constructor(private readonly answer: string) { super(); }
  override _read(): void {
    if (this.#sent) return;
    this.#sent = true;
    this.push(`${this.answer}\n`);
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
  it.each([["y", true], ["yes", true], ["n", false], ["", false]] as const)("maps %j to %s", async (answer, expected) => {
    const output = new TtyOutput();
    const prompt = createConsoleProjectTrustPrompt({ input: new TtyInput(answer), output });
    await expect(prompt({ cwd: "D:/work", defaultDecision: "ask" })).resolves.toBe(expected);
    expect(output.text).toContain("project-local settings or executable resources");
    expect(output.text).toContain("D:/work");
  });

  it("reports unavailable interaction instead of inventing trust", async () => {
    const input = new TtyInput("y") as TtyInput & { isTTY: boolean };
    Object.defineProperty(input, "isTTY", { value: false });
    const output = new TtyOutput();
    const prompt = createConsoleProjectTrustPrompt({ input, output });
    await expect(prompt({ cwd: "D:/work", defaultDecision: "ask" })).rejects.toThrow(/unavailable/);
  });
});
