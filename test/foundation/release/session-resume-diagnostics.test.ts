import { describe, expect, it } from "vitest";
import { summarizeResumeTrace } from "../../support/session-resume-diagnostics.js";

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
    const result = summarizeResumeTrace(`${event("guardian-start", 25.6)}\n{"partial-secret":`);
    expect(result).toMatchObject({ invalidRecords: 1, lastPhase: "guardian-start", phases: [{ phase: "guardian-start", elapsedMs: 26 }] });
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

  it("bounds source size without leaking an oversized malformed record", () => {
    const result = summarizeResumeTrace("private".repeat(20_000));
    expect(result).toMatchObject({ truncated: true, invalidRecords: 1, phases: [] });
    expect(JSON.stringify(result).length).toBeLessThan(200);
  });
});
