import { describe, expect, it } from "vitest";
import {
  ARCHIVE_TASKS, archivePaths, assertArchiveDiff, assertMergedImplementation, assertRepositoryPath,
  completePreparationTask, inspectTasks, metadataBlock, parseAcceptance, parseImplementation, selectAcceptance,
} from "../../scripts/governance/openspec-archive-policy.mjs";

const headSha = "a".repeat(40);
const implementation = { version: 1 as const, change: "example-change", specificationPr: 10 };
const acceptance = {
  version: 1, change: implementation.change, headSha, specBaseSha: "b".repeat(40), verdict: "accepted",
  implementationComplete: true, manualReview: "passed", specSyncReviewed: true, evidence: "Reviewed exact candidate and fixture results.",
};
const block = (name: string, value: unknown) => `\`\`\`${name}\n${JSON.stringify(value)}\n\`\`\``;
const acceptedComment = (value = acceptance) => ({
  id: 99, body: block("openspec-acceptance", value), permission: "write", user: { login: "reviewer", type: "User" },
  created_at: "2026-09-13T10:00:00Z", updated_at: "2026-09-13T10:00:00Z",
});
const pull = () => ({
  number: 20, merged: true, state: "closed", draft: false, changed_files: 1,
  base: { ref: "develop", repo: { full_name: "owner/repo" } },
  head: { sha: headSha, repo: { full_name: "owner/repo" } },
  merge_commit_sha: "c".repeat(40), merged_at: "2026-09-13T11:00:00Z",
});

