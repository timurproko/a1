import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPiTheme } from "../../../src/integrations/pi/components/index.js";

const ESCAPE = String.fromCharCode(27);
const repositoryRoot = resolve(import.meta.dirname, "../../..");

async function source(path: string): Promise<string> {
  return await readFile(resolve(repositoryRoot, path), "utf8");
}

describe("terminal colour fidelity", () => {
  it("emits the pinned palette as 24-bit colour rather than palette indices", () => {
    const theme = loadPiTheme("dark", "truecolor");

    expect(theme.getColorMode()).toBe("truecolor");
    expect(theme.fg("accent", "x")).toBe(`${ESCAPE}[38;2;138;190;183mx${ESCAPE}[39m`);
    expect(theme.fg("border", "x")).toBe(`${ESCAPE}[38;2;95;135;255mx${ESCAPE}[39m`);
    expect(theme.fg("mdHeading", "x")).toBe(`${ESCAPE}[38;2;240;198;116mx${ESCAPE}[39m`);
  });

  it("keeps a 256-colour terminal on indices rather than silently sending 24-bit colour", () => {
    const theme = loadPiTheme("dark", "256color");

    expect(theme.getColorMode()).toBe("256color");
    expect(theme.fg("accent", "x")).toMatch(new RegExp(`^${ESCAPE}\\[38;5;\\d+mx${ESCAPE}\\[39m$`, "u"));
  });

  // The colour a user sees also depends on the console handle Node is given: when
  // it cannot enable virtual terminal processing it renders ANSI itself and knows
  // only sixteen colours. Every process in a launch inherits that decision, so the
  // chain must inherit the terminal it was started from rather than open its own.
  it("hands every launched process the terminal it was started from", async () => {
    const guardian = await source("native/process-guardian/src/windows.rs");

    expect(guardian).not.toMatch(/CREATE_NEW_CONSOLE|CREATE_NO_WINDOW|DETACHED_PROCESS/u);
    expect(guardian).toMatch(/CREATE_SUSPENDED \| CREATE_UNICODE_ENVIRONMENT/u);
  });

  it("keeps every launched process attached to the inherited streams", async () => {
    const bootstrap = await source("src/foundation/release/bootstrap.ts");
    const developmentLauncher = await source("scripts/development/dev-launch.mjs");

    expect(bootstrap).toMatch(/stdio: "inherit"/u);
    expect(developmentLauncher).toMatch(/stdio: "inherit"/u);
  });

  it("gives development runs the launch shape the installed command has", async () => {
    const developmentEntry = await source("scripts/dev");

    expect(developmentEntry.startsWith("#!/bin/sh")).toBe(true);
    expect(developmentEntry).toMatch(/exec node .*development\/start-local\.mjs/u);
  });

  // npm runs scripts through cmd.exe on Windows, where the MSYS shell is not on
  // PATH, so the launcher locates it from what Git Bash exports rather than
  // assuming `sh` resolves, and launches Node directly everywhere else.
  it("locates the MSYS shell for npm-run development launches", async () => {
    const launcher = await source("scripts/development/dev-launch.mjs");
    const manifest = JSON.parse(await source("package.json")) as { scripts: Record<string, string> };

    expect(launcher).toMatch(/process\.env\.MSYSTEM/u);
    expect(launcher).toMatch(/usr\/bin\/sh\.exe/u);
    expect(launcher).toMatch(/'exec "\$0" "\$@"'/u);
    for (const script of ["start", "start:pi"]) {
      expect(manifest.scripts[script]).toMatch(/node scripts\/development\/dev-launch\.mjs/u);
    }
  });
});
