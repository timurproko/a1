import { describe, expect, it } from "vitest";
import { acceptanceBytes, acceptanceBlockers, artifactDigest, assertManualAcceptanceMerge, digest,
  parseAcceptanceRecord, receiptIdentity, receiptIdentityMatches, reconcileAcceptanceTasks, taskInventory,
  verifyRecordBindings, ACCEPTANCE_SIGNOFF,
  type AcceptanceRecord } from "../../scripts/governance/openspec-acceptance-policy.mjs";

function fixture() {
  const head = "a".repeat(40), merge = "b".repeat(40);
  const tasks = `## Tasks\n- [x] 1.1 Implement and verify fixtures.\n- [ ] 1.2 Run a real live lifecycle.\n  Record exact observed outcomes.\n- [ ] 1.3 ${ACCEPTANCE_SIGNOFF}\n`;
  const snapshot = { entries: new Map([["openspec/changes/example/tasks.md", "c".repeat(40)]]) };
  const source = { implementation: { version: 2, change: "example" }, pull: { number: 400, body: "source body", head: { sha: head }, merge_commit_sha: merge } };
  const record: AcceptanceRecord = { version: 1, repository: "owner/repo", change: "example", sourcePr: 400,
    sourceHead: head, sourceMerge: merge, sourceBodyDigest: digest(source.pull.body), artifactDigest: artifactDigest(snapshot, "example"),
    specBaseSha: head, validation: { runId: 77, headSha: head, checkedSha: head, attempt: 1 }, tasks: taskInventory(tasks),
    review: { decision: "accept-on-manual-merge", evidence: [], gaps: [] } };
  return { record, source, snapshot, tasks };
}

describe("acceptance record policy", () => {
  it("binds exact source and full task descriptions without changing recorded state", () => {
    const f = fixture();
    expect(parseAcceptanceRecord(acceptanceBytes(f.record))).toEqual(f.record);
    expect(() => verifyRecordBindings(f.record, f.source, f.snapshot, f.tasks, "owner/repo")).not.toThrow();
    expect(f.record.tasks[1]!.text).toContain("Record exact observed outcomes.");
    expect(acceptanceBlockers(f.record)).toEqual([]);
    expect(() => verifyRecordBindings(f.record, f.source, f.snapshot, f.tasks, "another/repo")).toThrow("acceptance-source-drift");
    f.source.pull.body += " edited";
    expect(() => verifyRecordBindings(f.record, f.source, f.snapshot, f.tasks, "owner/repo")).toThrow("acceptance-source-drift");
  });
  it("refuses oversized, unknown-field, escaped duplicate, and malformed JSON records", () => {
    const f = fixture();
    for (const value of ["null", "{", acceptanceBytes({ ...f.record, reviewer: "invented" } as AcceptanceRecord),
      acceptanceBytes(f.record).replace('"version": 1', '"version": 1, "versi\\u006fn": 1'), " ".repeat(128 * 1024 + 1)]) {
      expect(() => parseAcceptanceRecord(value)).toThrow();
    }
  });
  it("requires unchanged source task identity and actual completion evidence", () => {
    const f = fixture();
    f.record.tasks[1]!.completion = "evidenced";
    expect(() => parseAcceptanceRecord(acceptanceBytes(f.record))).toThrow("acceptance-task-evidence");
    f.record.tasks[1]!.evidence = [{ url: "https://github.com/owner/repo/actions/runs/77", outcome: "Disposable fixture outcome was observed in this run, not live production acceptance." }];
    f.record.tasks[2]!.completion = "signoff-on-merge";
    expect(parseAcceptanceRecord(acceptanceBytes(f.record))).toEqual(f.record);
    expect(() => verifyRecordBindings(f.record, f.source, f.snapshot, f.tasks, "owner/repo")).not.toThrow();
    const receipt = { kind: "pull-request", record: f.record, checklistComplete: true,
      checklistDigest: "f".repeat(64), checks: ["The reviewed implementation behavior produces its expected observable result."] };
    expect(reconcileAcceptanceTasks(f.tasks, receipt, {})).toContain("- [x] 1.2");
    expect(reconcileAcceptanceTasks(f.tasks, { kind: "comment" }, {})).toBe(f.tasks);
    f.record.tasks[1]!.text = "Different live task";
    expect(() => verifyRecordBindings(f.record, f.source, f.snapshot, f.tasks, "owner/repo")).toThrow("acceptance-task-drift");
  });
  it("does not disguise live, mixed, or pending work as signoff or archive bookkeeping", () => {
    const f = fixture();
    f.record.tasks[1]!.completion = "signoff-on-merge";
    expect(() => parseAcceptanceRecord(acceptanceBytes(f.record))).toThrow("acceptance-signoff-designation");
    f.record.tasks[1]!.completion = "archive-preparation";
    expect(() => verifyRecordBindings(f.record, f.source, f.snapshot, f.tasks, "owner/repo")).toThrow("acceptance-task-drift");
    f.record.tasks[1]!.completion = "recorded";
    expect(() => parseAcceptanceRecord(acceptanceBytes(f.record))).toThrow("acceptance-task-recorded");
  });
  it("keeps missing CI and known gaps distinct from full completion", () => {
    const f = fixture(); f.record.validation = null; f.record.review.gaps = ["Live test has not occurred."];
    expect(acceptanceBlockers(f.record)).toEqual(["implementation-validation", "known-gaps-manual-disposition"]);
    expect(() => reconcileAcceptanceTasks(f.tasks, { kind: "pull-request", record: f.record, checklistComplete: true,
      checklistDigest: "f".repeat(64), checks: ["The reviewed implementation behavior produces its expected observable result."] }, {}))
      .toThrow("acceptance-incomplete");
  });
  it("keeps prior receipt identities readable while binding the final checklist", () => {
    const f = fixture();
    const receipt = { kind: "pull-request", id: 500, headSha: "c".repeat(40), mergeSha: "d".repeat(40),
      bodyDigest: "e".repeat(64), checklistDigest: "f".repeat(64), checks: ["Scrollbar overflow displays its expected visible thumb."],
      author: "reviewer", createdAt: "2026-09-15T07:00:00Z", record: f.record };
    const current = receiptIdentity(receipt);
    const { checklistDigest: _digest, checks: _checks, ...legacy } = current;
    expect(receiptIdentityMatches(current, receipt)).toBe(true);
    expect(receiptIdentityMatches(legacy, receipt)).toBe(true);
    expect(receiptIdentityMatches({ ...legacy, pr: 501 }, receipt)).toBe(false);
  });
  it("rejects duplicate task IDs, forged digests, altered continuation, and unrelated evidence", () => {
    const f = fixture();
    f.record.tasks.push(f.record.tasks[0]!);
    expect(() => parseAcceptanceRecord(acceptanceBytes(f.record))).toThrow("acceptance-task-identity");
    f.record.tasks.pop(); f.record.tasks[1]!.digest = "f".repeat(64);
    expect(() => verifyRecordBindings(f.record, f.source, f.snapshot, f.tasks, "owner/repo")).toThrow("acceptance-task-drift");
    f.record.tasks = taskInventory(f.tasks);
    expect(() => verifyRecordBindings(f.record, f.source, f.snapshot, f.tasks.replace("exact observed", "imagined"), "owner/repo")).toThrow("acceptance-task-drift");
    f.record.review.evidence = [{ url: "https://github.com/other/repo/actions/runs/77", outcome: "A different repository passed." }];
    expect(() => parseAcceptanceRecord(acceptanceBytes(f.record))).toThrow("acceptance-evidence-reference");
  });
});

