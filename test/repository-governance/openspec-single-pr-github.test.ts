import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { archiveReaderFromGet, loadArchiveEvidence, validateVersion3Candidate } from "../../scripts/governance/openspec-archive-github.mjs";
import { conditionalAcceptanceBytes, deliveryContentDigest } from "../../scripts/governance/openspec-delivery-policy.mjs";
import { reconcileArchives } from "../../scripts/governance/reconcile-openspec-archive.mjs";
import { verifyCleanupEvidence } from "../../scripts/governance/local-cleanup-evidence.mjs";

const repository = "owner/repo";
const base = "a".repeat(40), head = "b".repeat(40), merge = "c".repeat(40);
const archive = "openspec/changes/archive/2026-09-15-example/";
const scenarios = ["Manual integration preserves the implemented example behavior and synchronized specification."];

function fixture(merged: boolean, provenance: "manual" | "automatic" = "manual") {
  const archiveFiles: Record<string, string> = {
    [`${archive}.openspec.yaml`]: "schema: spec-driven\ncreated: 2026-09-15\n",
    [`${archive}proposal.md`]: "proposal\n",
    [`${archive}design.md`]: "design\n",
    [`${archive}tasks.md`]: "## 1. Work\n\n- [x] 1.1 Implement and verify.\n",
    [`${archive}specs/example/spec.md`]: "## MODIFIED Requirements\n\n### Requirement: Example\nThe system SHALL work.\n\n#### Scenario: Works\n- **WHEN** used\n- **THEN** it SHALL work\n",
    [`${archive}implementation-evidence.md`]: "# Evidence\n\nPassed.\n",
  };
  const specFiles: Record<string, string> = {
    "openspec/config.yaml": "schema: spec-driven\n",
    "openspec/specs/example/spec.md": "# example Specification\n\n## Purpose\n\nDefine example behavior for a complete delivery fixture.\n\n## Requirements\n\n### Requirement: Example\nThe system SHALL work.\n\n#### Scenario: Works\n- **WHEN** used\n- **THEN** it SHALL work\n",
  };
  const archiveEntries = Object.entries(archiveFiles);
  const evidenceEntries = archiveEntries.filter(([path]) => /(?:evidence\/|implementation-evidence\.md$)/.test(path));
  const manifest = { version: 3 as const, repository, change: "example", sourcePr: 42, archive,
    acceptanceManifest: `${archive}acceptance.md`, finalizedDate: "2026-09-15", specBaseSha: base,
    acceptanceScenarios: scenarios, archiveDigest: deliveryContentDigest(archiveEntries),
    specDigest: deliveryContentDigest([["openspec/specs/example/spec.md", specFiles["openspec/specs/example/spec.md"]!]]),
    tasksDigest: createHash("sha256").update(archiveFiles[`${archive}tasks.md`]!).digest("hex"),
    evidenceDigest: deliveryContentDigest(evidenceEntries), knownGaps: [] };
  const metadata = { version: 3, change: "example", archive, acceptanceManifest: `${archive}acceptance.md` };
  const body = `> Phase: Acceptance\n\n## Proposal\n\nDeliver the example behavior through one atomic OpenSpec pull request.\n\n## Implementation\n\n- Implement the example behavior and its governance evidence.\n\n## Acceptance\n\n- ${scenarios[0]}\n\n## Automation\n\n<details>\n<summary>Used by CI to link this PR to its OpenSpec change</summary>\n\n\`\`\`openspec-implementation\n${JSON.stringify(metadata)}\n\`\`\`\n\n</details>\n`;
  const allFiles: Record<string, string> = { ...specFiles, ...archiveFiles, [`${archive}acceptance.md`]: conditionalAcceptanceBytes(manifest) };
  const blobs = new Map<string, Buffer>();
  const tree = () => ({ truncated: false, tree: Object.entries(allFiles).map(([path, text]) => {
    const bytes = Buffer.from(text); const sha = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    blobs.set(sha, bytes); return { path, sha, type: "blob", mode: "100644" };
  }) });
  const changed = [...Object.keys(archiveFiles), `${archive}acceptance.md`, "openspec/specs/example/spec.md", "scripts/example.mjs"]
    .map(filename => ({ filename, status: "added" }));
  const pull = { number: 42, state: merged ? "closed" : "open", merged, draft: false, changed_files: changed.length,
    body, title: "feature(example): deliver atomically", auto_merge: provenance === "automatic" ? {} : null,
    base: { ref: "develop", sha: base, repo: { full_name: repository } },
    head: { ref: "feature/example", sha: head, repo: { full_name: repository } },
    merge_commit_sha: merge, merged_at: merged ? "2026-09-15T12:00:00Z" : null,
    merged_by: merged ? { login: "reviewer", type: "User" } : null };
  const target = merged ? merge : base;
  const get = async (path: string): Promise<any> => {
    if (path === `/repos/${repository}/pulls/42`) return pull;
    if (path.startsWith(`/repos/${repository}/pulls/42/files?`)) return changed;
    if (path === `/repos/${repository}/git/ref/heads/develop`) return { object: { sha: target } };
    if ([head, merge].some(sha => path === `/repos/${repository}/git/trees/${sha}?recursive=1`)) return tree();
    const blob = blobs.get(path.split("/").at(-1)!);
    if (blob) return { encoding: "base64", size: blob.length, content: blob.toString("base64") };
    if (path.startsWith(`/repos/${repository}/compare/`)) {
      const [left, right] = path.slice(path.lastIndexOf("/") + 1).split("...");
      return { status: left === right ? "identical" : "ahead", merge_base_commit: { sha: left } };
    }
    if (path === `/repos/${repository}/collaborators/reviewer/permission`) return { permission: "write" };
    if (path.startsWith(`/repos/${repository}/issues/42/timeline?`)) return [{ event: "merged", actor: { login: "reviewer", type: "User" },
      performed_via_github_app: null, commit_id: merge, created_at: "2026-09-15T12:00:00Z" },
      ...(provenance === "automatic" ? [{ event: "auto_merge_enabled" }] : [])];
    if (path.startsWith(`/repos/${repository}/actions/workflows/ci.yml/runs?`)) return { total_count: 1, workflow_runs: [{
      id: 99, run_number: 10, run_attempt: 1, head_sha: head, head_branch: "feature/example", event: "pull_request",
      path: ".github/workflows/ci.yml", status: "completed", conclusion: "success", head_repository: { full_name: repository },
      pull_requests: [{ number: 42, head: { sha: head }, base: { sha: base } }],
    }] };
    if (path.startsWith(`/repos/${repository}/actions/runs/99/jobs?`)) return { total_count: 1, jobs: [{
      name: "Development validation required", status: "completed", conclusion: "success", head_sha: head,
    }] };
    if (path.includes(`/git/ref/heads/feature%2Fexample`)) throw Object.assign(new Error("github-not-found"), { archiveCode: "github-not-found" });
    throw new Error(`Unexpected route: ${path}`);
  };
  return { reader: archiveReaderFromGet(repository, get), pull, allFiles, changed };
}

