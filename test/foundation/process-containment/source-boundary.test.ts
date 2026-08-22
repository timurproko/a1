import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("process containment source boundary", () => {
  it("contains lifecycle methods but no terminal traffic surface", async () => {
    const source = await readFile("src/foundation/process-containment/contracts.ts", "utf8");
    expect(source).toContain("ProcessContainment");
    expect(source).not.toMatch(/stdin|stdout|stderr|terminal-input|terminal-output|dataBase64|framebuffer|parse|render|relay/i);
  });
});
