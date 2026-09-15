import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { conditionalAcceptanceBytes, deliveryContentDigest, parseConditionalAcceptance,
  verifyConditionalAcceptance } from "../../scripts/governance/openspec-delivery-policy.mjs";
import { receiptIdentity } from "../../scripts/governance/openspec-acceptance-policy.mjs";

const scenarios = [
  "Finalized code and canonical specifications integrate in the same manual merge.",
  "Stale finalization or required validation prevents the candidate from integrating.",
];
const archive = "openspec/changes/archive/2026-09-15-example-change/";
const archiveEntries: [string, string][] = [[`${archive}proposal.md`, "proposal"], [`${archive}tasks.md`, "tasks"]];
const specEntries: [string, string][] = [["openspec/specs/example/spec.md", "spec"]];
const evidenceEntries: [string, string][] = [[`${archive}implementation-evidence.md`, "evidence"]];
const manifest = () => ({
  version: 3 as const, repository: "owner/repo", change: "example-change", sourcePr: 425,
  archive, acceptanceManifest: `${archive}acceptance.md`, finalizedDate: "2026-09-15",
  specBaseSha: "a".repeat(40), acceptanceScenarios: scenarios,
  archiveDigest: deliveryContentDigest(archiveEntries), specDigest: deliveryContentDigest(specEntries),
  tasksDigest: createHash("sha256").update("tasks").digest("hex"), evidenceDigest: deliveryContentDigest(evidenceEntries),
  knownGaps: [],
});
const implementation = () => ({ version: 3 as const, change: "example-change", archive,
  acceptanceManifest: `${archive}acceptance.md` });

describe("single-PR conditional acceptance", () => {
  it("round-trips a conditional manifest without fabricating merge provenance", () => {
    const text = conditionalAcceptanceBytes(manifest());
    expect(text).toContain("accepted only when");
    expect(text).not.toContain("sourceHead");
    expect(text).not.toContain("sourceMerge");
    expect(parseConditionalAcceptance(text)).toEqual(manifest());
  });

  it("binds implementation, scenarios, archived artifacts, specs, and tasks", () => {
    expect(verifyConditionalAcceptance(manifest(), { implementation: implementation(), repository: "owner/repo", sourcePr: 425,
      archiveEntries, specEntries, evidenceEntries, tasksBytes: "tasks", scenarios })).toMatchObject({ checklistDigest: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(() => verifyConditionalAcceptance(manifest(), { implementation: implementation(), repository: "owner/repo", sourcePr: 425,
      archiveEntries: [...archiveEntries, [`${archive}design.md`, "changed"]], specEntries, evidenceEntries, tasksBytes: "tasks", scenarios }))
      .toThrow("delivery-content-drift");
  });

  it.each([
    { sourceHead: "b".repeat(40) },
    { sourceMerge: "c".repeat(40) },
    { archive: "openspec/changes/archive/2026-09-14-example-change/" },
    { acceptanceManifest: `${archive}other.md` },
    { acceptanceScenarios: ["[ ] A checkbox cannot represent accepted state."] },
  ])("rejects malformed or predictive manifest fields %#", override => {
    expect(() => conditionalAcceptanceBytes({ ...manifest(), ...override } as never)).toThrow();
  });

  it("derives an immutable receipt identity only from post-merge provenance", () => {
    expect(receiptIdentity({ kind: "single-pr", id: 425, headSha: "b".repeat(40), mergeSha: "c".repeat(40),
      bodyDigest: "d".repeat(64), author: "reviewer", createdAt: "2026-09-15T10:00:00Z", manifest: manifest(),
      checklistDigest: "e".repeat(64), checks: scenarios })).toMatchObject({
        kind: "single-pr", pr: 425, path: `${archive}acceptance.md`, author: "reviewer", checks: scenarios,
      });
  });

  it("uses path and byte order independent content identities", () => {
    expect(deliveryContentDigest(archiveEntries)).toBe(deliveryContentDigest([...archiveEntries].reverse()));
    expect(() => deliveryContentDigest([...archiveEntries, archiveEntries[0]!])).toThrow("delivery-digest-input");
  });
});
