import { createHash } from "node:crypto";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadArchiveTool, prepareArchive, snapshotOpenSpec, verifySyncBaseline, verifySyncResult } from "../../scripts/governance/openspec-archive-staging.mjs";
import { ARCHIVE_TASKS, archiveFailure } from "../../scripts/governance/openspec-archive-policy.mjs";
import type { ArchiveReader } from "../../scripts/governance/openspec-archive-github.mjs";

let tool: Awaited<ReturnType<typeof loadArchiveTool>>;
beforeAll(async () => { tool = await loadArchiveTool(resolve("node_modules/@fission-ai/openspec")); });
const requirement = (name: string, text = "Existing behavior") => `### Requirement: ${name}\nThe system SHALL retain ${text}.\n\n#### Scenario: Baseline\n- **WHEN** input arrives\n- **THEN** the system SHALL preserve ${text}\n`;
const spec = (body: string) => `# example Specification\n\n## Purpose\n\nDefine a sufficiently detailed example specification for isolated archival verification.\n\n## Requirements\n\n${body}`;
const delta = (operation: string, body: string) => `## ${operation} Requirements\n\n${body}`;
const old = requirement("Existing");
const updated = requirement("Existing", "updated behavior");

describe("conservative OpenSpec synchronization", () => {
  it("preserves requirements introduced elsewhere in the same file", () => {
    const baseline = spec(old);
    const current = spec(old + "\n" + requirement("Unrelated"));
    const expected = verifySyncBaseline(tool, baseline, current, delta("MODIFIED", updated));
    expect(() => verifySyncResult(tool, spec(updated + "\n" + requirement("Unrelated")), expected)).not.toThrow();
    expect(() => verifySyncResult(tool, spec(updated), expected)).toThrow("sync-result-mismatch");
  });
  it("rejects changed baseline content and implicit scenario removal", () => {
    expect(() => verifySyncBaseline(tool, spec(old), spec(requirement("Existing", "someone else's change")), delta("MODIFIED", updated))).toThrow("sync-baseline-conflict");
    const withExtra = old + "\n#### Scenario: Another\n- **WHEN** another input arrives\n- **THEN** it SHALL remain intact\n";
    expect(() => verifySyncBaseline(tool, spec(withExtra), spec(withExtra), delta("MODIFIED", updated))).toThrow("sync-scenario-loss");
  });
  it("supports explicit additions, removals, and already-applied operations", () => {
    const addition = requirement("New");
    expect(verifySyncBaseline(tool, spec(old), spec(old), delta("ADDED", addition)).size).toBe(2);
    expect(verifySyncBaseline(tool, spec(old), spec(old + "\n" + addition), delta("ADDED", addition)).size).toBe(2);
    expect(verifySyncBaseline(tool, spec(old), spec(updated), delta("MODIFIED", updated)).size).toBe(1);
    const removal = delta("REMOVED", "### Requirement: Existing\n**Reason**: Retired.\n**Migration**: No replacement.\n");
    expect(verifySyncBaseline(tool, spec(old), spec(old), removal).size).toBe(0);
    expect(verifySyncBaseline(tool, spec(old), null, removal).size).toBe(0);
    expect(() => verifySyncBaseline(tool, spec(old), spec(old), delta("ADDED", updated))).toThrow("sync-addition-conflict");
  });
  it("verifies rename identities, including a reviewed modification to the new name", () => {
    const rename = '## RENAMED Requirements\n- FROM: `### Requirement: Existing`\n- TO: `### Requirement: Renamed`\n';
    const renamed = requirement("Renamed");
    expect(() => verifySyncResult(tool, spec(renamed), verifySyncBaseline(tool, spec(old), spec(old), rename))).not.toThrow();
    expect(() => verifySyncResult(tool, spec(renamed), verifySyncBaseline(tool, spec(old), spec(renamed), rename))).not.toThrow();
    const modified = requirement("Renamed", "updated behavior");
    expect(() => verifySyncResult(tool, spec(modified), verifySyncBaseline(tool, spec(old), spec(old), rename + "\n" + delta("MODIFIED", modified)))).not.toThrow();
    expect(() => verifySyncBaseline(tool, spec(old), spec(old + "\n" + renamed), rename)).toThrow();
  });
  it("refuses conflicting purpose edits and missing new-capability purposes", () => {
    const withPurpose = "## Purpose\nReplace the original purpose with a different, unreviewed purpose.\n\n" + delta("MODIFIED", updated);
    expect(() => verifySyncBaseline(tool, spec(old), spec(old), withPurpose)).toThrow("sync-purpose-conflict");
    expect(() => verifySyncBaseline(tool, null, null, delta("ADDED", old))).toThrow("sync-purpose-missing");
  });
  it("rejects skipped headings and empty operations", () => {
    expect(() => verifySyncBaseline(tool, spec(old), spec(old), "## MODIFIED Requirements\n### Wrong Heading\nSome text")).toThrow();
    expect(() => verifySyncBaseline(tool, spec(old), spec(old), "## Unrecognized\nNothing")).toThrow("sync-empty-delta");
  });
});