describe("archive evidence metadata", () => {
  it("requires explicit typed blocks rather than titles or ordinary prose", () => {
    expect(parseImplementation("Implements example-change, accepted in #10")).toBeNull();
    expect(parseImplementation(block("openspec-implementation", implementation))).toEqual(implementation);
    expect(parseAcceptance(block("openspec-acceptance", acceptance))).toEqual(acceptance);
    expect(parseImplementation(`\`\`\`markdown\n${block("openspec-implementation", implementation)}\n\`\`\``)).toBeNull();
  });

  it("accepts versioned implementation links while preserving legacy linkage", () => {
    const value = { version: 2, change: "example-change" };
    expect(parseImplementation(block("openspec-implementation", value))).toEqual(value);
    expect(parseImplementation(block("openspec-implementation", { ...value, archivePreparationTasks: { stageArchive: "7.2" } }))).toMatchObject({ version: 2 });
    expect(() => parseImplementation(block("openspec-implementation", { ...value, specificationPr: 10 }))).toThrow("metadata-fields");
    expect(() => parseImplementation(block("openspec-implementation", { ...value, version: 1 }))).toThrow("specification-pr");
    const draft = { version: 3, change: "example-change" };
    expect(parseImplementation(block("openspec-implementation", draft))).toEqual(draft);
    const finalized = { ...draft, archive: "openspec/changes/archive/2026-09-15-example-change/",
      acceptanceManifest: "openspec/changes/archive/2026-09-15-example-change/acceptance.md" };
    expect(parseImplementation(block("openspec-implementation", finalized))).toEqual(finalized);
    expect(() => parseImplementation(block("openspec-implementation", { ...draft, archive: finalized.archive }))).toThrow("delivery-paths");
    expect(() => parseImplementation(block("openspec-implementation", { ...finalized, specificationPr: 10 }))).toThrow("metadata-fields");
    expect(() => parseImplementation(block("openspec-implementation", { ...finalized, archivePreparationTasks: {} }))).toThrow("metadata-fields");
  });

  it("rejects duplicate JSON keys, including escaped aliases", () => {
    expect(() => parseImplementation('```openspec-implementation\n{"version":1,"version":2,"change":"example","specificationPr":1}\n```')).toThrow("metadata-duplicate-key");
    expect(() => parseImplementation('```openspec-implementation\n{"version":1,"\\u0076ersion":1,"change":"example","specificationPr":1}\n```')).toThrow("metadata-duplicate-key");
  });

  it("rejects malformed, unclosed, duplicate and oversized metadata", () => {
    expect(() => parseImplementation("```openspec-implementation\n{\n```" )).toThrow("metadata-json");
    expect(() => parseImplementation("```openspec-implementation\n{}" )).toThrow("metadata-unclosed");
    const text = block("openspec-implementation", implementation);
    expect(() => parseImplementation(`${text}\n${text}`)).toThrow("metadata-duplicate");
    expect(() => parseImplementation("x".repeat(256 * 1024 + 1))).toThrow("metadata-size");
    expect(() => metadataBlock(text, "arbitrary.*")).toThrow("metadata-label");
  });

  it.each([
    { ...implementation, version: 2 }, { ...implementation, change: "../unsafe" },
    { ...implementation, change: "valid/other" }, { ...implementation, change: "" },
    { ...implementation, specificationPr: -1 }, { ...implementation, extra: true },
    { ...implementation, archivePreparationTasks: { unknown: "1.1" } },
    { ...implementation, archivePreparationTasks: { recordEvidence: "1.1", stageArchive: "1.1" } },
  ])("rejects invalid implementation identity %#", value => {
    expect(() => parseImplementation(block("openspec-implementation", value))).toThrow();
  });

  it.each([
    { ...acceptance, headSha: "main" }, { ...acceptance, specBaseSha: "1234" },
    { ...acceptance, verdict: "accepted-with-gaps" }, { ...acceptance, evidence: " " },
    { ...acceptance, manualReview: true }, { ...acceptance, specSyncReviewed: "yes" },
    { ...acceptance, version: 2 }, { ...acceptance, extra: "override" },
  ])("rejects invalid acceptance %#", value => {
    expect(() => parseAcceptance(block("openspec-acceptance", value))).toThrow();
  });

  it("binds authorized unedited acceptance to the exact final head", () => {
    expect(selectAcceptance([acceptedComment()], implementation, headSha)).toMatchObject({ id: 99, author: "reviewer", value: acceptance });
    expect(() => selectAcceptance([], implementation, headSha)).toThrow("acceptance-missing");
    expect(() => selectAcceptance([acceptedComment()], implementation, "d".repeat(40))).toThrow("acceptance-stale-head");
    expect(() => selectAcceptance([acceptedComment(), { ...acceptedComment(), id: 100 }], implementation, headSha)).toThrow("acceptance-conflict");
  });

  it("accepts a renewed head while retaining earlier-head evidence", () => {
    const old = { ...acceptedComment({ ...acceptance, headSha: "e".repeat(40) }), id: 98,
      created_at: "2026-09-12T10:00:00Z", updated_at: "2026-09-12T10:00:00Z" };
    expect(selectAcceptance([old, acceptedComment()], implementation, headSha).id).toBe(99);
  });

  it.each([
    { permission: "read" }, { user: { login: "automation", type: "Bot" } },
    { updated_at: "2026-09-13T10:01:00Z" }, { id: 0 },
  ])("rejects unverifiable acceptance provenance %#", override => {
    expect(() => selectAcceptance([{ ...acceptedComment(), ...override }], implementation, headSha)).toThrow();
  });

  it.each([
    { verdict: "revoked" }, { verdict: "rejected" }, { implementationComplete: false },
    { manualReview: "pending" }, { specSyncReviewed: false },
  ])("does not manufacture acceptance from a partial or negative record %#", override => {
    expect(() => selectAcceptance([acceptedComment({ ...acceptance, ...override })], implementation, headSha)).toThrow("acceptance-incomplete");
  });
});

describe("implementation merge classification", () => {
  const files = [{ filename: "scripts/example.mjs", status: "modified" }];
  it("accepts a confirmed same-repository operational merge", () => {
    expect(() => assertMergedImplementation(pull(), "owner/repo", files)).not.toThrow();
  });
  it.each([
    { merged: false }, { state: "open" }, { draft: true }, { changed_files: 2 },
    { merge_commit_sha: "bad" }, { merged_at: "bad" },
    { base: { ref: "master", repo: { full_name: "owner/repo" } } },
    { head: { sha: headSha, repo: { full_name: "fork/repo" } } },
  ])("refuses unsafe or incomplete merge metadata %#", override => {
    expect(() => assertMergedImplementation({ ...pull(), ...override }, "owner/repo", files)).toThrow();
  });
  it("rejects planning and archive PRs even if their metadata claims implementation", () => {
    for (const filename of ["openspec/changes/example/tasks.md", "openspec/changes/archive/example/tasks.md", "docs/example.md"]) {
      expect(() => assertMergedImplementation(pull(), "owner/repo", [{ filename, status: "modified" }])).toThrow("planning-or-archive-pr");
    }
  });
  it("checks rename provenance before classification", () => {
    expect(() => assertMergedImplementation(pull(), "owner/repo", [{ filename: "docs/example.md", status: "renamed" }])).toThrow();
    expect(() => assertMergedImplementation(pull(), "owner/repo", [{ filename: "docs/example.md", previous_filename: "scripts/example.mjs", status: "renamed" }])).not.toThrow();
  });
});

