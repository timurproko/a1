import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { cliCapabilities, dispatchCli, parseCliCommand } from "../../src/cli/index.js";
import { dispatchPiCompatibleCommand, parsePiCompatibleCommand } from "../../src/cli/pi-compatible.js";
import { interactiveOptionHelp } from "../../src/cli/interactive-options.js";
import { interactiveLaunchIntent } from "../../src/features/launch/index.js";

const capabilities = cliCapabilities("1.0.0-dev.1");
function intent(args: readonly string[]) {
  const command = parseCliCommand(args, capabilities);
  if (command.kind !== "launch") throw new Error(JSON.stringify(command));
  return interactiveLaunchIntent(command.profileId, command.sessionSelection, command);
}

describe("shared default public launch grammar", () => {
  it.each([
    ["--model", "provider/model:high", "--provider", "provider", "--thinking", "max", "task"],
    ["-e", "a.ts", "--extension", "npm:fixture", "--extension", "builtin:mcp", "--exclude-tools", "write,mcp__*"],
    ["--session", "saved", "--session-dir", "storage", "--session-color", "green", "--", "update"],
    ["first message", "--thinking", "low", "second message"],
    ["--registered=literal value", "--boolean", "--", "a ' quote\n🚢 --literal"],
    ["--session-dir", "new-storage"], ["--continue"], ["-c"], ["--resume"], ["-r"],
    ["--fork", "saved", "--session-id", "task_17", "-n", "Task title"],
    ["--no-session", "--session-id", "scratch-1", "--name", "Scratch"],
    ["--model", "provider/model", "--api-key", "never-sent-fixture", "--models", "provider/*"],
    ["--approve"], ["-a"], ["--no-approve"], ["-na"], [],
  ])("constructs equivalent normal-product intents for %j", (...args) => {
    expect(parsePiCompatibleCommand(args)).toEqual({ kind: "launch", intent: intent(args) });
  });

  it("trims a delivered session name without altering prompt whitespace", () => {
    expect(intent(["--name", "  Task title  ", "  literal prompt  "])).toMatchObject({ runtimeOptions: { sessionName: "Task title" }, promptArguments: ["  literal prompt  "] });
  });

  it("normalizes resources without turning package identifiers into filesystem paths", () => {
    expect(intent(["-e", "./extension.ts", "-e", "npm:fixture", "-e", "git:github.com/x/y", "-e", "builtin:mcp"]).runtimeOptions?.extensionPaths)
      .toEqual([resolve("extension.ts"), "npm:fixture", "git:github.com/x/y", "builtin:mcp"]);
    expect(intent(["--session-dir", "new-storage"]).runtimeOptions?.sessionDir).toBe(resolve("new-storage"));
  });

  it.each([
    ["--model"], ["--model", "-e", "extension.ts"], ["--model", "a", "--model", "b"],
    ["--exclude-tools", "read", "-xt", "write"], ["--runtime-options", "{}"],
    ["--session-color", "green", "--runtime-options={} "], ["--model=x"], ["-z"],
    ["--provider", "provider"], ["--thinking", "invalid"], ["--session-color", "invalid"],
    ["--fork", "saved", "--session", "other"], ["--fork", "saved", "--no-session"],
    ["--fork", "saved", "-c"], ["--fork", "saved", "-r"], ["--session-id", "../bad"],
    ["--session-id", "id", "--continue"], ["--session-id", "id", "--resume"],
    ["--session-id", "id", "--session", "other"], ["--continue", "-c"],
    ["--approve", "--no-approve"], ["--no-session=true"], ["--api-key", "never-sent-fixture"],
    ["--models", "a,,b"], ["--models"], ["--fork"], ["--name"], ["--name", "   "],
  ])("rejects malformed public input in both adapters %j", (...args) => {
    expect(parseCliCommand(args, capabilities).kind).toBe("error");
    expect(parsePiCompatibleCommand(args).kind).toBe("error");
  });

  it.each(["--mode", "--print", "-p", "--tools", "--no-mcp", "--system-prompt", "--tui-mode", "--skill", "--offline", "--export"])("does not reinterpret pending core flag %s as extension input", flag => {
    expect(parseCliCommand([flag], capabilities)).toMatchObject({ kind: "error", message: expect.stringContaining(`${flag} is not supported.`) });
    expect(parsePiCompatibleCommand([flag])).toMatchObject({ kind: "error", message: expect.stringContaining(`${flag} is not supported.`) });
  });

  it.each(["config", "auth", "mcp"])("reports the unsupported %s command plainly", command => {
    expect(parseCliCommand([command], capabilities)).toMatchObject({ kind: "error", message: expect.stringContaining(`${command} is not supported.`) });
  });

  it("reports file inputs as unsupported", () => {
    expect(parseCliCommand(["@notes.md"], capabilities)).toMatchObject({ kind: "error", message: expect.stringContaining("File and image inputs (@path) are not supported.") });
  });

  it("keeps delivery-progress wording out of user-facing messages and help", () => {
    const outputs = [
      ...interactiveOptionHelp(),
      ...[["config"], ["--offline"], ["@notes.md"]].map(args => JSON.stringify(parseCliCommand(args, capabilities))),
    ].join("\n");
    expect(outputs).not.toMatch(/deliver|not available yet|pending|parity|partial/i);
  });

  it("never executes maintenance after execution parsing or a literal boundary", async () => {
    const launch = vi.fn(async () => 0), update = vi.fn(async () => 0);
    const handlers = { launch, update, version: vi.fn(async () => 0), packages: vi.fn(async () => 0), sessionContext: vi.fn(async () => 0) };
    for (const args of [["--", "update"], ["--model", "provider/model", "update"], ["explain this repository"]]) {
      expect(await dispatchCli(args, handlers, { stdout() {}, stderr() {} }, capabilities)).toBe(0);
    }
    expect(launch).toHaveBeenCalledTimes(3);
    expect(update).not.toHaveBeenCalled();
    expect(await dispatchCli(["update"], handlers, { stdout() {}, stderr() {} }, capabilities)).toBe(0);
    expect(update).toHaveBeenCalledExactlyOnceWith("next", undefined);
  });

  it("routes Pi maintenance through shared handlers and never treats source-less uninstall as product removal", async () => {
    const control = vi.fn(async (_arguments: readonly string[]) => 0), launch = vi.fn(async () => 0);
    const handlers = { control, launch, version: vi.fn(async () => 0), catalog: vi.fn(async () => 0) };
    for (const args of [["update"], ["update", "--self"], ["install", "npm:x"], ["remove"]]) {
      await dispatchPiCompatibleCommand(parsePiCompatibleCommand(args), handlers, { stdout() {}, stderr() {} });
    }
    expect(control.mock.calls.map(([args]) => args)).toEqual([["update"], ["update"], ["install", "npm:x"], ["remove"]]);
    expect(parsePiCompatibleCommand(["uninstall"])).toMatchObject({ kind: "error" });
    expect(parsePiCompatibleCommand(["uninstall", "--yes"])).toMatchObject({ kind: "error" });
    expect(launch).not.toHaveBeenCalled();
  });
});
