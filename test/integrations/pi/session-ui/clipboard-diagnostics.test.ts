import { afterEach, describe, expect, it, vi } from "vitest";
import { ClipboardDiagnosticCapture } from "../../../../src/integrations/pi/session-ui/clipboard-diagnostics.js";
import type { ResponseCopyEvent } from "../../../../src/integrations/pi/session-ui/response-copy-protocol.js";

afterEach(() => vi.useRealTimers());
const event: ResponseCopyEvent = { request: 1, phase: "submitting", atMs: 10, elapsedMs: 5, pending: 1, sourceUnits: 5, bytes: 5, transport: "native" };

/** A blocked diagnostics sink must not create a growing I/O queue or retain clipboard payloads. */
describe("clipboard diagnostic capture", () => {
  it("projects only safe scalar metadata and rejects unknown phases", async () => {
    vi.useFakeTimers();
    const snapshots: string[] = [];
    const capture = new ClipboardDiagnosticCapture("local-only.json", async (_path, data) => { snapshots.push(data); });
    capture.copy({ ...event, payload: "private clipboard payload", path: "private/path", image: "secret-base64" } as ResponseCopyEvent);
    await capture.flush();
    capture.copy({ ...event, phase: "private clipboard payload" } as unknown as ResponseCopyEvent);
    capture.paste({ request: -1, phase: "framing", atMs: 11, pending: 0, bytes: 20, transport: "terminal" });
    capture.runtime({ phase: "write-end", revision: 2, atMs: 12, pendingDepth: 0, pendingPresentationDepth: 0, appliedRevision: 2 });
    await capture.flush();
    const data = snapshots.at(-1)!;
    expect(data).not.toMatch(/private|secret|base64|image|payload/);
    expect(JSON.parse(data).records).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "copy", phase: "submitting", transport: "native" }),
      expect.objectContaining({ source: "paste", phase: "framing", request: -1 }),
      expect.objectContaining({ source: "runtime", phase: "write-end" }),
    ]));
    capture.dispose();
  });

  it("bounds records and keeps just one pending snapshot while disk writing stalls", async () => {
    vi.useFakeTimers();
    let release!: () => void;
    const waiting = new Promise<void>(resolve => { release = resolve; });
    const writes: string[] = [];
    const capture = new ClipboardDiagnosticCapture("unused.json", async (_path, data) => { writes.push(data); if (writes.length === 1) await waiting; });
    capture.copy(event); await Promise.resolve();
    for (let request = 2; request <= 500; request++) capture.copy({ ...event, request });
    expect(writes).toHaveLength(1);
    release(); await capture.flush();
    expect(writes).toHaveLength(2);
    expect(JSON.parse(writes[1]!).records).toHaveLength(128);
    expect(JSON.parse(writes[1]!).records.at(-1).request).toBe(500);
    expect(Buffer.byteLength(writes[1]!)).toBeLessThan(65_536);
    capture.dispose();
    await vi.advanceTimersByTimeAsync(1_000);
    capture.copy(event); await capture.flush();
    expect(writes).toHaveLength(2);
  });

  it("emits a heartbeat, tolerates disk errors, and removes the timer on disposal", async () => {
    vi.useFakeTimers();
    const write = vi.fn(async () => { throw new Error("private disk failure"); });
    const capture = new ClipboardDiagnosticCapture("unused.json", write);
    await vi.advanceTimersByTimeAsync(100); await capture.flush();
    expect(write).toHaveBeenCalledOnce();
    expect(write.mock.calls[0]).toBeDefined();
    capture.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});