describe("honest task completion", () => {
  const mapping = { recordEvidence: "7.1", stageArchive: "7.2" };
  const text = `## Tasks\n- [x] 1.1 Implement and verify behavior.\n- [ ] 7.1 ${ARCHIVE_TASKS.recordEvidence}\n- [ ] 7.2 ${ARCHIVE_TASKS.stageArchive}\n`;
  it("admits only explicitly designated exact mechanical tasks", () => {
    expect(inspectTasks(text, mapping)).toHaveLength(3);
    expect(() => inspectTasks(text)).toThrow("tasks-incomplete");
    expect(() => inspectTasks(text.replace("- [x] 1.1", "- [ ] 1.1"), mapping)).toThrow("tasks-incomplete");
    expect(() => inspectTasks(text.replace(ARCHIVE_TASKS.recordEvidence, "Record user acceptance and archive."), mapping)).toThrow("task-designation");
  });
  it("refuses fenced task lists and additional conditions hidden under mechanical tasks", () => {
    expect(() => inspectTasks(`\`\`\`markdown\n${text}\`\`\``, mapping)).toThrow("task-in-fence");
    expect(() => inspectTasks(`${text}  Also obtain physical acceptance.\n`, mapping)).toThrow("task-designation-continuation");
  });

  it("completes only the requested performed operation and remains idempotent", () => {
    const first = completePreparationTask(text, mapping, "recordEvidence");
    expect(first).toContain("- [x] 7.1");
    expect(first).toContain("- [ ] 7.2");
    expect(completePreparationTask(first, mapping, "recordEvidence")).toBe(first);
    expect(completePreparationTask(first, mapping, "stageArchive")).not.toContain("- [ ]");
  });
  it.each([
    "- [ ] Missing task ID", "- [x] 1.1 Done\n- [ ] 1.1 Duplicate", "- [x] 1.1 Done\n* [ ] 2.1 Hidden",
  ])("refuses ambiguous task syntax: %s", value => {
    expect(() => inspectTasks(value)).toThrow();
  });
});

describe("archive mutation scope", () => {
  it.each(["../escape", "/absolute", "a/../b", "a\\b", "a%2fb", "a//b", "C:/a", "a/.", "a/file.\n"])("rejects unsafe path %s", value => {
    expect(() => assertRepositoryPath(value)).toThrow("unsafe-path");
  });
  it("preserves nested capabilities and avoids doubled dates", () => {
    expect(archivePaths("example", "2026-09-13", ["nested/capability"])).toEqual({
      active: "openspec/changes/example/", archive: "openspec/changes/archive/2026-09-13-example/",
      specs: ["openspec/specs/nested/capability/spec.md"], branch: "docs/archive-example",
    });
    expect(archivePaths("2026-09-12-example", "2026-09-13", []).archive).toBe("openspec/changes/archive/2026-09-12-example/");
  });
  it("admits only selected artifacts and deltas, including both sides of renames", () => {
    const paths = archivePaths("example", "2026-09-13", ["one"]);
    expect(() => assertArchiveDiff([
      { filename: `${paths.archive}.openspec.yaml`, previous_filename: `${paths.active}.openspec.yaml`, status: "renamed" },
      { filename: paths.specs[0]!, status: "modified" },
    ], paths)).not.toThrow();
    for (const filename of ["src/unsafe.ts", "config/baselines/example.json", "openspec/specs/other/spec.md", "openspec/changes/example-other/tasks.md"]) {
      expect(() => assertArchiveDiff([{ filename, status: "modified" }], paths)).toThrow("archive-diff-scope");
      expect(() => assertArchiveDiff([{ filename: `${paths.archive}tasks.md`, previous_filename: filename, status: "renamed" }], paths)).toThrow("archive-diff-scope");
    }
  });
});
