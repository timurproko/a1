import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import type { ChildProcess, SpawnOptions } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import type { TransparentTerminalLaunchProfile } from "../../src/domain/model.js";
import {
  createPlatformTransparentLauncher,
  UnixTransparentLauncher,
  WindowsTransparentLauncher,
  type NativeSpawnAdapter,
} from "../../src/transparent/native-launcher.js";

const profile: TransparentTerminalLaunchProfile = {
  id: "profile", terminalCapability: "transparent", executable: "tool", arguments: ["--exact", "value with spaces"], cwd: "workspace",
  environment: { ADDONE_TEST_VALUE: "exact" }, terminalType: "xterm-256color", dimensions: { columns: 80, rows: 24 },
  ownerDisconnect: "stop", recovery: "none", surface: "none", visualReconnection: "none",
};

describe("platform transparent native launchers", () => {
  it("uses inherited handles with no shell, PTY, detachment, or hidden Windows console", async () => {
    const fixture = spawnFixture();
    const handle = await new WindowsTransparentLauncher(fixture.adapter).launch(profile);
    expect(fixture.spawn).toHaveBeenCalledWith("tool", profile.arguments, expect.objectContaining({
      cwd: "workspace", shell: false, stdio: "inherit", detached: false, windowsHide: true, windowsVerbatimArguments: false,
    }));
    expect(fixture.options()?.env).toMatchObject({ ADDONE_TEST_VALUE: "exact", TERM: "xterm-256color" });
    expect(handle.processIdentity).toEqual({ pid: 8123, startIdentity: "8123:native-start" });
    fixture.child.emit("close", 0, null);
    await expect(handle.outcome).resolves.toEqual({ kind: "exited", exitCode: 0 });
  });

  it("keeps Unix child in the inherited foreground process group and controlling TTY", async () => {
    const fixture = spawnFixture();
    const handle = await new UnixTransparentLauncher(fixture.adapter).launch(profile);
    expect(fixture.options()).toMatchObject({ shell: false, stdio: "inherit", detached: false });
    fixture.child.emit("close", null, "SIGTERM");
    await expect(handle.outcome).resolves.toEqual({ kind: "signaled", signal: "SIGTERM" });
  });

  it("selects only supported native platform adapters", () => {
    const fixture = spawnFixture();
    expect(createPlatformTransparentLauncher("win32", fixture.adapter)).toBeInstanceOf(WindowsTransparentLauncher);
    expect(createPlatformTransparentLauncher("linux", fixture.adapter)).toBeInstanceOf(UnixTransparentLauncher);
    expect(createPlatformTransparentLauncher("darwin", fixture.adapter)).toBeInstanceOf(UnixTransparentLauncher);
    expect(() => createPlatformTransparentLauncher("aix", fixture.adapter)).toThrow(/unsupported/);
  });

  it("contains no PTY, terminal byte read/write, mode, or process-group mutation", async () => {
    const source = await readFile("src/transparent/native-launcher.ts", "utf8");
    expect(source).not.toMatch(/node-pty|conpty|@xterm|ReadConsoleInputW|\?\s*9001|setRawMode|\.stdin|\.stdout|\.stderr|\.on\(["']data|\.write\(/i);
    expect(source).toContain('stdio: "inherit"');
    expect(source).toContain("shell: false");
  });
});

function spawnFixture() {
  const child = new EventEmitter() as ChildProcess;
  Object.defineProperty(child, "pid", { value: 8123 });
  const spawn = vi.fn((_executable: string, _arguments: readonly string[], _options: SpawnOptions) => child);
  const adapter: NativeSpawnAdapter = {
    spawn,
    async observeStartIdentity() { return "8123:native-start"; },
  };
  return {
    child,
    adapter,
    spawn,
    options: () => spawn.mock.calls.at(-1)?.[2],
  };
}
