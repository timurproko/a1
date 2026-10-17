import { describe, expect, it } from "vitest";
import { interactionCase, KEY_TRANSPORT_CASES } from "../../../scripts/development/interaction-parity/matrix.mjs";
import { buildObservations, caseStream, PARITY_REPORT_SCHEMA, parityReport, recordsFromOutput, stepBytes } from "../../../scripts/development/verify-interaction-parity.mjs";

describe("interaction parity harness", () => {
  it("encodes matrix steps as the bytes a direct terminal sends", () => {
    expect(stepBytes({ kind: "text", text: "hi" })).toEqual(Buffer.from("hi"));
    expect(stepBytes({ kind: "key", key: "a", mods: ["ctrl"], text: "a" })).toEqual(Buffer.from([0x01]));
    expect(stepBytes({ kind: "key", key: "x", mods: ["alt"], text: "x" })).toEqual(Buffer.from("\u001bx"));
    expect(stepBytes({ kind: "key", key: "arrow-left", mods: ["ctrl"] })).toEqual(Buffer.from("\u001b[1;5D"));
    expect(stepBytes({ kind: "key", key: "enter", mods: ["shift"] })).toEqual(Buffer.from("\u001b[13;2u"));
    expect(stepBytes({ kind: "key", key: "tab", mods: ["shift"] })).toEqual(Buffer.from("\u001b[Z"));
    expect(stepBytes({ kind: "paste", text: "a\nb" })).toEqual(Buffer.from("\u001b[200~a\nb\u001b[201~"));
    expect(stepBytes({ kind: "mouse", action: "press", button: 1, column: 4, row: 2 })).toEqual(Buffer.from("\u001b[<0;5;3M"));
    expect(stepBytes({ kind: "mouse", action: "release", button: 1, column: 4, row: 2 })).toEqual(Buffer.from("\u001b[<0;5;3m"));
    expect(stepBytes({ kind: "mouse", action: "scroll-down", column: 0, row: 0 })).toEqual(Buffer.from("\u001b[<65;1;1M"));
    expect(stepBytes({ kind: "focus", gained: true })).toEqual(Buffer.from("\u001b[I"));
    expect(stepBytes({ kind: "wait", ms: 10 })).toBeNull();
    expect(stepBytes({ kind: "resize", columns: 80, rows: 20 })).toBeNull();
    for (const entry of KEY_TRANSPORT_CASES) {
      expect(entry.steps.some(step => stepBytes(step) !== null), entry.id).toBe(true);
    }
  });

  it("compares one byte stream per case however each path split its reads", () => {
    const direct = caseStream(recordsFromOutput("in#1:68656c6c6f;"));
    const resident = caseStream(recordsFromOutput("in#1:68; in#2:65; in#3:6c6c; in#4:6f;"));
    expect(direct).toEqual(resident);
    expect(caseStream([])).toEqual({ seq: 1, hex: "" });
    expect(stepBytes({ kind: "mouse", action: "press", button: 1, column: 4, row: 2 }, 1)).toEqual(Buffer.from("\u001b[<0;5;4M"));
  });

  it("reads child records once each in order and digests them without keeping bytes", () => {
    const output = "junk in#2:1b5b44; in#1:61;\r\nin#2:1b5b44; in#3:03;";
    expect(recordsFromOutput(output)).toEqual([{ seq: 1, hex: "61" }, { seq: 2, hex: "1b5b44" }, { seq: 3, hex: "03" }]);
    const observations = buildObservations("prompt.type-ascii", "resident", "linux-x64", recordsFromOutput(output), 10, 12);
    expect(observations.map(observation => [observation.seq, observation.length])).toEqual([[1, 1], [2, 3], [3, 1]]);
    expect(JSON.stringify(observations)).not.toContain("1b5b44");
  });

  it("writes a per-platform verdict that fails on divergence, faults, or driver failures", () => {
    const entry = interactionCase("prompt.type-ascii");
    const direct = buildObservations(entry.id, "direct", "linux-x64", recordsFromOutput("in#1:68; in#2:65;"), 0, 1);
    const same = buildObservations(entry.id, "resident", "linux-x64", recordsFromOutput("in#1:68; in#2:65;"), 0, 2);
    const passing = parityReport("linux-x64", [...direct, ...same], [{ ...entry, expects: ["key"] }], []);
    expect(passing).toMatchObject({ schema: PARITY_REPORT_SCHEMA, platform: "linux-x64", passed: true, compared: 2, divergences: [] });
    const different = buildObservations(entry.id, "resident", "linux-x64", recordsFromOutput("in#1:68; in#2:0d;"), 0, 2);
    const failing = parityReport("linux-x64", [...direct, ...different], [{ ...entry, expects: ["key"] }], []);
    expect(failing.passed).toBe(false);
    expect(failing.divergences[0]).toMatchObject({ caseId: entry.id, kind: "key", seq: 2, field: "digest" });
    expect(parityReport("linux-x64", [...direct, ...same], [{ ...entry, expects: ["key"] }], [{ caseId: entry.id, reason: "duplicate" }]).passed).toBe(false);
    expect(parityReport("linux-x64", [...direct, ...same], [{ ...entry, expects: ["key"] }], [], [{ caseId: entry.id, candidate: "resident", reason: "timed out" }]).passed).toBe(false);
    expect(parityReport("win32-x64", [...direct, ...same], [{ ...entry, expects: ["key"] }], []).compared).toBe(0);
  });
});
