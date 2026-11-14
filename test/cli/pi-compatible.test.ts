import { describe, expect, it, vi } from "vitest";
import { resolve } from "node:path";
import { dispatchPiCompatibleCommand, parsePiCompatibleCommand } from "../../src/cli/pi-compatible.js";
import { interactiveStartupArguments } from "../../src/foundation/launch-context/index.js";
import { parseInteractiveLaunchArguments } from "../../src/features/launch/index.js";

describe("Pi-compatible normal A1 grammar", () => {
  it("round-trips literal Firstmate instructions and invocation options", () => {
    const prompt = "  exact '\" $() 🚢\n--thinking off  ";
    const command = parsePiCompatibleCommand(["--model", "provider/model:high", "--provider", "provider", "--thinking", "max", "-e", "./a.ts", "--extension", "./b.ts", "--exclude-tools", "write,mcp__*", "--codex-effort", "ultra", "--", prompt]);
    expect(command.kind).toBe("launch");
    if (command.kind !== "launch") throw new Error(JSON.stringify(command));
    expect(command.intent).toMatchObject({ profileId: "a1", promptArguments: [prompt], runtimeOptions: {
      model: "provider/model:high", provider: "provider", thinking: "max",
      extensionPaths: [resolve("a.ts"), resolve("b.ts")], excludeTools: ["write", "mcp__*"], extensionFlagValues: [["codex-effort", "ultra"]],
    } });
    expect(parseInteractiveLaunchArguments(interactiveStartupArguments(command.intent))).toEqual({ runtimeOptions: command.intent.runtimeOptions, promptArguments: [prompt] });
  });

  it("treats one positional instruction, including a normal A1 command word, as instructions", () => {
    expect(parsePiCompatibleCommand(["update"])).toMatchObject({ kind: "launch", intent: { profileId: "a1", promptArguments: ["update"] } });
    expect(parsePiCompatibleCommand(["--", "--model", "literal"])).toMatchObject({ kind: "launch", intent: { promptArguments: ["--model", "literal"] } });
  });

  it("supports standalone session storage and guarded resume selection", () => {
    expect(parsePiCompatibleCommand(["--session-dir", "store"])).toMatchObject({ kind: "launch", intent: { runtimeOptions: { sessionDir: resolve("store") } } });
    expect(parsePiCompatibleCommand(["--session", "saved", "--session-dir", "store"])).toMatchObject({ kind: "launch", intent: { sessionSelection: { target: "saved", sessionDir: "store" } } });
  });

  it.each([
    ["--model"], ["--provider", "provider"], ["--thinking", "ultra"], ["--model", "a", "--model", "b"],
    ["--exclude-tools", "read,,write"], ["--mode", "rpc"], ["--approve"], ["--tui-mode", "regular"], ["-z"],
    ["--list-models", "search", "unexpected prompt"], ["x\0y"], ["🚢".repeat(8193)],
  ])("rejects malformed or unsupported arguments: %j", (...args) => {
    expect(parsePiCompatibleCommand(args).kind).toBe("error");
  });

  it("dispatches probes/errors without ever calling the launch handler", async () => {
    const launch = vi.fn(), version = vi.fn(async () => 0), catalog = vi.fn(async () => 0);
    const stdout = vi.fn(), stderr = vi.fn();
    for (const args of [["--help"], ["--version"], ["--list-models", "needle"], ["--thinking", "invalid"]]) {
      await dispatchPiCompatibleCommand(parsePiCompatibleCommand(args), { launch, version, catalog }, { stdout, stderr });
    }
    expect(launch).not.toHaveBeenCalled();
    expect(version).toHaveBeenCalledOnce();
    expect(catalog).toHaveBeenCalledWith({}, "needle");
    const help = stdout.mock.calls[0]![0];
    expect(help).toContain("normal A1 UI and profile");
    expect(help).not.toContain("--approve");
    expect(help).not.toContain("--tui-mode");
    expect(stderr).toHaveBeenCalledOnce();
  });
});