describe("version-3 GitHub delivery authority", () => {
  it("validates an open finalized candidate without claiming acceptance", async () => {
    await expect(validateVersion3Candidate(fixture(false).reader, 42)).resolves.toMatchObject({
      disposition: "ready-for-manual-merge", implementation: { version: 3 }, scenarios,
    });
  });

  it("blocks manual-merge readiness until required tests advance the phase to acceptance", async () => {
    const f = fixture(false);
    f.pull.body = f.pull.body.replace("> Phase: Acceptance", "> Phase: Implementation");
    await expect(validateVersion3Candidate(f.reader, 42)).rejects.toThrow("delivery-phase-not-acceptance");
  });

  it("fails closed on stale base, body drift, content drift, and unrelated OpenSpec paths", async () => {
    let f = fixture(false); f.pull.base.sha = "d".repeat(40);
    await expect(validateVersion3Candidate(f.reader, 42)).rejects.toThrow("delivery-target-stale");
    f = fixture(false); f.pull.body = f.pull.body.replace(scenarios[0]!, "A different valid scenario changes what manual merge would accept.");
    await expect(validateVersion3Candidate(f.reader, 42)).rejects.toThrow("delivery-acceptance-drift");
    f = fixture(false); f.allFiles[`${archive}proposal.md`] = "changed after finalization\n";
    await expect(validateVersion3Candidate(f.reader, 42)).rejects.toThrow("delivery-content-drift");
    f = fixture(false); f.changed.push({ filename: "openspec/changes/archive/2026-09-15-other/proposal.md", status: "added" });
    f.pull.changed_files = f.changed.length;
    await expect(validateVersion3Candidate(f.reader, 42)).rejects.toThrow("delivery-unexpected-openspec-path");
  });

  it("derives acceptance and archival from the authorized manual implementation merge", async () => {
    await expect(loadArchiveEvidence(fixture(true).reader, 42)).resolves.toMatchObject({
      disposition: "eligible", implementation: { version: 3 }, acceptance: { kind: "single-pr", author: "reviewer", checks: scenarios },
      validation: { runId: 99, headSha: head },
    });
  });

  it("reports draft, needs-finalization, ready, and closed states without overstating acceptance", async () => {
    let f = fixture(false); f.pull.draft = true;
    await expect(loadArchiveEvidence(f.reader, 42, { allowMissing: true })).resolves.toMatchObject({ disposition: "draft" });
    f = fixture(false); f.pull.body = `\`\`\`openspec-implementation\n{"version":3,"change":"example"}\n\`\`\``;
    await expect(loadArchiveEvidence(f.reader, 42, { allowMissing: true })).resolves.toMatchObject({ disposition: "needs-finalization" });
    f = fixture(false);
    await expect(loadArchiveEvidence(f.reader, 42, { allowMissing: true })).resolves.toMatchObject({ disposition: "ready-for-manual-merge" });
    f = fixture(false); f.pull.state = "closed";
    await expect(loadArchiveEvidence(f.reader, 42, { allowMissing: true })).resolves.toMatchObject({ disposition: "closed" });
  });

  it("reports integrated version 3 without obtaining publication authority", async () => {
    let publications = 0;
    const evidence = { disposition: "eligible", implementation: { version: 3, change: "example", archive },
      acceptance: { kind: "single-pr" }, pull: { merge_commit_sha: merge }, validation: { runId: 99 } };
    const report = await reconcileArchives({ reader: { repository, async pages() { return []; } } as never, tool: null,
      dryRun: false, pr: 42, publisherFactory: async () => { publications += 1; throw new Error("must not publish"); },
      loadEvidence: async () => evidence } as never);
    expect(report.results).toEqual([expect.objectContaining({ pr: 42, deliveryVersion: 3,
      disposition: "accepted-and-archived", phase: "Archived", archive, validationRunId: 99 })]);
    expect(publications).toBe(0);
  });

  it("authorizes cleanup from the single merged PR without follow-up roles", async () => {
    await expect(verifyCleanupEvidence(fixture(true).reader, { sourcePr: 42, candidatePr: 42, change: "example",
      role: "implementation", head, ref: "refs/heads/feature/example" })).resolves.toMatchObject({
        disposition: "eligible", sourcePr: 42, archivePr: null, refs: ["feature/example"],
      });
    await expect(verifyCleanupEvidence(fixture(true).reader, { sourcePr: 42, candidatePr: 42, change: "example",
      role: "archive", head, ref: null })).rejects.toThrow("candidate-head-association");
  });

  it("reports invalid merge provenance without requesting publication", async () => {
    const failure = Object.assign(new Error("acceptance-manual-authority"), {
      archiveCode: "acceptance-manual-authority", archiveChange: "example",
    });
    const report = await reconcileArchives({ reader: { repository, async pages() { return []; } } as never,
      tool: null, dryRun: true, pr: 42, publisherFactory: async () => { throw new Error("unused"); },
      loadEvidence: async () => { throw failure; } } as never);
    expect(report.results).toEqual([expect.objectContaining({ disposition: "invalid-provenance",
      reason: "acceptance-manual-authority", change: "example" })]);
  });

  it("rejects automatic merge provenance", async () => {
    await expect(loadArchiveEvidence(fixture(true, "automatic").reader, 42)).rejects.toThrow("acceptance-manual-authority");
  });
});
