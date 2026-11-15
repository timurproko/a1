import { describe, expect, it, vi } from "vitest";
import { runApiCommand } from "../../src/cli/api.js";
import { cliCapabilities, cliHelp, dispatchCli, parseCliCommand } from "../../src/cli/index.js";

describe("single integration namespace", () => {
  it("removes retired color syntax and advertises the shared API", () => {
    const capabilities = cliCapabilities("1.0.0");
    expect(capabilities.integrationApi).toBe(true);
    expect(parseCliCommand(["session", "color", "get"], capabilities)).toMatchObject({ kind: "error" });
    expect(cliHelp(capabilities)).not.toContain("session color");
    expect(cliHelp(capabilities)).toContain("api");
  });
  it("routes only API requests to the JSON handler without launch", async () => {
    const api = vi.fn(async () => 1), unused = vi.fn(async () => 0);
    const json = '{"version":1,"id":"discovery","type":"capabilities"}';
    await dispatchCli(["api", json], { api, launch: unused, version: unused, update: unused, packages: unused, sessionContext: unused }, { stdout() {}, stderr() {} }, cliCapabilities("1.0.0"));
    expect(api).toHaveBeenCalledWith([json]); expect(unused).not.toHaveBeenCalled();
  });
  it("lists declaration palette with clean discovery stdout and no Core environment", async () => {
    const lines: string[] = [];
    expect(await runApiCommand(['{"version":1,"id":"palette","type":"settings.list"}'], { environment: { HC_TERMINAL_ID: "invalid", PATH: "missing" }, stdout: text => lines.push(text) })).toBe(0);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!).data.settings[1].choices).toEqual(["blue", "green", "orange", "pink", "purple", "cyan", "grey"]);
    expect(lines[0]!.split("\n")).toHaveLength(2);
  });
});
