import { describe, expect, it } from "vitest";
import { loadAssociationRepair, parseAssociationRepair } from "../../scripts/governance/openspec-association-repair.mjs";

const record = {
  schema: "a1-openspec-association-repair-v1",
  repository: "owner/repo",
  change: "example-change",
  sourcePr: 7,
  sourceHead: "a".repeat(40),
  sourceMerge: "b".repeat(40),
  validationRunId: 42,
  failureReason: "missing-openspec-implementation-metadata",
  correctivePr: 8,
};

describe("OpenSpec association repair records", () => {
  it("parses the exact bounded schema and archived path", async () => {
    expect(parseAssociationRepair(JSON.stringify(record))).toEqual(record);
    const path = "openspec/changes/archive/2026-09-24-example-change/association-repair.json";
    const snapshot = { entries: new Map([[path, "c".repeat(40)]]), async blob(value: string) { return value === path ? Buffer.from(JSON.stringify(record)) : null; } };
    await expect(loadAssociationRepair(snapshot, "example-change")).resolves.toEqual({
      path, archive: "openspec/changes/archive/2026-09-24-example-change/", record,
    });
  });

  it("rejects unknown fields, invalid identities, and ambiguous archives", async () => {
    expect(() => parseAssociationRepair(JSON.stringify({ ...record, note: "trust me" }))).toThrow("association-repair-record");
    expect(() => parseAssociationRepair(JSON.stringify({ ...record, sourceHead: "bad" }))).toThrow("association-repair-record");
    const one = "openspec/changes/archive/2026-09-24-example-change/association-repair.json";
    const two = "openspec/changes/archive/2026-09-25-example-change/association-repair.json";
    await expect(loadAssociationRepair({ entries: new Map([[one, "a"], [two, "b"]]), async blob() { return null; } }, "example-change"))
      .rejects.toThrow("association-repair-missing-or-ambiguous");
  });
});
