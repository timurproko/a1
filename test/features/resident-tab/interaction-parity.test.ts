import { describe, expect, it } from "vitest";
import { EXACT_PACKAGE_CASES, INTERACTION_MATRIX, interactionCase, LATENCY_BUDGETS_MS, type InteractionCategory } from "../../support/interaction-parity/matrix.js";
import { compareCandidates, digestContent, normalizeResident, type Observation, validateObservations } from "../../support/interaction-parity/observations.js";

const platform = "linux-x64";
const sample = (overrides: Partial<Observation> = {}): Observation => ({
  caseId: "prompt.type-ascii",
  candidate: "direct",
  platform,
  kind: "key",
  seq: 1,
  sentAt: 10,
  observedAt: 12,
  digest: digestContent("a"),
  length: 1,
  detail: { key: "a", mods: 0 },
  ...overrides,
});

function pair(caseId: string, kind: Observation["kind"], seq: number, detail?: Observation["detail"], residentLatency = 2): Observation[] {
  const shared = { caseId, kind, seq, ...(detail === undefined ? {} : { detail }) };
  const direct = sample({ ...shared, candidate: "direct" });
  const resident = sample({ ...shared, candidate: "resident", observedAt: 10 + residentLatency });
  return [direct, resident];
}

describe("interaction parity matrix", () => {
  it("names every category once or more with unique ids and a non-empty exact-package subset", () => {
    const ids = INTERACTION_MATRIX.map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    const categories: InteractionCategory[] = ["prompt-editing", "completion-history", "shortcuts", "selection", "clipboard", "mouse-focus", "dialogs", "extension-ui", "attachments", "resize", "streaming", "switching", "detach", "recovery", "restoration"];
    for (const category of categories) expect(INTERACTION_MATRIX.some(entry => entry.category === category), category).toBe(true);
    expect(EXACT_PACKAGE_CASES.length).toBeGreaterThanOrEqual(10);
    expect(INTERACTION_MATRIX.every(entry => entry.expects.length > 0 && entry.steps.length > 0)).toBe(true);
    expect(() => interactionCase("missing.case")).toThrow(/unknown interaction case/u);
    expect(Object.values(LATENCY_BUDGETS_MS).every(budget => budget > 0)).toBe(true);
  });
});

describe("interaction parity observations", () => {
  it("rejects duplicate, stale, out-of-order, missing, completion-only, non-normalizable, and content-bearing samples", () => {
    const cases = [interactionCase("prompt.type-ascii"), interactionCase("stream.concurrent")];
    const faults = validateObservations([
      sample(),
      sample(),
      sample({ seq: 2, sentAt: 20, observedAt: 15 }),
      sample({ seq: 3, sentAt: 5, observedAt: 30 }),
      sample({ candidate: "resident", kind: "cells", seq: 1, detail: { row: 0, column: 3 } }),
      sample({ kind: "prompt", seq: 1, detail: { text: "hello" } }),
      sample({ caseId: "stream.concurrent", kind: "stream", seq: 1, detail: { final: true } }),
    ], cases);
    expect(faults.map(fault => fault.reason)).toEqual(expect.arrayContaining(["duplicate", "stale", "negative", "non-normalizable", "content", "missing", "completion-only"]));
    expect(faults.filter(fault => fault.reason === "missing").map(fault => fault.kind)).toEqual(expect.arrayContaining(["cells", "cursor", "latency"]));
    expect(validateObservations([sample({ digest: "not-a-digest" })], [])).toEqual([expect.objectContaining({ reason: "content" })]);
  });

  it("drops exactly one strip row from resident coordinates", () => {
    const resident = sample({ candidate: "resident", kind: "cursor", detail: { row: 5, column: 2 } });
    expect(normalizeResident(resident)?.detail).toEqual({ row: 4, column: 2 });
    expect(normalizeResident(sample({ kind: "cursor", detail: { row: 5 } }))?.detail).toEqual({ row: 5 });
    expect(normalizeResident(sample({ candidate: "resident", detail: { key: "a" } }))).toEqual(sample({ candidate: "resident", detail: { key: "a" } }));
  });

  it("reports the first semantic divergence by case, kind, sequence, and field", () => {
    const cases = [interactionCase("prompt.type-ascii"), interactionCase("mouse.scroll")];
    const passing = compareCandidates([
      ...pair("prompt.type-ascii", "key", 1, { key: "a", mods: 0 }),
      ...pair("prompt.type-ascii", "cursor", 1, { row: 3, column: 1 }).map(observation => observation.candidate === "resident" ? { ...observation, detail: { row: 4, column: 1 } } : observation),
    ], cases, platform);
    expect(passing.passed).toBe(true);
    expect(passing.compared).toBe(2);

    const failing = compareCandidates([
      ...pair("prompt.type-ascii", "key", 1, { key: "a", mods: 0 }).map(observation => observation.candidate === "resident" ? { ...observation, detail: { key: "a", mods: 2 } } : observation),
      ...pair("prompt.type-ascii", "key", 2, { key: "b", mods: 0 }, 40),
      sample({ caseId: "mouse.scroll", kind: "cells", seq: 1 }),
    ], cases, platform);
    expect(failing.passed).toBe(false);
    expect(failing.divergences).toEqual(expect.arrayContaining([
      expect.objectContaining({ caseId: "prompt.type-ascii", kind: "key", seq: 1, field: "mods", direct: 0, resident: 2 }),
      expect.objectContaining({ caseId: "prompt.type-ascii", kind: "key", seq: 2, field: "latency" }),
      expect.objectContaining({ caseId: "mouse.scroll", kind: "cells", seq: 1, field: "presence", resident: null }),
    ]));
    expect(compareCandidates([
      sample({ caseId: "mouse.scroll", kind: "cells", seq: 1, candidate: "resident" }),
    ], cases, platform).divergences).toEqual([expect.objectContaining({ field: "presence", direct: null, resident: "observed" })]);
  });

  it("tolerates only the declared resident-only difference of a case", () => {
    const detach = interactionCase("detach.double-ctrl-c");
    const verdict = compareCandidates([
      ...pair(detach.id, "action", 1, { action: "exit" }).map(observation => observation.candidate === "resident" ? { ...observation, detail: { action: "detach" } } : observation),
    ], [detach], platform);
    expect(verdict.passed).toBe(true);
    expect(verdict.declared).toEqual([{ caseId: detach.id, difference: "detach-instead-of-exit" }]);
    const undeclared = compareCandidates([
      ...pair("prompt.type-ascii", "action", 1, { action: "exit" }).map(observation => observation.candidate === "resident" ? { ...observation, detail: { action: "detach" } } : observation),
    ], [interactionCase("prompt.type-ascii")], platform);
    expect(undeclared.passed).toBe(false);
    const strip = compareCandidates([
      ...pair("resize.shrink-grow", "cells", 1, { row: 0 }),
    ], [interactionCase("resize.shrink-grow")], platform);
    expect(strip.passed).toBe(true);
    expect(strip.declared).toEqual([{ caseId: "resize.shrink-grow", difference: "tab-strip-row" }]);
  });

  it("keeps platform verdicts separate", () => {
    const observations = [
      ...pair("prompt.type-ascii", "key", 1, { key: "a" }),
      sample({ platform: "win32-x64", caseId: "prompt.type-ascii", kind: "key", seq: 1, candidate: "direct" }),
    ];
    expect(compareCandidates(observations, [interactionCase("prompt.type-ascii")], platform).passed).toBe(true);
    expect(compareCandidates(observations, [interactionCase("prompt.type-ascii")], "win32-x64")).toMatchObject({ passed: false, compared: 0 });
  });
});
