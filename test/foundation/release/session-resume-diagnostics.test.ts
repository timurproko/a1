import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readResumeFatalDiagnostics, summarizeResumeFatal, summarizeResumeTrace } from "../../support/session-resume-diagnostics.js";

const event = (phase: string, elapsedMs: number, extra = {}) => JSON.stringify({ schema: "a1-startup-trace-v1", phase, elapsedMs, ...extra });

describe("packaged resume trace diagnostics", () => {
  it("distinguishes absent trace from a cold bootstrap that has not selected a release", () => {
    expect(summarizeResumeTrace("")).toMatchObject({ tracePresent: false, readyTrace: false, lastPhase: null });
    expect(summarizeResumeTrace(event("bootstrap-start", 22))).toMatchObject({
      tracePresent: true, readyTrace: false, lastPhase: "bootstrap-start", phases: [{ phase: "bootstrap-start", elapsedMs: 22 }],
    });
  });

  it("sorts concurrent phase writes without confusing output-marker readiness with trace readiness", () => {
    const result = summarizeResumeTrace([event("first-input-ready-render", 3500), event("ui-entry", 2000)].join("\n"));
    expect(result).toMatchObject({ readyTrace: true, lastPhase: "first-input-ready-render" });
    expect(result.phases.map(value => value.elapsedMs)).toEqual([2000, 3500]);
    expect(result).not.toHaveProperty("markerPresent");
  });

  it("retains earlier phases when the last append is incomplete", () => {
    const result = summarizeResumeTrace(`${event("ui-entry", 25.6)}\n{"partial-secret":`);
    expect(result).toMatchObject({ invalidRecords: 1, lastPhase: "ui-entry", phases: [{ phase: "ui-entry", elapsedMs: 26 }] });
    expect(JSON.stringify(result)).not.toContain("partial-secret");
  });

  it("never exposes unknown phases, fields, paths, or content", () => {
    const source = [event("ui-entry", 10, { path: "secret-path", token: "secret-token", session: "private-text" }), event("secret-phase", 20)].join("\n");
    const result = summarizeResumeTrace(source);
    expect(result).toMatchObject({ invalidRecords: 1, lastPhase: "ui-entry" });
    expect(JSON.stringify(result)).not.toMatch(/secret|private/);
  });

  it.each(["null", "[]", "42", '{"schema":"wrong","phase":"ui-entry","elapsedMs":1}', event("ui-entry", -1), '{"schema":"a1-startup-trace-v1","phase":"ui-entry","elapsedMs":1e999}'])
    ("counts malformed records without accepting them as ready: %s", source => {
      expect(summarizeResumeTrace(source)).toMatchObject({ invalidRecords: 1, readyTrace: false, phases: [] });
    });

  it("bounds record count and rejects a ready event beyond the evidence limit", () => {
    const source = [...Array.from({ length: 64 }, () => event("ui-entry", 1)), event("first-input-ready-render", 2)].join("\n");
    const result = summarizeResumeTrace(source);
    expect(result).toMatchObject({ truncated: true, readyTrace: false });
    expect(result.phases).toHaveLength(64);
  });

  it("retains only safe shutdown failure classifications and relative owned code locations", () => {
    const result = summarizeResumeFatal(JSON.stringify({
      origin: "unhandledRejection", classification: "Error", cleanupFailed: false,
      message: "private-message", token: "secret-token", releaseId: "private-release",
      locations: [
        { file: "foundation/release/update.js", line: 10, column: 2, private: "hidden" },
        { file: "/private/secret.ts", line: 1, column: 1 },
        { file: "foundation/../../secret.js", line: 1, column: 1 },
        { file: "foundation/invalid.js", line: -1, column: 1 },
      ],
    }));
    expect(result).toEqual({ origin: "unhandledRejection", classification: "Error", cleanupFailed: false,
      locations: [{ file: "foundation/release/update.js", line: 10, column: 2 }],
    });
    expect(JSON.stringify(result)).not.toMatch(/private|secret|hidden/u);
  });

  it.each(["null", "{", "[]", JSON.stringify({ origin: "secret", classification: "Error", cleanupFailed: false, locations: [] }), "x".repeat(16_385)])("rejects malformed or oversized fatal records", source => {
    expect(summarizeResumeFatal(source)).toBeNull();
  });

  it("reads bounded fixture fatal records without copying unrelated runtime content", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "resume-fatal-evidence-"));
    try {
      const record = { origin: "entry", classification: "TypeError", cleanupFailed: true, locations: [] };
      await writeFile(resolve(root, "fatal-1-abc.json"), JSON.stringify(record));
      await writeFile(resolve(root, "fatal-2-abc.json"), "x".repeat(16_385));
      await writeFile(resolve(root, "unrelated.json"), JSON.stringify({ ...record, private: "secret" }));
      expect(await readResumeFatalDiagnostics(root)).toEqual([record]);
      expect(await readResumeFatalDiagnostics(resolve(root, "absent"))).toEqual([]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("bounds source size without leaking an oversized malformed record", () => {
    const result = summarizeResumeTrace("private".repeat(20_000));
    expect(result).toMatchObject({ truncated: true, invalidRecords: 1, phases: [] });
    expect(JSON.stringify(result).length).toBeLessThan(200);
  });
});
