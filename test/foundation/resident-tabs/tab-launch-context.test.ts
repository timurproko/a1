import { execFile } from "node:child_process";
import { PassThrough } from "node:stream";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { assignFreshSessionRuntimeId, consumeTabLaunchContext, waitForStandbyPromotion } from "../../../bin/tab-launch-context.js";

const exec = promisify(execFile);
const names = ["A1_TAB_ID", "A1_TAB_TOKEN", "A1_TAB_ENDPOINT"] as const;

describe("resident tab credential consumption", () => {
  it("assigns independent runtime identities to tab incarnations and a concurrent direct launch", () => {
    const environments = [{}, {}, {}] as Array<Record<string, string | undefined>>;
    const ids = ["tab-incarnation-1", "tab-incarnation-2", "direct-runtime"];
    const assigned = environments.map((environment, index) =>
      assignFreshSessionRuntimeId(environment, "SESSION_RUNTIME", () => ids[index]!));
    expect(new Set(assigned).size).toBe(3);
    expect(environments.map(environment => environment.SESSION_RUNTIME)).toEqual(ids);
  });

  it("moves credentials into private state and strips every inheritable entry", async () => {
    const environment: Record<string, string | undefined> = {
      A1_TAB_ID: "tab-1",
      A1_TAB_TOKEN: "private-token",
      A1_TAB_ENDPOINT: "private-endpoint",
      RETAINED: "yes",
    };
    const result = consumeTabLaunchContext([
      "--tab", "--tab-data-dir", "private/recovery/tab-1", "--tab-incarnation", "7", "--session", "saved.jsonl",
    ], environment);
    expect(result).toEqual({
      uiArguments: ["--session", "saved.jsonl"],
      tabCredentials: { tabId: "tab-1", token: "private-token", endpoint: "private-endpoint" },
      tabDataDir: "private/recovery/tab-1",
      tabIncarnation: 7,
      tabStandby: false,
    });
    expect(names.map(name => environment[name])).toEqual([undefined, undefined, undefined]);

    const child = await exec(process.execPath, ["-e", `process.stdout.write(JSON.stringify(${JSON.stringify(names)}.map(name => process.env[name] ?? null)))`], {
      env: environment as NodeJS.ProcessEnv,
    });
    expect(JSON.parse(child.stdout)).toEqual([null, null, null]);
  });

  it("waits for a split-safe authenticated holder promotion marker", async () => {
    const input = new PassThrough();
    let promoted = false;
    const waiting = waitForStandbyPromotion(input as unknown as NodeJS.ReadStream)
      .then(() => { promoted = true; });
    input.write(Buffer.from("ignored\x1b]a1;standby-"));
    await Promise.resolve();
    expect(promoted).toBe(false);
    input.write(Buffer.from("promote\x07"));
    await waiting;
    expect(promoted).toBe(true);
    input.destroy();
  });

  it("recognizes the internal standby without forwarding it to session parsing", () => {
    const environment: Record<string, string | undefined> = {
      A1_TAB_ID: "standby-1",
      A1_TAB_TOKEN: "private-token",
      A1_TAB_ENDPOINT: "private-endpoint",
    };
    expect(consumeTabLaunchContext([
      "--tab", "--tab-standby", "--tab-data-dir", "private/recovery/standby-1", "--tab-incarnation", "1",
    ], environment)).toMatchObject({ uiArguments: [], tabStandby: true });
  });

  it("strips stray credentials outside tab mode and fails closed after stripping incomplete tab mode", () => {
    const direct: Record<string, string | undefined> = Object.fromEntries(names.map(name => [name, "stray"]));
    expect(consumeTabLaunchContext([], direct)).toEqual({ uiArguments: [], tabCredentials: undefined, tabStandby: false });
    expect(names.map(name => direct[name])).toEqual([undefined, undefined, undefined]);

    const incomplete: Record<string, string | undefined> = Object.fromEntries(names.slice(0, 2).map((name, index) => [name, index === 0 ? "tab-1" : "token"]));
    expect(() => consumeTabLaunchContext(["--tab"], incomplete)).toThrow("requires bridge credentials");
    expect(names.map(name => incomplete[name])).toEqual([undefined, undefined, undefined]);
  });
});
