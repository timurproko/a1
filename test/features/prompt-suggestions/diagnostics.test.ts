import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { SuggestionDiagnosticCapture } from "../../../src/features/prompt-suggestions/index.js";
import type { SuggestionDiagnosticRecord } from "../../../src/contracts/owned-ui/index.js";

const RECORD: SuggestionDiagnosticRecord = {
  event: "started", session: 1, request: 1, run: 1, response: 2,
  provider: "github-copilot", model: "claude-opus", reasoning: "low", elapsedMs: 0,
};

describe("private suggestion diagnostic capture", () => {
  it("does nothing unless explicitly enabled and clears memory on disposal", async () => {
    const writeSnapshot = vi.fn(async () => {});
    const off = new SuggestionDiagnosticCapture({ writeSnapshot });
    off.record(RECORD);
    await off.flush();
    expect(off.snapshot()).toEqual([]);
    expect(writeSnapshot).not.toHaveBeenCalled();
    const on = new SuggestionDiagnosticCapture({ enabled: true });
    on.record(RECORD);
    on.dispose();
    on.record(RECORD);
    expect(on.snapshot()).toEqual([]);
  });

  it("projects allowlisted bounded metadata without raw errors, paths, or payloads", () => {
    const capture = new SuggestionDiagnosticCapture({ enabled: true });
    for (let request = 1; request <= 1000; request++) {
      capture.record({ ...RECORD, request, provider: "D:/private/session.jsonl", model: "m".repeat(10000),
        error: "secret", text: "archive it", prompt: "private user input", sessionPath: "/private/session.jsonl",
      } as SuggestionDiagnosticRecord);
    }
    expect(capture.snapshot()).toHaveLength(128);
    expect(capture.snapshot()[0]?.request).toBe(873);
    expect(capture.snapshot()[0]?.provider).toBe("redacted");
    expect(capture.snapshot()[0]?.model).toHaveLength(64);
    const serialized = JSON.stringify(capture.snapshot());
    expect(Buffer.byteLength(serialized)).toBeLessThanOrEqual(65_536);
    for (const secret of ["secret", "private", "archive it", "sessionPath"]) expect(serialized).not.toContain(secret);
  });

  it("coalesces writes to one in-flight and one latest bounded snapshot", async () => {
    const writes: string[] = [];
    let release!: () => void;
    const capture = new SuggestionDiagnosticCapture({ enabled: true, writeSnapshot: async snapshot => {
      writes.push(snapshot);
      if (writes.length === 1) await new Promise<void>(resolve => { release = resolve; });
    } });
    capture.record(RECORD);
    await Promise.resolve();
    for (let request = 2; request <= 500; request++) capture.record({ ...RECORD, request });
    expect(writes).toHaveLength(1);
    release();
    await capture.flush();
    expect(writes).toHaveLength(2);
    expect(JSON.parse(writes[1]!).records.at(-1).request).toBe(500);
    expect(writes.every(value => Buffer.byteLength(value) <= 65_536)).toBe(true);
  });

  it("survives synchronous and asynchronous sink failures without printing", async () => {
    for (const writeSnapshot of [() => { throw Error("private"); }, async () => { throw Error("private"); }]) {
      const capture = new SuggestionDiagnosticCapture({ enabled: true, writeSnapshot });
      expect(() => capture.record(RECORD)).not.toThrow();
      await expect(capture.flush()).resolves.toBeUndefined();
      expect(capture.snapshot()).toEqual([RECORD]);
    }
  });

  it("exports an inspectable local snapshot only to an explicit destination", async () => {
    const directory = await mkdtemp(join(tmpdir(), "suggestion-capture-"));
    try {
      const destination = join(directory, "suggestions.json");
      const capture = new SuggestionDiagnosticCapture({ enabled: true, destination });
      capture.record(RECORD);
      capture.record({ ...RECORD, event: "timeout", elapsedMs: 15000 });
      await capture.flush();
      expect(JSON.parse(await readFile(destination, "utf8"))).toMatchObject({
        schema: "prompt-suggestion-diagnostics-v1", records: [RECORD, { event: "timeout", elapsedMs: 15000 }],
      });
      capture.dispose();
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
