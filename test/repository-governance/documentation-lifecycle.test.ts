import { describe, expect, it } from "vitest";
import { inspectDocumentationLifecycle } from "../../scripts/governance/documentation-lifecycle.mjs";

const base = "a".repeat(40), head = "b".repeat(40);
const block = (value: unknown) => `\`\`\`openspec-implementation\n${JSON.stringify(value)}\n\`\`\``;
const active = "openspec/changes/example/";
const archived = "openspec/changes/archive/2026-09-14-example/";
function fixture(basePaths: string[] = [], headPaths: string[] = []) {
  const requests: string[] = [];
  const reader = { prefix: "/repos/owner/repo", async get(path: string) {
    requests.push(path);
    const paths = path.includes(base) ? basePaths : headPaths;
    return { truncated: false, tree: paths.map(path => ({ path, mode: "100644", type: "blob", sha: "c".repeat(40) })) };
  } };
  const pull = { body: "", draft: false, changed_files: 1, base: { sha: base }, head: { sha: head } };
  return { pull, reader, requests };
}

describe("implementation-bound documentation hold", () => {
  it.each([1, 2])("holds version %s links regardless of documentation-only diff", async version => {
    const f = fixture();
    f.pull.body = block({ version, change: "example", ...(version === 1 ? { specificationPr: 10 } : {}) });
    expect(await inspectDocumentationLifecycle(f.pull, [{ filename: "README.md", status: "modified" }], f.reader)).toMatchObject({ held: true, reason: "implementation-associated" });
    expect(f.requests).toHaveLength(0);
  });
  it.each([
    "```openspec-implementation\n{\n```", "```openspec-implementation\n{}",
    block({ version: 9, change: "example" }), block({ version: 2, change: "../escape" }),
    `${block({ version: 2, change: "example" })}\n${block({ version: 2, change: "other" })}`,
  ])("fails closed on malformed lifecycle metadata %#", async body => {
    const f = fixture();
    expect(await inspectDocumentationLifecycle({ ...f.pull, body }, [{ filename: "README.md", status: "modified" }], f.reader)).toMatchObject({ held: true, reason: "invalid-lifecycle-metadata" });
  });
  it.each(["added", "modified"])("detects an introduced active change from trees, not %s status", async status => {
    const f = fixture([], [`${active}proposal.md`]);
    expect(await inspectDocumentationLifecycle(f.pull, [{ filename: `${active}proposal.md`, status }], f.reader)).toMatchObject({ held: true, reason: "introduced-active-change", change: "example" });
    expect(f.requests).toEqual([`/repos/owner/repo/git/trees/${base}?recursive=1`, `/repos/owner/repo/git/trees/${head}?recursive=1`]);
  });
  it("holds a ready new plan after its marker has been removed", async () => {
    const f = fixture([], [`${active}.openspec.yaml`, `${active}proposal.md`]);
    expect(await inspectDocumentationLifecycle(f.pull, [{ filename: `${active}proposal.md`, status: "added" }], f.reader)).toMatchObject({ held: true });
  });
  it("allows standalone revisions to an existing active change", async () => {
    const f = fixture([`${active}.openspec.yaml`], [`${active}.openspec.yaml`, `${active}design.md`]);
    expect(await inspectDocumentationLifecycle(f.pull, [{ filename: `${active}design.md`, status: "added" }], f.reader)).toMatchObject({ held: false });
  });
  it("checks both rename paths without holding an ordinary archive move", async () => {
    const f = fixture([`${active}proposal.md`], [`${archived}proposal.md`]);
    expect(await inspectDocumentationLifecycle(f.pull, [{ filename: `${archived}proposal.md`, previous_filename: `${active}proposal.md`, status: "renamed" }], f.reader)).toMatchObject({ held: false });
    const reopened = fixture([`${archived}proposal.md`], [`${active}proposal.md`]);
    expect(await inspectDocumentationLifecycle(reopened.pull, [{ filename: `${active}proposal.md`, previous_filename: `${archived}proposal.md`, status: "renamed" }], reopened.reader)).toMatchObject({ held: true, reason: "introduced-active-change" });
    expect(await inspectDocumentationLifecycle(f.pull, [{ filename: `${archived}proposal.md`, previous_filename: "src/code.ts", status: "renamed" }], f.reader)).toMatchObject({ held: true });
  });
  it.each(["README.md", "docs/guide.md", `${archived}proposal.md`])("keeps unassociated %s on the documentation path", async filename => {
    const f = fixture();
    expect(await inspectDocumentationLifecycle(f.pull, [{ filename, status: "modified" }], f.reader)).toMatchObject({ held: false });
    expect(f.requests).toHaveLength(0);
  });
  it("holds drafts and incomplete or missing classification inputs", async () => {
    const f = fixture(); const files = [{ filename: `${active}proposal.md`, status: "modified" }];
    for (const override of [{ draft: true }, { changed_files: 2 }, { body: undefined }, { base: {} }]) {
      expect(await inspectDocumentationLifecycle({ ...f.pull, ...override }, files, f.reader)).toMatchObject({ held: true });
    }
  });
  it("refuses unavailable, truncated, or unsafe trees", async () => {
    const f = fixture(); const files = [{ filename: `${active}proposal.md`, status: "added" }];
    for (const reader of [
      { ...f.reader, async get() { throw new Error("Unavailable"); } },
      { ...f.reader, async get() { return { truncated: true, tree: [] }; } },
      { ...f.reader, async get() { return { truncated: false, tree: [{ path: `${active}proposal.md`, type: "blob", mode: "100644" }] }; } },
      { ...f.reader, async get() { return { truncated: false, tree: [{ path: `${active}proposal.md`, type: "blob", mode: "120000" }] }; } },
    ]) await expect(inspectDocumentationLifecycle(f.pull, files, reader)).rejects.toThrow();
  });
});
