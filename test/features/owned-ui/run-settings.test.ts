import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OwnedUiSettingsSession } from "../../../src/foundation/owned-ui-settings/index.js";
import {
  OwnedUiSettingsStore,
  type OwnedUiSettingDeclaration,
} from "../../../src/foundation/owned-ui-settings/index.js";
import type { AgentJsonValue, AgentSettingDescriptor, AgentSettingsPort } from "../../../src/foundation/agent-engine-contracts/index.js";

const DECLARATIONS: readonly OwnedUiSettingDeclaration[] = [
  {
    id: "density",
    description: "Vertical density.",
    application: "live",
    defaultValue: "comfortable",
    allowedValues: ["comfortable", "compact"],
  },
  {
    id: "confirmExit",
    description: "Ask before exiting.",
    application: "restart",
    defaultValue: false,
    allowedValues: [true, false],
  },
];

interface SyntheticAgentOptions {
  readonly write?: boolean;
  readonly flush?: boolean;
  readonly failListSettings?: boolean;
  readonly failWrite?: boolean;
}

interface SyntheticPort extends AgentSettingsPort {
  readonly writes: { key: string; value: AgentJsonValue }[];
  readonly flushed: () => number;
}

function syntheticPort(options: SyntheticAgentOptions = {}): SyntheticPort {
  const write = options.write ?? true;
  const flush = options.flush ?? true;
  const values: Record<string, AgentJsonValue> = { autoCompact: true, thinkingLevel: "low" };
  const writes: { key: string; value: AgentJsonValue }[] = [];
  let flushes = 0;

  return {
    capabilities: { write, flush },
    writes,
    flushed: () => flushes,
    async listSettings(): Promise<readonly AgentSettingDescriptor[]> {
      if (options.failListSettings) throw new Error("engine unreachable");
      return [
        { key: "autoCompact", valueType: "boolean", writable: true },
        { key: "thinkingLevel", valueType: "enum", writable: true, choices: ["off", "low", "high"] },
      ];
    },
    async readSetting(key: string): Promise<AgentJsonValue | undefined> {
      return values[key];
    },
    ...(write
      ? {
        async writeSetting(key: string, value: AgentJsonValue): Promise<void> {
          if (options.failWrite) throw new Error("engine rejected the write");
          writes.push({ key, value });
          values[key] = value;
        },
      }
      : {}),
    ...(flush ? { async flush(): Promise<void> { flushes += 1; } } : {}),
  };
}

let root: string;

function session(agent: AgentSettingsPort | null): OwnedUiSettingsSession {
  const store = new OwnedUiSettingsStore({ configDir: root, profileId: "a1", declarations: DECLARATIONS, migrations: [] });
  return new OwnedUiSettingsSession({ store, agent });
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "a1-settings-session-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("owned UI startup", () => {
  it("resolves settings once before the application starts", async () => {
    const { runOwnedUi } = await import("../../../src/features/owned-ui/index.js");
    const order: string[] = [];
    const target = session(syntheticPort());
    target.onChange(() => { order.push("settings-loaded"); });

    const application = {
      disposed: false,
      start: () => { order.push("start"); },
      flush: async () => { order.push("flush"); },
      waitUntilStopped: async () => { order.push("stopped"); },
      dispose: async () => { order.push("dispose"); },
    };

    await expect(runOwnedUi({ application, settings: target })).resolves.toBe(0);
    expect(order).toEqual(["settings-loaded", "start", "flush", "stopped", "dispose"]);
    expect(target.sections()[1]?.entries.map(entry => entry.id)).toEqual(["autoCompact", "thinkingLevel"]);
  });

  it("runs without a settings session", async () => {
    const { runOwnedUi } = await import("../../../src/features/owned-ui/index.js");
    const application = {
      disposed: false,
      start: () => {},
      flush: async () => {},
      waitUntilStopped: async () => {},
      dispose: async () => {},
    };
    await expect(runOwnedUi({ application })).resolves.toBe(0);
  });
});
