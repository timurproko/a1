import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { consumeTabLaunchContext } from "../../../bin/tab-launch-context.js";

const exec = promisify(execFile);
const names = ["A1_TAB_ID", "A1_TAB_TOKEN", "A1_TAB_ENDPOINT"] as const;

describe("resident tab credential consumption", () => {
  it("moves credentials into private state and strips every inheritable entry", async () => {
    const environment: Record<string, string | undefined> = {
      A1_TAB_ID: "tab-1",
      A1_TAB_TOKEN: "private-token",
      A1_TAB_ENDPOINT: "private-endpoint",
      RETAINED: "yes",
    };
    const result = consumeTabLaunchContext(["--tab", "--session", "saved.jsonl"], environment);
    expect(result).toEqual({
      uiArguments: ["--session", "saved.jsonl"],
      tabCredentials: { tabId: "tab-1", token: "private-token", endpoint: "private-endpoint" },
    });
    expect(names.map(name => environment[name])).toEqual([undefined, undefined, undefined]);

    const child = await exec(process.execPath, ["-e", `process.stdout.write(JSON.stringify(${JSON.stringify(names)}.map(name => process.env[name] ?? null)))`], {
      env: environment as NodeJS.ProcessEnv,
    });
    expect(JSON.parse(child.stdout)).toEqual([null, null, null]);
  });

  it("strips stray credentials outside tab mode and fails closed after stripping incomplete tab mode", () => {
    const direct: Record<string, string | undefined> = Object.fromEntries(names.map(name => [name, "stray"]));
    expect(consumeTabLaunchContext([], direct)).toEqual({ uiArguments: [], tabCredentials: undefined });
    expect(names.map(name => direct[name])).toEqual([undefined, undefined, undefined]);

    const incomplete: Record<string, string | undefined> = { A1_TAB_ID: "tab-1", A1_TAB_TOKEN: "token" };
    expect(() => consumeTabLaunchContext(["--tab"], incomplete)).toThrow("requires bridge credentials");
    expect(names.map(name => incomplete[name])).toEqual([undefined, undefined, undefined]);
  });
});
