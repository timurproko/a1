import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("transparent CLI composition", () => {
  it("keeps explicit Pi and sandbox fallback bound to the common broker without desktop automation", async () => {
    const [entry, main, composition] = await Promise.all([
      readFile("bin/a1-ui.js", "utf8"),
      readFile("src/foundation/transparent-terminal/main.ts", "utf8"),
      readFile("src/composition/transparent-runtime.ts", "utf8"),
    ]);
    expect(entry).toContain("runSelectedInteractiveRuntime");
    expect(entry).toContain("runSelectedTransparentRuntime");
    expect(composition).toContain("runTransparentForeground");
    expect(composition).toContain("process.execPath");
    expect(composition).toContain("public-main-entry.js");
    expect(main).toContain("runForegroundBroker");
    expect(main).toContain("createPlatformTransparentLauncher");
    expect(main).toContain("environment.A1_LAUNCH_PROFILE");
    expect(main).toContain("assertLaunchProfileId(profileId)");
    expect(`${entry}\n${composition}\n${main}`).not.toMatch(/Start-Process|wt\.exe|SendInput|SetForegroundWindow|ReadConsoleInputW|node-pty|@xterm/i);
    expect(main).not.toMatch(/process\.(?:stdin|stdout|stderr)|\.on\(["']data|\.pipe\(/);
    const resolution = await readFile("src/foundation/transparent-terminal/command-resolution.ts", "utf8");
    expect(resolution).not.toMatch(/cmd\.exe|ComSpec|shell:\s*true|Start-Process/i);
  });

  it("documents an exclusively user-controlled manual checkpoint", async () => {
    const source = await readFile("docs/manual-transparent-checkpoint.md", "utf8");
    expect(source).toContain("Run the installed candidate yourself");
    expect(source).toContain("--prefix artifacts/manual-transparent/install");
    expect(source).toContain("A1_DATA_DIR");
    expect(source).toContain("install/node_modules/.bin/a1.cmd");
    expect(source).toContain("never on this workstation");
    expect(source).toContain("Ctrl+C, Ctrl+P");
    expect(source).toContain("return a usable parent prompt");
  });
});
