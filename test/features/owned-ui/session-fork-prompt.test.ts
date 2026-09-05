import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { createConsoleSessionForkPrompt } from "../../../src/features/owned-ui/session-fork-prompt.js";

describe("pre-resource session fork confirmation", () => {
  it.each([["y", true], ["YES", true], ["n", false], ["", false]] as const)("handles %j without taking over terminal modes", async (answer, accepted) => {
    const input = new PassThrough();
    const output = new PassThrough();
    let transcript = "";
    output.on("data", chunk => { transcript += chunk.toString(); });
    const prompt = createConsoleSessionForkPrompt({ input, output });
    const result = prompt({ sourceCwd: "D:/other project" });
    input.write(`${answer}\n`);
    expect(await result).toBe(accepted);
    expect(transcript).toContain("Session found in different project: D:/other project");
    expect(transcript).toContain("Fork this session into current directory? [y/N]");
    expect(transcript).not.toContain("\u001b[?1049h");
    expect(input.listenerCount("data")).toBe(0);
    expect(input.listenerCount("error")).toBe(0);
    input.destroy();
    output.destroy();
  });

  it("cancels on EOF and releases its input listener", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const result = createConsoleSessionForkPrompt({ input, output })({ sourceCwd: "other" });
    input.end();
    expect(await result).toBe(false);
    expect(input.listenerCount("data")).toBe(0);
    output.destroy();
  });
});
