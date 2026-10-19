import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("launch guardian terminal boundary", () => {
  it("inherits terminal handles without reading, parsing, relaying, or rendering traffic", async () => {
    const [entry, guardian, containment, windows, linux, darwin] = await Promise.all([
      readFile("bin/guardian.js", "utf8"),
      readFile("src/foundation/launch-guardian/main.ts", "utf8"),
      readFile("src/foundation/process-containment/addon-containment.ts", "utf8"),
      readFile("native/process-guardian/src/windows.rs", "utf8"),
      readFile("native/process-guardian/src/linux.rs", "utf8"),
      readFile("native/process-guardian/src/darwin.rs", "utf8"),
    ]);
    expect(entry).not.toContain("error.stack");
    expect(containment).toContain("spawnContained");
    expect(windows).toContain("CreateProcessW");
    expect(linux).toContain("libc::posix_spawn(");
    expect(darwin).toContain("libc::posix_spawn(");
    expect(`${guardian}\n${containment}`).not.toMatch(/process\.(?:stdin|stdout|stderr)|\.on\(["']data|node-pty|conpty|@xterm|framebuffer|terminal-output|render|relay/i);
    expect(`${windows}\n${linux}\n${darwin}`).not.toMatch(/ReadConsole|WriteConsole|terminal parser|framebuffer|rendered cells/i);
  });
});
