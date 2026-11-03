import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { ResidentFrameDecoder } from "../../../src/foundation/resident-tabs/protocol.js";
import { assessRuntimeControl, readRuntimeControl, RUNTIME_CONTROL_API, RUNTIME_CONTROL_CORE } from "../../../src/foundation/resident-tabs/runtime-control.js";
import type { MaintenanceOptions, MaintenanceReport } from "../../../src/foundation/resident-tabs/maintenance.js";

const identity = { releaseId: "a".repeat(64), scope: "b".repeat(20), epoch: 7, bootId: "boot", osSessionId: "login" };
const description = () => ({
  api: RUNTIME_CONTROL_API, generation: 1, ...identity, core: [...RUNTIME_CONTROL_CORE],
  frameLimit: 2 * 1024 * 1024, inputLimit: 1024 * 1024, retryInput: false,
});
const report = (overrides: Partial<MaintenanceReport> = {}): MaintenanceReport => ({
  schema: "a1-tabs-maintenance-v1", command: "runtime-control", host: "running", exitCode: 0,
  result: description(), ...overrides,
});
const options = { expected: identity, profileRoot: "/profile", dataDir: "/data", runtimeDir: "/runtime", releaseRoots: ["/source-a"], environment: {} };

describe("stable runtime-control consumer", () => {
  it("pins the provider's mandatory contract without equating client and execution release", () => {
    expect(RUNTIME_CONTROL_API).toBe("resident-control-v1");
    expect(RUNTIME_CONTROL_CORE).toEqual(["attach", "tab.list", "tab.view", "input", "resize", "detach", "controller-boundary"]);
    const verdict = assessRuntimeControl(description(), identity);
    expect(verdict).toEqual({ status: "compatible", contract: description() });
    expect(verdict.status === "compatible" && Object.isFrozen(verdict.contract)).toBe(true);
  });

  it("consumes the exact pinned native provider bytes", async () => {
    const manifest = JSON.parse(await readFile(new URL("../../../native/terminal-host/protocol/fixtures.json", import.meta.url), "utf8")) as {
      fixtures: { name: string; bytes: string; sha256: string }[];
    };
    const fixture = manifest.fixtures.find(entry => entry.name === "runtime-control.msgpack")!;
    const bytes = Buffer.from(fixture.bytes, "hex");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(fixture.sha256);
    const frames = new ResidentFrameDecoder().push(bytes);
    expect(frames).toEqual([{ type: "runtime.describe", requestId: 2, body: description() }]);
    expect(assessRuntimeControl(frames[0]!.body, identity)).toEqual({ status: "compatible", contract: description() });
  });

  it("ignores additive optional data rather than retaining it", () => {
    const value = { ...description(), optionalFutureCapability: true, credential: "must-not-retain" };
    const verdict = assessRuntimeControl(value, identity);
    expect(verdict).toEqual({ status: "compatible", contract: description() });
    expect(JSON.stringify(verdict)).not.toContain("must-not-retain");
  });

  it.each(["releaseId", "scope", "bootId", "osSessionId"] as const)("refuses another source's %s even at the same API/generation", key => {
    const value = { ...description(), [key]: key === "releaseId" ? "c".repeat(64) : key === "scope" ? "c".repeat(20) : "other" };
    expect(assessRuntimeControl(value, identity)).toEqual({ status: "blocked", reason: "source-mismatch" });
  });

  it.each([6, 8])("requires topology revalidation on a changed epoch %s", epoch => {
    expect(assessRuntimeControl({ ...description(), epoch }, identity)).toEqual({ status: "blocked", reason: "stale-epoch" });
  });

  it.each(RUNTIME_CONTROL_CORE)("refuses missing mandatory operation %s", method => {
    expect(assessRuntimeControl({ ...description(), core: RUNTIME_CONTROL_CORE.filter(entry => entry !== method) }, identity))
      .toEqual({ status: "blocked", reason: "missing-core" });
  });

  it("never opts into retrying uncertain input", () => {
    expect(assessRuntimeControl({ ...description(), retryInput: true }, identity)).toEqual({ status: "blocked", reason: "missing-core" });
  });

  it.each([
    null, [], {}, { ...description(), api: "future-required-api" }, { ...description(), generation: 2 },
    { ...description(), core: ["attach", "attach"] }, { ...description(), core: Array(65).fill("method") },
    { ...description(), epoch: 0 }, { ...description(), epoch: Number.MAX_SAFE_INTEGER + 1 },
    { ...description(), releaseId: "../source" }, { ...description(), scope: "../scope" },
    { ...description(), bootId: "boot\u0000" }, { ...description(), osSessionId: "" },
    { ...description(), frameLimit: 2 * 1024 * 1024 + 1 }, { ...description(), inputLimit: 1024 * 1024 + 1 },
    { ...description(), frameLimit: 100, inputLimit: 101 }, { ...description(), retryInput: undefined },
  ])("fails closed on malformed or unsupported metadata %#", value => {
    expect(assessRuntimeControl(value, identity).status).toBe("blocked");
  });

  it("bounds the read through release-local maintenance, without starting or substituting a host", async () => {
    const maintain = vi.fn(async (_: MaintenanceOptions) => report());
    await expect(readRuntimeControl({ ...options, maintain })).resolves.toEqual({ status: "compatible", contract: description() });
    expect(maintain).toHaveBeenCalledExactlyOnceWith({
      action: "runtime-control", profileRoot: "/profile", dataDir: "/data", runtimeDir: "/runtime", releaseRoots: ["/source-a"], environment: {},
    });
  });

  it.each([
    { host: "none" }, { host: "unresponsive" }, { host: "unverifiable" }, { host: "refused" },
    { exitCode: 3 }, { command: "host-status" }, { result: {} },
  ] satisfies Partial<MaintenanceReport>[])("cannot infer compatibility from a failed/foreign report %#", overrides => {
    const maintain = async () => report(overrides);
    return expect(readRuntimeControl({ ...options, maintain })).resolves.toMatchObject({ status: "blocked" });
  });

  it("returns a content-free blocked outcome on transport failure", async () => {
    const maintain = async () => { throw new Error("sensitive transport detail"); };
    await expect(readRuntimeControl({ ...options, maintain })).resolves.toEqual({ status: "blocked", reason: "unavailable" });
  });
});
