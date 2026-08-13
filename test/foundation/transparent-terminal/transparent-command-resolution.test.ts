import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveTransparentCommand } from "../../../src/foundation/transparent-terminal/command-resolution.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("transparent command resolution", () => {
  it("unwraps a standard npm Windows command shim without a shell", async () => {
    const root = await fixtureRoot();
    const target = resolve(root, "node_modules", "tool", "dist", "cli.js");
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(target, "export {};\n");
    await writeFile(resolve(root, "tool.cmd"), `@ECHO off\r\nendLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\node_modules\\tool\\dist\\cli.js" %*\r\n`);

    await expect(resolveTransparentCommand("tool", ["--exact", "value with spaces"], {
      platform: "win32", cwd: root, environment: { PATH: root, PATHEXT: ".EXE;.CMD" }, nodeExecutable: "C:/node/node.exe",
    })).resolves.toEqual({
      executable: "C:/node/node.exe",
      arguments: [target, "--exact", "value with spaces"],
      source: "npm-windows-shim",
    });
  });

  it("resolves ordinary Windows executable files through PATH", async () => {
    const root = await fixtureRoot();
    const executable = resolve(root, "tool.exe");
    await writeFile(executable, "fixture");
    await expect(resolveTransparentCommand("tool", ["one"], {
      platform: "win32", cwd: root, environment: { Path: root, PATHEXT: ".EXE;.CMD" },
    })).resolves.toEqual({ executable: expect.stringMatching(/tool\.exe$/i), arguments: ["one"], source: "path" });
  });

  it("refuses arbitrary command scripts rather than invoking cmd.exe", async () => {
    const root = await fixtureRoot();
    await writeFile(resolve(root, "unsafe.cmd"), "@echo off\r\nstart something\r\n");
    await expect(resolveTransparentCommand("unsafe", [], {
      platform: "win32", cwd: root, environment: { PATH: root, PATHEXT: ".CMD" },
    })).rejects.toMatchObject({ code: "UNSUPPORTED_WINDOWS_COMMAND_SHIM" });
  });

  it("preserves exact native command selection on Unix", async () => {
    await expect(resolveTransparentCommand("tool", ["--flag"], {
      platform: "linux", cwd: "/workspace", environment: { PATH: "/bin" },
    })).resolves.toEqual({ executable: "tool", arguments: ["--flag"], source: "exact" });
  });
});

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "addone-command-resolution-"));
  roots.push(root);
  return root;
}