describe("manual merge authority", () => {
  const merge = "b".repeat(40), time = "2026-09-15T06:00:00Z";
  const pull = () => ({ merged: true, state: "closed", draft: false, merge_commit_sha: merge, merged_at: time,
    auto_merge: null, merged_by: { type: "User", login: "reviewer" } });
  const events = () => [{ event: "merged", actor: { type: "User", login: "reviewer" }, performed_via_github_app: null, commit_id: merge, created_at: time }];
  it("requires positive human authority plus complete matching manual-mode provenance", () => {
    expect(() => assertManualAcceptanceMerge(pull(), "write", events())).not.toThrow();
    for (const permission of ["read", "none", ""]) expect(() => assertManualAcceptanceMerge(pull(), permission, events())).toThrow();
    for (const override of [{ auto_merge: {} }, { auto_merge: undefined }, { draft: true }, { merged: false },
      { merged_by: { type: "Bot", login: "merge-queue[bot]" } }]) {
      expect(() => assertManualAcceptanceMerge({ ...pull(), ...override }, "admin", events())).toThrow();
    }
    for (const override of [{ performed_via_github_app: {} }, { performed_via_github_app: undefined },
      { commit_id: "c".repeat(40) }, { created_at: "2026-09-14T06:00:00Z" }]) {
      expect(() => assertManualAcceptanceMerge(pull(), "admin", [{ ...events()[0], ...override }])).toThrow();
    }
    for (const event of ["auto_merge_enabled", "added_to_merge_queue"]) {
      expect(() => assertManualAcceptanceMerge(pull(), "admin", [...events(), { event }])).toThrow("acceptance-merge-provenance");
    }
    expect(() => assertManualAcceptanceMerge(pull(), "admin", [])).toThrow();
    expect(() => assertManualAcceptanceMerge(pull(), "admin", [...events(), ...events()])).toThrow();
  });
});
