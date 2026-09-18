import { describe, expect, it } from "vitest";
import { branchName, changeId, renderUpgradeBody, renderUpgradeChange, UPGRADE_STEPS } from "../../scripts/pi/pi-upgrade-report.mjs";

const previous = { version: "0.84.2", commit: "914cf1472e715297caa30db4b9535d534a9eb718" };
const commit = "d981de1229ef899957bbe968bc8dcda02a21f477";

function report(overrides: Record<string, unknown> = {}) {
  return {
    previous,
    version: "0.85.1",
    commit,
    steps: UPGRADE_STEPS.map(name => ({ name, passed: true, detail: "" })),
    merge: { clean: ["src/integrations/pi/components/upstream/theme/theme.ts"], conflicted: [], unchanged: ["src/integrations/pi/components/upstream/model-search.ts"] },
    inventories: { reanchored: ["editor.root"], moved: [], orphaned: [], unmapped: [] },
    changelog: "## [0.85.1] - 2026-09-01\n- Fixed a thing",
    reviewItems: [],
    ...overrides,
  };
}

describe("Pi upgrade proposal", () => {
  it("names the branch and change after the version", () => {
    expect(branchName("0.85.1")).toBe("chore/pi-0.85.1");
    expect(changeId("0.85.1-rc.2")).toBe("pi-upgrade-0-85-1-rc-2");
  });

  it("renders a body in the OpenSpec layout that ends with the automation details block", () => {
    const body = renderUpgradeBody(report());
    expect(body.startsWith("## Proposal\n\nUpgrade the pinned Pi packages from 0.84.2 (914cf14) to 0.85.1 (d981de1)")).toBe(true);
    expect(body).toContain("Every automated gate passed");
    expect(body).toContain("## Implementation\n\n- Version delta:");
    expect(body).toContain("  > ## [0.85.1] - 2026-09-01\n  > - Fixed a thing");
    expect(body).toContain("- Vendored copies: 1 merged cleanly (src/integrations/pi/components/upstream/theme/theme.ts); 0 with conflict markers to resolve; 1 unchanged upstream.");
    expect(body).toContain("- Inventories: 1 anchors rewritten, 0 behavior ranges moved, 0 entries orphaned, 0 components unmapped.");
    expect(body).toContain("  - pass bump");
    expect(body).not.toContain("## Acceptance");
    expect(body.trimEnd().endsWith("</details>")).toBe(true);
    expect(body).toContain('"change": "pi-upgrade-0-85-1"');
  });

  it("names failed gates and review items so the proposal cannot read as clean", () => {
    const body = renderUpgradeBody(report({
      steps: [{ name: "bump", passed: true, detail: "" }, { name: "typecheck", passed: false, detail: "error TS2339" }],
      merge: { clean: [], conflicted: ["src/integrations/pi/components/upstream/theme/theme.ts"], unchanged: [] },
      inventories: { reanchored: [], moved: ["startup.tree: [565, 915] -> [570, 920]"], orphaned: ["auth.login"], unmapped: ["wizard.js"] },
      reviewItems: ["src/integrations/pi/components/upstream/theme/theme.ts: 2 conflict hunks between A1's deviations and the upstream change"],
      changelog: null,
      commit: null,
    }));
    expect(body).toContain("1 automated gate failed (typecheck); this upgrade needs design work");
    expect(body).toContain("  - FAIL typecheck: error TS2339");
    expect(body).toContain("1 with conflict markers to resolve (src/integrations/pi/components/upstream/theme/theme.ts)");
    expect(body).toContain("1 entries orphaned (auth.login), 1 components unmapped (wizard.js)");
    expect(body).toContain("- Review items:\n  - src/integrations/pi/components/upstream/theme/theme.ts: 2 conflict hunks");
    expect(body).toContain("commit unresolved");
    expect(body).not.toContain("changelog excerpt");
  });

  it("scaffolds the OpenSpec change with the pin moved in the requirement that names it and its scenarios repeated", () => {
    const foundationSpec = [
      "### Requirement: Other",
      "Text.",
      "",
      "### Requirement: The owned shell presents the complete pinned Pi interactive UI",
      "The A1-owned UI SHALL reproduce pinned Pi `0.84.2` at commit `914cf1472e715297caa30db4b9535d534a9eb718`.",
      "",
      "#### Scenario: Start an owned Pi session",
      "- **WHEN** the user starts the owned UI",
      "- **THEN** it SHALL match pinned Pi",
      "",
      "### Requirement: After",
      "More.",
    ].join("\n");
    const files = renderUpgradeChange({ previous, version: "0.85.1", commit, foundationSpec, date: "2026-09-19" });
    expect(Object.keys(files).sort()).toEqual([
      "openspec/changes/pi-upgrade-0-85-1/.openspec.yaml",
      "openspec/changes/pi-upgrade-0-85-1/design.md",
      "openspec/changes/pi-upgrade-0-85-1/proposal.md",
      "openspec/changes/pi-upgrade-0-85-1/specs/owned-pi-ui-foundation/spec.md",
      "openspec/changes/pi-upgrade-0-85-1/tasks.md",
    ]);
    expect(files["openspec/changes/pi-upgrade-0-85-1/specs/owned-pi-ui-foundation/spec.md"]).toBe([
      "## MODIFIED Requirements",
      "",
      "### Requirement: The owned shell presents the complete pinned Pi interactive UI",
      `The A1-owned UI SHALL reproduce pinned Pi \`0.85.1\` at commit \`${commit}\`.`,
      "",
      "#### Scenario: Start an owned Pi session",
      "- **WHEN** the user starts the owned UI",
      "- **THEN** it SHALL match pinned Pi",
      "",
    ].join("\n"));
    expect(files["openspec/changes/pi-upgrade-0-85-1/.openspec.yaml"]).toBe("schema: spec-driven\ncreated: 2026-09-19\n");
    expect(files["openspec/changes/pi-upgrade-0-85-1/tasks.md"]).toContain("- [ ] 1.3 Resolve every conflict marker");
    expect(() => renderUpgradeChange({ previous, version: "0.85.1", commit, foundationSpec: "nothing", date: "2026-09-19" })).toThrow("requirement naming the pin is missing");
  });
});
