import { describe, expect, it } from "vitest";
import { inspectUnassociatedActiveDelivery } from "../../scripts/governance/openspec-association-policy.mjs";

const sha = (digit: string) => digit.repeat(40);
const snapshot = (...paths: string[]) => ({ entries: new Map(paths.map((path, index) => [path, sha(String(index % 10))])), async blob() { return null; } });
const pull = (files: unknown[]) => ({ number: 7, changed_files: files.length, base: { sha: sha("a") }, head: { sha: sha("b") } });
const file = (filename: string, status = "modified", previous_filename?: string) => ({ filename, status, ...(previous_filename ? { previous_filename } : {}) });

function inspect(files: any[], basePaths: string[], headPaths: string[]) {
  return inspectUnassociatedActiveDelivery({ pull: pull(files), files, base: snapshot(...basePaths), head: snapshot(...headPaths) });
}

describe("unassociated active delivery policy", () => {
  it("blocks an introduced or archive-restored active change even when the diff is documentation-only", () => {
    const active = "openspec/changes/example/proposal.md";
    expect(inspect([file(active, "added")], [], [active])).toEqual({
      blocked: true, reason: "missing-implementation-association", changes: ["example"], documentationOnly: true,
    });
    expect(inspect([file(active, "renamed", "openspec/changes/archive/2026-09-24-example/proposal.md")], [], [active]))
      .toMatchObject({ blocked: true, changes: ["example"] });
  });

  it("blocks mixed code and existing active-change edits", () => {
    const active = "openspec/changes/example/design.md";
    expect(inspect([file(active), file("src/app.ts")], [active], [active])).toEqual({
      blocked: true, reason: "missing-implementation-association", changes: ["example"], documentationOnly: false,
    });
  });

  it("permits existing active documentation revisions and ordinary code", () => {
    const active = "openspec/changes/example/design.md";
    expect(inspect([file(active)], [active], [active])).toMatchObject({ blocked: false, reason: "existing-active-documentation" });
    expect(inspect([file("src/app.ts")], [], [])).toEqual({
      blocked: false, reason: "no-active-delivery-path", changes: [], documentationOnly: false,
    });
  });

  it("permits removal of an active change and fails closed on incomplete diff identity", () => {
    const active = "openspec/changes/example/proposal.md";
    expect(inspect([file(active, "removed")], [active], [])).toMatchObject({ blocked: false });
    expect(() => inspectUnassociatedActiveDelivery({ pull: { ...pull([]), changed_files: 2 }, files: [], base: snapshot(), head: snapshot() }))
      .toThrow("association-diff-identity");
  });
});
