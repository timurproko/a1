import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { TERMINAL_VT_PLATFORMS, terminalVtArtifact } from "../../scripts/development/fetch-terminal-vt.mjs";

describe("terminal library fetch", () => {
  it("selects the newest unexpired attempt for this platform only", () => {
    const artifacts = [
      { name: "terminal-vt-win32-x64-attempt-1", expired: false },
      { name: "terminal-vt-win32-x64-attempt-3", expired: true },
      { name: "terminal-vt-win32-x64-attempt-2", expired: false },
      { name: "terminal-vt-linux-x64-attempt-4", expired: false },
      { name: "terminal-host-win32-x64-attempt-5", expired: false },
    ];
    expect(terminalVtArtifact(artifacts, "win32-x64")).toBe("terminal-vt-win32-x64-attempt-2");
    expect(terminalVtArtifact(artifacts, "darwin-arm64")).toBeNull();
    expect(terminalVtArtifact([{ name: "terminal-vt-win32-x64-attempt-latest" }], "win32-x64")).toBeNull();
  });

  it("covers exactly the platforms whose native lanes publish a library", async () => {
    const matrix = await readFile("scripts/release/validation-matrix.mjs", "utf8");
    const lanes = matrix.split("\n").filter(line => line.includes("terminalHost: true"));
    expect(lanes).toHaveLength(TERMINAL_VT_PLATFORMS.length);
    expect(lanes.some(line => line.includes("...WINDOWS"))).toBe(true);
    expect(lanes.some(line => line.includes('platform: "linux", architecture: "x64"'))).toBe(true);
    expect(lanes.some(line => line.includes('platform: "darwin", architecture: "arm64"'))).toBe(true);
  });
});