function fixture() {
  const head = "a".repeat(40), target = "b".repeat(40), base = "c".repeat(40);
  const active = "openspec/changes/example/";
  const tasks = `## Tasks\n- [x] 1.1 Implement and verify.\n- [ ] 7.1 ${ARCHIVE_TASKS.recordEvidence}\n- [ ] 7.2 ${ARCHIVE_TASKS.stageArchive}\n`;
  const files: Record<string, string> = {
    "openspec/config.yaml": "schema: spec-driven\n",
    "openspec/specs/example/spec.md": spec(old),
    [`${active}.openspec.yaml`]: "schema: spec-driven\ncreated: 2026-09-13\n",
    [`${active}proposal.md`]: "## Why\nImprove example behavior.\n\n## What Changes\n- Update the existing requirement.\n\n## Capabilities\n### Modified Capabilities\n- `example`: Update behavior.\n\n## Impact\nIsolated fixture.\n",
    [`${active}design.md`]: "## Context\nThis fixture verifies isolated archival.\n",
    [`${active}tasks.md`]: tasks,
    [`${active}specs/example/spec.md`]: delta("MODIFIED", updated),
  };
  const trees = new Map<string, Record<string, string>>([[head, { ...files }], [target, { ...files }], [base, { "openspec/specs/example/spec.md": spec(old) }]]);
  const blobs = new Map<string, Buffer>();
  const reader: ArchiveReader = {
    repository: "owner/repo", prefix: "/repos/owner/repo",
    async get(path) {
      const treeSha = /\/git\/trees\/([a-f0-9]+)\?/.exec(path)?.[1];
      if (treeSha) return { truncated: false, tree: Object.entries(trees.get(treeSha)!).map(([name, text]) => {
        const bytes = Buffer.from(text);
        const sha = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
        blobs.set(sha, bytes);
        return { path: name, sha, type: "blob", mode: "100644" };
      }) };
      const bytes = blobs.get(path.split("/").at(-1)!);
      if (!bytes) throw new Error("Unexpected request");
      return { encoding: "base64", size: bytes.length, content: bytes.toString("base64") };
    },
    async pages() { throw new Error("Unused"); }, async ancestor() {},
  };
  const evidence = {
    pull: { number: 20, head: { sha: head }, merge_commit_sha: "d".repeat(40) },
    implementation: { change: "example", archivePreparationTasks: { recordEvidence: "7.1", stageArchive: "7.2" } },
    acceptance: { id: 99, author: "reviewer", createdAt: "2026-09-13T10:00:00Z", value: { specBaseSha: base } },
    validation: { runId: 42 }, targetSha: target,
  };
  return { reader, evidence, trees, files, active, target, head };
}

