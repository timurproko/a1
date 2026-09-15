import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { prepareSinglePrDelivery, replaceImplementationMetadata } from "../../scripts/governance/openspec-delivery-finalization.mjs";
import { parseConditionalAcceptance } from "../../scripts/governance/openspec-delivery-policy.mjs";

const roots: string[] = [];
const requirement = (text: string) => `### Requirement: Example behavior\nThe system SHALL ${text}.\n\n#### Scenario: Example\n- **WHEN** an example is evaluated\n- **THEN** it SHALL ${text}\n`;
const spec = (body: string) => `# example Specification\n\n## Purpose\n\nDefine an example capability with enough detail for finalization tests.\n\n## Requirements\n\n${body}`;
const proposal = `## Why\n\nImprove example behavior.\n\n## What Changes\n\n- Improve it.\n\n## Capabilities\n\n### New Capabilities\n\nNone.\n\n### Modified Capabilities\n\n- \`example\`: Improve behavior.\n\n## Impact\n\nFixture only.\n`;
const scenarios = ["Using the example preserves the updated observable behavior."];
const body = (metadata: unknown = { version: 3, change: "example" }) => `> Phase: Acceptance\n\n## Proposal\n\nDeliver the example behavior through one atomic OpenSpec pull request.\n\n## Implementation\n\n- Implement the example behavior and its governance evidence.\n\n## Acceptance\n\n- ${scenarios[0]}\n\n## Automation\n\n<details>\n<summary>Used by CI to link this PR to its OpenSpec change</summary>\n\n\`\`\`openspec-implementation\n${JSON.stringify(metadata)}\n\`\`\`\n\n</details>\n`;

async function fixture({ incomplete = false } = {}) {
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
  };
  await mkdir(join(root, "openspec/changes/archive"), { recursive: true });
  for (const [path, value] of Object.entries(files)) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), value);
  }
  return root;
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

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

  it("refuses incomplete work before changing the source tree", async () => {
    const root = await fixture({ incomplete: true });
    await expect(prepareSinglePrDelivery({ root, change: "example", repository: "owner/repo", sourcePr: 42, body: body(),
      specBaseSha: "a".repeat(40), date: "2026-09-15", toolRoot: resolve("node_modules/@fission-ai/openspec") }))
      .rejects.toThrow("tasks-incomplete");
    expect(await readFile(join(root, "openspec/changes/example/tasks.md"), "utf8")).toContain("[ ]");
  });

  it("replaces only the exact implementation metadata fence", () => {
    const updated = replaceImplementationMetadata(body(), { version: 3, change: "example", archive: "openspec/changes/archive/2026-09-15-example/",
      acceptanceManifest: "openspec/changes/archive/2026-09-15-example/acceptance.md" });
    expect(updated).toContain("## Acceptance");
    expect(updated.match(/openspec-implementation/g)).toHaveLength(1);
  });
});
