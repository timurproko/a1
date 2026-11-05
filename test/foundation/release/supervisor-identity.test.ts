import { describe, expect, it } from "vitest";
import { supervisorProcessState, observeSupervisorProcess } from "../../../src/foundation/release/supervisor-identity.js";
import { cleanupProvenIdleOwner } from "../../../src/foundation/release/process-cleanup.js";
import { fixtureMetadata } from "./supervisor-recovery-fixture.js";

describe("independent supervisor generation identity", () => {
  it("distinguishes the native generation from a reused PID and a terminated object", async () => {
    const metadata = fixtureMetadata({ nativeStartIdentity: "windows-filetime:123" });
    await expect(supervisorProcessState(metadata, async pid => ({ pid, startIdentity: "windows-filetime:123" }))).resolves.toBe("same");
    await expect(supervisorProcessState(metadata, async pid => ({ pid, startIdentity: "windows-filetime:456" }))).resolves.toBe("gone");
    await expect(supervisorProcessState(metadata, async () => null)).resolves.toBe("gone");
  });

  it("does not confuse denied inspection, different token formats, or invalid PID observations with death", async () => {
    const metadata = fixtureMetadata({ nativeStartIdentity: "windows-filetime:123" });
    await expect(supervisorProcessState(metadata, async () => { throw new Error("access denied"); })).resolves.toBe("unknown");
    await expect(supervisorProcessState(metadata, async pid => ({ pid, startIdentity: "linux-proc-start:123" }))).resolves.toBe("unknown");
    await expect(supervisorProcessState(metadata, async pid => ({ pid: pid + 1, startIdentity: "windows-filetime:123" }))).resolves.toBe("unknown");
  });

  it.each(["windows", "darwin"])("supports legacy %s reuse only when creation is later than publication", async platform => {
    const published = Date.parse("2026-11-05T12:00:00Z");
    const token = (ms: number) => platform === "windows"
      ? `windows-filetime:${(BigInt(ms) + 11_644_473_600_000n) * 10_000n}`
      : `darwin-proc-start:${Math.floor(ms / 1_000)}:0`;
    const metadata = fixtureMetadata({ startedAt: new Date(published).toISOString() });
    await expect(supervisorProcessState(metadata, async pid => ({ pid, startIdentity: token(published - 100) }))).resolves.toBe("unknown");
    await expect(supervisorProcessState(metadata, async pid => ({ pid, startIdentity: token(published + 500) }))).resolves.toBe("unknown");
    await expect(supervisorProcessState(metadata, async pid => ({ pid, startIdentity: token(published + 10_000) }))).resolves.toBe("gone");
  });

  it.each(["windows-filetime:broken", "", 123])("preserves malformed recorded native identity %s", async token => {
    await expect(supervisorProcessState(fixtureMetadata({ nativeStartIdentity: token as string }), async pid => ({ pid, startIdentity: "windows-filetime:123" }))).resolves.toBe("unknown");
  });

  it("preserves legacy tick-only and malformed publication evidence", async () => {
    await expect(supervisorProcessState(fixtureMetadata(), async pid => ({ pid, startIdentity: "linux-proc-start:999999999" }))).resolves.toBe("unknown");
    await expect(supervisorProcessState(fixtureMetadata({ startedAt: "invalid" }), async pid => ({ pid, startIdentity: "windows-filetime:999999999999999999" }))).resolves.toBe("unknown");
  });

  it("never signals a reused PID or an unresponsive live process merely because its stored list is empty", async () => {
    const current = await observeSupervisorProcess(process.pid);
    expect(current).not.toBeNull();
    const idle = fixtureMetadata({ nativeStartIdentity: current!.startIdentity, ownership: { state: "idle", liveInstanceIds: [], nonResumableInstanceIds: [], uncertainInstanceIds: [] } });
    expect(await cleanupProvenIdleOwner(idle, 1)).toMatchObject({ terminated: false, attempted: ["live-owner-preserved"] });
    expect(await cleanupProvenIdleOwner({ ...idle, nativeStartIdentity: current!.startIdentity.replace(/\d+/, token => String(BigInt(token) + 1n)) }, 1)).toMatchObject({ terminated: true, attempted: ["owner-already-dead"] });
    expect(await observeSupervisorProcess(process.pid)).toEqual(current);
    await expect(cleanupProvenIdleOwner({ ...idle, ownership: { ...idle.ownership, uncertainInstanceIds: ["unknown"] } })).rejects.toThrow(/recorded live/);
  });
});
