import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { prepareSinglePrDelivery, replaceImplementationMetadata } from "../../scripts/governance/openspec-delivery-finalization.mjs";
import { parseConditionalAcceptance } from "../../scripts/governance/openspec-delivery-policy.mjs";
import { inspectVersion3DeliverySnapshot, validateVersion3Candidate } from "../../scripts/governance/openspec-archive-github.mjs";
import { parseImplementation } from "../../scripts/governance/openspec-archive-policy.mjs";
import { replaceImplementationMetadata as bindHead } from "../../scripts/governance/openspec-delivery-finalization.mjs";

const roots: string[] = [];
const requirement = (text: string) => `### Requirement: Example behavior\nThe system SHALL ${text}.\n\n#### Scenario: Example\n- **WHEN** an example is evaluated\n- **THEN** it SHALL ${text}\n`;
const spec = (body: string) => `# example Specification\n\n## Purpose\n\nDefine an example capability with enough detail for finalization tests.\n\n## Requirements\n\n${body}`;
const proposal = `## Why\n\nImprove example behavior.\n\n## What Changes\n\n- Improve it.\n\n## Capabilities\n\n### New Capabilities\n\nNone.\n\n### Modified Capabilities\n\n- \`example\`: Improve behavior.\n\n## Impact\n\nFixture only.\n`;
const scenarios = ["Using the example preserves the updated observable behavior."];
const body = (metadata: unknown = { version: 3, change: "example" }) => `## Proposal\n\nDeliver the example behavior through one atomic OpenSpec pull request.\n\n## Implementation\n\n- [x] Implement the example behavior and preserve its expected observable result.\n- [x] Record focused governance evidence for the completed example behavior.\n\n## Acceptance\n\n- ${scenarios[0]}\n\n## Automation\n\n<details>\n<summary>Used by CI to link this PR to its OpenSpec change</summary>\n\n\`\`\`openspec-implementation\n${JSON.stringify(metadata)}\n\`\`\`\n\n</details>\n`;

async function fixture({ incomplete = false, retire = false, declareRetirement = true } = {}) {
  const root = await mkdtemp(join(tmpdir(), "a1-delivery-finalization-"));
  roots.push(root);
  const files: Record<string, string> = {
    "openspec/config.yaml": "schema: spec-driven\n",
    "openspec/specs/example/spec.md": spec(requirement("preserve existing behavior")),
    "openspec/changes/example/.openspec.yaml": "schema: spec-driven\ncreated: 2026-09-15\n",
    "openspec/changes/example/proposal.md": proposal,
    "openspec/changes/example/design.md": "## Context\n\nFixture design.\n",
    "openspec/changes/example/tasks.md": `## 1. Work\n\n- [${incomplete ? " " : "x"}] 1.1 Implement and verify example behavior.\n`,
    "openspec/changes/example/specs/example/spec.md": `## MODIFIED Requirements\n\n${requirement("preserve updated behavior")}`,
    "openspec/changes/example/implementation-evidence.md": "# Evidence\n\nFocused fixture passed.\n",
    ...(retire ? {
      "openspec/specs/legacy/spec.md": spec(requirement("keep the legacy behavior")),
      "openspec/changes/example/.openspec.yaml": `schema: spec-driven\ncreated: 2026-09-15\n${declareRetirement ? "retire_capabilities: true\n" : ""}`,
      "openspec/changes/example/specs/legacy/spec.md": "## REMOVED Requirements\n\n### Requirement: Example behavior\n**Reason**: The legacy behavior is gone.\n\n**Migration**: None.\n",
    } : {}),
  };
  await mkdir(join(root, "openspec/changes/archive"), { recursive: true });
  for (const [path, value] of Object.entries(files)) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), value);
  }
  return root;
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

/** A GitHub reader serving one tree: the fixture's `openspec` files with their real git blob identities. */
async function treeReader(root: string, candidate?: { pull: unknown; files: unknown[] }) {
  const blobs = new Map<string, Buffer>();
  const tree: { path: string; mode: string; type: string; sha: string }[] = [];
  async function walk(rel: string): Promise<void> {
    for (const entry of await readdir(join(root, rel), { withFileTypes: true })) {
      const path = `${rel}/${entry.name}`;
      if (entry.isDirectory()) await walk(path);
      else {
        const data = await readFile(join(root, path));
        const sha = createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");
        blobs.set(sha, data);
        tree.push({ path, mode: "100644", type: "blob", sha });
      }
    }
  }
  await walk("openspec");
  const prefix = "/repos/owner/repo";
  return {
    repository: "owner/repo", prefix,
    // Invariant: snapshot verification reads only the tree and its blobs; candidate validation also reads the PR.
    pages: async () => { if (candidate === undefined) throw new Error("unused"); return candidate.files; },
    ancestor: async () => {},
    async get(url: string) {
      if (url === `${prefix}/git/trees/${"c".repeat(40)}?recursive=1`) return { truncated: false, tree };
      if (candidate !== undefined && url === `${prefix}/pulls/42`) return candidate.pull;
      if (candidate !== undefined && url === `${prefix}/git/ref/heads/develop`) return { object: { sha: "a".repeat(40) } };
      const data = blobs.get(url.slice(`${prefix}/git/blobs/`.length));
      if (data === undefined) throw new Error(`unexpected request ${url}`);
      return { encoding: "base64", size: data.length, content: data.toString("base64") };
    },
  };
}

