import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("transparent CLI composition", () => {
  it("binds bootstrap UI entry to the common broker without desktop automation", async () => {
    const [entry, main] = await Promise.all([
      readFile("bin/addone-ui.js", "utf8"),
      readFile("src/transparent/main.ts", "utf8"),
    ]);
    expect(entry).toContain("runTransparentForeground");
    expect(main).toContain("runForegroundBroker");
    expect(main).toContain("createPlatformTransparentLauncher");
    expect(`${entry}\n${main}`).not.toMatch(/Start-Process|wt\.exe|SendInput|SetForegroundWindow|ReadConsoleInputW|node-pty|@xterm/i);
    expect(main).not.toMatch(/process\.(?:stdin|stdout|stderr)|\.on\(["']data|\.pipe\(/);
    const resolution = await readFile("src/transparent/command-resolution.ts", "utf8");
    expect(resolution).not.toMatch(/cmd\.exe|ComSpec|shell:\s*true|Start-Process/i);
  });

  it("documents an exclusively user-controlled manual checkpoint", async () => {
    const source = await readFile("docs/manual-transparent-checkpoint.md", "utf8");
    expect(source).toContain("run these commands yourself");
    expect(source).toContain("--prefix artifacts/manual-transparent/install");
    expect(source).toContain("ADDONE_DATA_DIR");
    expect(source).toContain("install/node_modules/.bin/addone.cmd");
    expect(source).toContain("Do not run `npm run test:physical:windows*");
    expect(source).toContain("Ctrl+C and Ctrl+P remain distinct");
    expect(source).toContain("returns a usable parent prompt");
  });
});