describe("isolated archive preparation with the actual pinned CLI", () => {
  it("syncs, records evidence, moves every artifact and checks only performed mechanical tasks", async () => {
    const value = fixture();
    const before = JSON.stringify([...value.trees]);
    const result = await prepareArchive({ ...value, tool, date: "2026-09-13" });
    const files = new Map<string, Buffer | null>(result.changes.map((file: { filename: string; data: Buffer | null }) => [file.filename, file.data]));
    expect(files.get("openspec/specs/example/spec.md")?.toString()).toContain("updated behavior");
    expect(files.get(`${result.paths.archive}tasks.md`)?.toString()).not.toContain("- [ ]");
    expect(files.get(`${result.paths.archive}acceptance.md`)?.toString()).toContain("issuecomment-99");
    expect(files.get(`${value.active}.openspec.yaml`)).toBeNull();
    expect(files.get(`${result.paths.archive}.openspec.yaml`)?.toString()).toBe(value.files[`${value.active}.openspec.yaml`]);
    expect(JSON.stringify([...value.trees])).toBe(before);
  }, 30_000);

  it("supports already-synced deltas without changing canonical specs", async () => {
    const value = fixture();
    value.trees.get(value.target)!["openspec/specs/example/spec.md"] = spec(updated);
    const result = await prepareArchive({ ...value, tool, date: "2026-09-13" });
    expect(result.changes.some((file: { filename: string }) => file.filename.startsWith("openspec/specs/"))).toBe(false);
  }, 30_000);

  it("identifies the conflicting capability without publishing a partial multi-capability result", async () => {
    const value = fixture();
    for (const sha of [value.head, value.target]) {
      value.trees.get(sha)![`${value.active}specs/other/spec.md`] = delta("MODIFIED", updated);
      value.trees.get(sha)!["openspec/specs/other/spec.md"] = spec(old);
    }
    value.trees.get(value.evidence.acceptance.value.specBaseSha)!["openspec/specs/other/spec.md"] = spec(old);
    value.trees.get(value.target)!["openspec/specs/other/spec.md"] = spec(requirement("Existing", "intervening behavior"));
    const before = JSON.stringify([...value.trees]);
    await expect(prepareArchive({ ...value, tool, date: "2026-09-13" })).rejects.toMatchObject({ archiveCode: "sync-baseline-conflict", archiveDetail: "other" });
    expect(JSON.stringify([...value.trees])).toBe(before);
  }, 30_000);

  it("cleans isolated partial work if the archive operation fails", async () => {
    const value = fixture(); let directory = "";
    const before = JSON.stringify([...value.trees]);
    const failing = { ...tool, async command(cwd: string, args: string[]) {
      directory = cwd;
      if (args[0] === "archive") throw archiveFailure("openspec-operation", "archive");
      return tool.command(cwd, args);
    } };
    await expect(prepareArchive({ ...value, tool: failing, date: "2026-09-13" })).rejects.toThrow("openspec-operation");
    await expect(access(directory)).rejects.toThrow();
    expect(JSON.stringify([...value.trees])).toBe(before);
  }, 30_000);

  it("refuses unsupported policy rules and escaped CLI artifact roots", async () => {
    const value = fixture();
    const constrained = { ...tool, async command(cwd: string, args: string[]) {
      const result = await tool.command(cwd, args);
      return args[0] === "instructions" ? { ...result, rules: ["Unfulfilled rule"] } : result;
    } };
    await expect(prepareArchive({ ...value, tool: constrained, date: "2026-09-13" })).rejects.toThrow();
    const escaped = { ...tool, async command(cwd: string, args: string[]) {
      const result = await tool.command(cwd, args);
      return args[0] === "status" ? { ...result, changeRoot: resolve(cwd, "../outside") } : result;
    } };
    await expect(prepareArchive({ ...value, tool: escaped, date: "2026-09-13" })).rejects.toThrow();
    const expired = await loadArchiveTool(resolve("node_modules/@fission-ai/openspec"), { deadline: 0 });
    await expect(expired.command(process.cwd(), ["status", "--json"])).rejects.toThrow("archive-deadline");
  }, 30_000);

  it("rejects source drift, historical acceptance files, and unsafe trees without publication", async () => {
    const value = fixture();
    value.trees.get(value.target)![`${value.active}tasks.md`] += "\nChanged after review";
    await expect(prepareArchive({ ...value, tool, date: "2026-09-13" })).rejects.toThrow("active-change-drift");
    const reader = { ...value.reader, async get() { return { tree: [{ path: "openspec/config.yaml", type: "blob", mode: "120000" }] }; } };
    await expect(snapshotOpenSpec(reader, value.target)).rejects.toThrow("unsafe-openspec-tree");
  });
});