describe("in-branch OpenSpec delivery finalization", () => {
  it("prepares and writes one deterministic synchronized archive without remote mutation", async () => {
    const root = await fixture();
    const bodyPath = join(root, "body.md");
    await writeFile(bodyPath, body());
    const options = { root, change: "example", repository: "owner/repo", sourcePr: 42, body: body(), specBaseSha: "a".repeat(40),
      date: "2026-09-15", bodyPath, toolRoot: resolve("node_modules/@fission-ai/openspec") };
    const inspected = await prepareSinglePrDelivery(options);
    expect(inspected.disposition).toBe("would-finalize");
    expect(inspected.changes.some(change => change.filename === "openspec/specs/example/spec.md")).toBe(true);
    expect(await readFile(join(root, "openspec/changes/example/tasks.md"), "utf8")).toContain("[x]");
    const written = await prepareSinglePrDelivery({ ...options, write: true });
    expect(written.disposition).toBe("finalized");
    const finalBody = await readFile(bodyPath, "utf8");
    const archive = "openspec/changes/archive/2026-09-15-example/";
    expect(finalBody).toContain(`"archive": "${archive}"`);
    expect(await readFile(join(root, "openspec/specs/example/spec.md"), "utf8")).toContain("updated behavior");
    expect(parseConditionalAcceptance(await readFile(join(root, archive, "acceptance.md"), "utf8"))).toMatchObject({
      version: 3, sourcePr: 42, acceptanceScenarios: scenarios, knownGaps: [],
    });
    const repeated = await prepareSinglePrDelivery({ ...options, body: finalBody });
    expect(repeated).toMatchObject({ disposition: "already-finalized", changes: [] });
  }, 30_000);

  it("re-finalizes a drifted archive in place and rebuilds specs from an advanced target", async () => {
    const root = await fixture();
    const bodyPath = join(root, "body.md");
    await writeFile(bodyPath, body());
    const baseline = Buffer.from(spec(requirement("preserve existing behavior")));
    const options = { root, change: "example", repository: "owner/repo", sourcePr: 42, body: body(), specBaseSha: "a".repeat(40),
      date: "2026-09-15", bodyPath, toolRoot: resolve("node_modules/@fission-ai/openspec"),
      targetSpecs: new Map([["openspec/specs/example/spec.md", baseline]]) };
    await prepareSinglePrDelivery({ ...options, write: true });
    const finalBody = await readFile(bodyPath, "utf8");
    const archive = "openspec/changes/archive/2026-09-15-example/";
    const tasksPath = join(root, archive, "tasks.md");
    await writeFile(tasksPath, `${await readFile(tasksPath, "utf8")}- [x] 1.2 Repair the example after validation.\n`);
    await expect(prepareSinglePrDelivery({ ...options, body: finalBody, targetSpecs: null })).rejects.toThrow("delivery-content-drift");
    const inspected = await prepareSinglePrDelivery({ ...options, body: finalBody, date: "2026-09-16" });
    expect(inspected.disposition).toBe("would-refinalize");
    expect(inspected.changes.map(change => change.filename)).toEqual([`${archive}acceptance.md`]);
    expect(await readFile(join(root, archive, "acceptance.md"), "utf8")).not.toContain("1.2");
    const repaired = await prepareSinglePrDelivery({ ...options, body: finalBody, date: "2026-09-16", write: true });
    expect(repaired.disposition).toBe("refinalized");
    expect(repaired.paths?.archive).toBe(archive);
    expect(parseConditionalAcceptance(await readFile(join(root, archive, "acceptance.md"), "utf8")).tasksDigest)
      .toBe(createHash("sha256").update(await readFile(tasksPath)).digest("hex"));
    expect(await prepareSinglePrDelivery({ ...options, body: finalBody })).toMatchObject({ disposition: "already-finalized", changes: [] });

    const advanced = new Map([["openspec/specs/example/spec.md",
      Buffer.from(spec(`${requirement("preserve existing behavior")}\n### Requirement: Other behavior\nThe system SHALL keep the other behavior.\n\n#### Scenario: Other\n- **WHEN** the other path runs\n- **THEN** it SHALL keep working\n`))]]);
    const moved = await prepareSinglePrDelivery({ ...options, body: finalBody, specBaseSha: "b".repeat(40), targetSpecs: advanced, write: true });
    expect(moved.disposition).toBe("refinalized");
    expect(moved.changes.map(change => change.filename).sort()).toEqual([`${archive}acceptance.md`, "openspec/specs/example/spec.md"]);
    const synchronized = await readFile(join(root, "openspec/specs/example/spec.md"), "utf8");
    expect(synchronized).toContain("preserve updated behavior");
    expect(synchronized).toContain("Other behavior");
    expect(parseConditionalAcceptance(await readFile(join(root, archive, "acceptance.md"), "utf8")).specBaseSha).toBe("b".repeat(40));
    expect(await prepareSinglePrDelivery({ ...options, body: finalBody, specBaseSha: "b".repeat(40), targetSpecs: advanced }))
      .toMatchObject({ disposition: "already-finalized" });
  }, 60_000);

  it("finalizes a change that retires a capability and verifies it again without that spec", async () => {
    const root = await fixture({ retire: true });
    const bodyPath = join(root, "body.md");
    await writeFile(bodyPath, body());
    const options = { root, change: "example", repository: "owner/repo", sourcePr: 42, body: body(), specBaseSha: "a".repeat(40),
      date: "2026-09-15", bodyPath, toolRoot: resolve("node_modules/@fission-ai/openspec") };
    const written = await prepareSinglePrDelivery({ ...options, write: true });
    expect(written.disposition).toBe("finalized");
    expect(written.changes.some(change => change.filename === "openspec/specs/legacy/spec.md")).toBe(true);
    await expect(readFile(join(root, "openspec/specs/legacy/spec.md"), "utf8")).rejects.toThrow();
    expect(await readFile(join(root, "openspec/specs/example/spec.md"), "utf8")).toContain("updated behavior");
    const repeated = await prepareSinglePrDelivery({ ...options, body: await readFile(bodyPath, "utf8") });
    expect(repeated).toMatchObject({ disposition: "already-finalized", changes: [] });
  }, 30_000);

  it("verifies a merged retiring delivery from the repository tree and still refuses an unretired missing spec", async () => {
    const root = await fixture({ retire: true });
    const bodyPath = join(root, "body.md");
    await writeFile(bodyPath, body());
    await prepareSinglePrDelivery({ root, change: "example", repository: "owner/repo", sourcePr: 42, body: body(), specBaseSha: "a".repeat(40),
      date: "2026-09-15", bodyPath, toolRoot: resolve("node_modules/@fission-ai/openspec"), write: true });
    const finalBody = await readFile(bodyPath, "utf8");
    const pull = { number: 42, base: { sha: "a".repeat(40) }, body: finalBody };
    const implementation = parseImplementation(finalBody);
    const verified = await inspectVersion3DeliverySnapshot(await treeReader(root), pull, implementation, "c".repeat(40));
    expect(verified.specEntries.map(([path]: [string, Buffer]) => path)).toEqual(["openspec/specs/example/spec.md"]);

    await rm(join(root, "openspec/specs/example/spec.md"));
    await expect(inspectVersion3DeliverySnapshot(await treeReader(root), pull, implementation, "c".repeat(40)))
      .rejects.toThrow("delivery-content-missing");
  }, 30_000);

  it("accepts a ready candidate that deletes the specs it retires and refuses any other spec change", async () => {
    const root = await fixture({ retire: true });
    const before = new Set<string>();
    async function list(rel: string): Promise<void> {
      for (const entry of await readdir(join(root, rel), { withFileTypes: true })) {
        if (entry.isDirectory()) await list(`${rel}/${entry.name}`);
        else before.add(`${rel}/${entry.name}`);
      }
    }
    await list("openspec");
    const bodyPath = join(root, "body.md");
    await writeFile(bodyPath, body());
    const written = await prepareSinglePrDelivery({ root, change: "example", repository: "owner/repo", sourcePr: 42, body: body(),
      specBaseSha: "a".repeat(40), date: "2026-09-15", bodyPath, toolRoot: resolve("node_modules/@fission-ai/openspec"), write: true });
    const finalized = parseImplementation(await readFile(bodyPath, "utf8"));
    const candidateBody = bindHead(await readFile(bodyPath, "utf8"), { ...finalized, finalizedHead: "c".repeat(40) });
    const files = written.changes.map((change: { filename: string; status: string }) => ({ filename: change.filename, status: change.status }));
    const pull = { number: 42, state: "open", draft: false, body: candidateBody, changed_files: files.length,
      base: { ref: "develop", sha: "a".repeat(40), repo: { full_name: "owner/repo" } },
      head: { sha: "c".repeat(40), repo: { full_name: "owner/repo" } } };
    expect(files).toContainEqual({ filename: "openspec/specs/legacy/spec.md", status: "removed" });
    await expect(validateVersion3Candidate(await treeReader(root, { pull, files }), 42))
      .resolves.toMatchObject({ disposition: "ready-for-maintainer-integration" });

    const stray = [...files, { filename: "openspec/specs/unrelated/spec.md", status: "removed" }];
    await expect(validateVersion3Candidate(await treeReader(root, { pull: { ...pull, changed_files: stray.length }, files: stray }), 42))
      .rejects.toThrow("delivery-unexpected-openspec-path");
    expect(before.has("openspec/specs/legacy/spec.md")).toBe(true);
  }, 30_000);

  it("still refuses a missing spec the change does not retire", async () => {
    const undeclared = await fixture({ retire: true, declareRetirement: false });
    await expect(prepareSinglePrDelivery({ root: undeclared, change: "example", repository: "owner/repo", sourcePr: 42, body: body(),
      specBaseSha: "a".repeat(40), date: "2026-09-15", toolRoot: resolve("node_modules/@fission-ai/openspec") }))
      .rejects.toThrow("openspec-operation");

    const root = await fixture();
    const bodyPath = join(root, "body.md");
    await writeFile(bodyPath, body());
    const options = { root, change: "example", repository: "owner/repo", sourcePr: 42, body: body(), specBaseSha: "a".repeat(40),
      date: "2026-09-15", bodyPath, toolRoot: resolve("node_modules/@fission-ai/openspec") };
    await prepareSinglePrDelivery({ ...options, write: true });
    await rm(join(root, "openspec/specs/example/spec.md"));
    await expect(prepareSinglePrDelivery({ ...options, body: await readFile(bodyPath, "utf8") })).rejects.toThrow("delivery-spec-missing");
  }, 30_000);

  it("refuses to finalize an active head whose canonical specs already differ from the target", async () => {
    const root = await fixture();
    await expect(prepareSinglePrDelivery({ root, change: "example", repository: "owner/repo", sourcePr: 42, body: body(),
      specBaseSha: "a".repeat(40), date: "2026-09-15", toolRoot: resolve("node_modules/@fission-ai/openspec"),
      targetSpecs: new Map([["openspec/specs/example/spec.md", Buffer.from(spec(requirement("preserve other behavior")))]]) }))
      .rejects.toThrow("delivery-specs-diverged");
  });

  it("refuses incomplete work before changing the source tree", async () => {
    const root = await fixture({ incomplete: true });
    await expect(prepareSinglePrDelivery({ root, change: "example", repository: "owner/repo", sourcePr: 42, body: body(),
      specBaseSha: "a".repeat(40), date: "2026-09-15", toolRoot: resolve("node_modules/@fission-ai/openspec") }))
      .rejects.toThrow("tasks-incomplete");
    expect(await readFile(join(root, "openspec/changes/example/tasks.md"), "utf8")).toContain("[ ]");
  });

  it("refuses an incomplete PR-body Implementation checklist", async () => {
    const root = await fixture();
    const incompleteBody = body().replace("- [x] Implement the example behavior", "- [ ] Implement the example behavior");
    await expect(prepareSinglePrDelivery({ root, change: "example", repository: "owner/repo", sourcePr: 42, body: incompleteBody,
      specBaseSha: "a".repeat(40), date: "2026-09-15", toolRoot: resolve("node_modules/@fission-ai/openspec") }))
      .rejects.toThrow("implementation-progress-incomplete");
  });

  it("rejects the superseded phase-prefixed layout during local finalization", async () => {
    const root = await fixture();
    await expect(prepareSinglePrDelivery({ root, change: "example", repository: "owner/repo", sourcePr: 42,
      body: `> Phase: Implementation\n\n${body()}`, specBaseSha: "a".repeat(40), date: "2026-09-15",
      toolRoot: resolve("node_modules/@fission-ai/openspec") })).rejects.toThrow("acceptance-layout-phase");
  });

  it("replaces only the exact implementation metadata fence", () => {
    const updated = replaceImplementationMetadata(body(), { version: 3, change: "example", archive: "openspec/changes/archive/2026-09-15-example/",
      acceptanceManifest: "openspec/changes/archive/2026-09-15-example/acceptance.md" });
    expect(updated).toContain("## Acceptance");
    expect(updated.match(/openspec-implementation/g)).toHaveLength(1);
  });
});
