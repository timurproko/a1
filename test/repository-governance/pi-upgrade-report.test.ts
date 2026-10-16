import { describe, expect, it } from "vitest";
import {
  branchName,
  branchVersion,
  changeId,
  MARKER_BLOCKED_STEPS,
  REFRESH_STEPS,
  renderUpgradeBody,
  renderUpgradeChange,
  renderUpgradeComment,
  renderUpgradeReport,
  UPGRADE_IMPLEMENTATION_ITEMS,
  UPGRADE_STEPS,
  upgradeAcceptance,
} from "../../scripts/pi/pi-upgrade-report.mjs";
import { assertImplementationOnlyProgress, parseImplementationAcceptanceScenarios, parseImplementationProgress } from "../../scripts/governance/openspec-acceptance-checklist.mjs";
import { parseImplementation } from "../../scripts/governance/openspec-archive-policy.mjs";

const previous = { version: "0.84.2", commit: "914cf1472e715297caa30db4b9535d534a9eb718" };
const commit = "d981de1229ef899957bbe968bc8dcda02a21f477";

function report(overrides: Record<string, unknown> = {}) {
  return {
    mode: "propose",
    previous,
    version: "0.85.1",
    commit,
    steps: UPGRADE_STEPS.map(name => ({ name, status: "passed", detail: "" })),
    merge: { clean: ["src/integrations/pi/components/upstream/theme/theme.ts"], conflicted: [], unchanged: ["src/integrations/pi/components/upstream/model-search.ts"], kept: [] },
    inventories: { reanchored: ["editor.root"], moved: [], orphaned: [], unmapped: [] },
    publicApi: { added: [], removed: [], changed: [] },
    features: { created: [], retired: [], pending: [] },
    compile: null,
    changelog: "## [0.85.1] - 2026-09-01\n- Fixed a thing",
    reviewItems: [],
    ...overrides,
  };
}

describe("Pi upgrade proposal", () => {
  it("names the branch and change after the version and reads the version back from a branch", () => {
    expect(branchName("0.85.1")).toBe("chore/pi-0.85.1");
    expect(changeId("0.85.1-rc.2")).toBe("pi-upgrade-0-85-1-rc-2");
    expect(branchVersion("chore/pi-0.85.1")).toBe("0.85.1");
    expect(branchVersion("chore/pi-upgrade-adoption-matrix")).toBeNull();
    expect(branchVersion("feature/pi-0.85.1")).toBeNull();
  });

  it("orders the steps with the derived ones re-runnable and the compiling ones blockable", () => {
    expect(UPGRADE_STEPS.slice(0, 5)).toEqual(["bump", "evaluator", "install", "build", "merge"]);
    expect(UPGRADE_STEPS).toEqual(expect.arrayContaining(["public-api", "matrix", "startup-graph"]));
    expect(REFRESH_STEPS).not.toEqual(expect.arrayContaining(["bump", "evaluator", "install", "merge"]));
    expect(REFRESH_STEPS).toEqual(expect.arrayContaining(["build", "ledger", "inventories", "public-api", "matrix", "startup-graph", "parity", "typecheck", "architecture", "engine-conformance", "parity-suites"]));
    expect(MARKER_BLOCKED_STEPS).toEqual(["startup-graph", "parity", "typecheck", "architecture", "parity-suites"]);
    for (const name of [...REFRESH_STEPS, ...MARKER_BLOCKED_STEPS]) expect(UPGRADE_STEPS).toContain(name);
  });

  it("renders a body in the ordinary delivery layout with generated outcomes that ends with the automation details block", () => {
    const body = renderUpgradeBody(report());
    expect(body.startsWith("## Proposal\n\nUpgrade the pinned Pi packages from 0.84.2 (914cf14) to 0.85.1 (d981de1)")).toBe(true);
    expect(body).toContain("Every automated gate passed; review the diff and the sync report comment.");
    expect(body).toContain(`## Implementation\n\n${UPGRADE_IMPLEMENTATION_ITEMS.map(item => `- [ ] ${item}`).join("\n")}\n\n## Acceptance\n\n- A1 pins Pi 0.85.1 at upstream commit d981de1, and its vendored copies, inventories, public API and feature baselines, and parity records match that release.\n\n## Automation\n`);
    expect(body).not.toContain("Version delta");
    expect(body).not.toContain("Vendored copies");
    expect(body.trimEnd().endsWith("</details>")).toBe(true);
    expect(parseImplementation(body)).toEqual({ version: 3, change: "pi-upgrade-0-85-1" });
  });

  it("generates outcomes that parse as an incomplete checklist and as a complete candidate once checked", () => {
    const body = renderUpgradeBody(report());
    const progress = parseImplementationProgress(body);
    expect(progress).toEqual({ format: "checklist", complete: false, items: UPGRADE_IMPLEMENTATION_ITEMS.map(text => ({ checked: false, text })) });
    expect(() => assertImplementationOnlyProgress(progress.items)).not.toThrow();
    expect(() => parseImplementationAcceptanceScenarios(body, 3)).toThrow();
    const checked = body.replaceAll("- [ ] ", "- [x] ");
    expect(parseImplementationProgress(checked, { requireComplete: true }).complete).toBe(true);
    expect(parseImplementationAcceptanceScenarios(checked, 3)).toEqual([upgradeAcceptance(report())]);
    expect(upgradeAcceptance({ version: "0.85.1", commit: null })).toBe("A1 pins Pi 0.85.1, and its vendored copies, inventories, public API and feature baselines, and parity records match that release.");
  });

  it("keeps the proposal within the layout bounds when every gate fails", () => {
    const body = renderUpgradeBody(report({ version: "0.85.1-rc.2", steps: UPGRADE_STEPS.map(name => ({ name, status: "failed", detail: "" })) }));
    expect(() => parseImplementationAcceptanceScenarios(body.replaceAll("- [ ] ", "- [x] "), 3)).not.toThrow();
  });

  it("puts the version delta, changelog, and every verdict in the sync report comment", () => {
    const comment = renderUpgradeComment(report(), { date: "2026-09-19" });
    expect(comment.startsWith("### Pi 0.85.1 sync report (2026-09-19)\n\nThe nightly upstream sync evaluated Pi 0.85.1 against the pin 0.84.2.")).toBe(true);
    expect(comment).toContain("- Version delta: `@earendil-works/pi-coding-agent` and `@earendil-works/pi-tui` 0.84.2 -> 0.85.1; upstream commit d981de1229ef899957bbe968bc8dcda02a21f477.");
    expect(comment).toContain("  > ## [0.85.1] - 2026-09-01\n  > - Fixed a thing");
    expect(comment).toContain("- Vendored copies: 1 merged cleanly (src/integrations/pi/components/upstream/theme/theme.ts); 0 with conflict markers to resolve; 1 unchanged upstream; 0 kept as A1's version.");
    expect(comment).toContain("- Inventories: 1 anchors rewritten, 0 behavior ranges moved, 0 entries orphaned, 0 components unmapped.");
    expect(comment).toContain("- Public API: 0 exports added, 0 removed (0 consumed by A1), 0 changed (0 consumed by A1).");
    expect(comment).toContain("- New upstream features awaiting an A1 disposition: 0; rows retired upstream: 0; rows still pending: 0.");
    expect(comment).toContain("  - pass bump");
    expect(comment.trimEnd().endsWith("  - pass parity-suites")).toBe(true);
    expect(comment).not.toContain("Candidate compile");
    expect(comment).not.toContain("## Implementation");
  });

  it("names failed and blocked gates, kept copies, and review items so the proposal cannot read as clean", () => {
    const failing = report({
      steps: [
        { name: "bump", status: "passed", detail: "" },
        { name: "evaluator", status: "failed", detail: "compile: tsc exited with 2" },
        { name: "typecheck", status: "blocked", detail: "conflict markers remain in src/integrations/pi/components/upstream/theme/theme.ts" },
      ],
      merge: { clean: [], conflicted: ["src/integrations/pi/components/upstream/theme/theme.ts"], unchanged: [], kept: [{ path: "src/integrations/pi/components/upstream/components/owned-editor.ts", lines: 240 }] },
      inventories: { reanchored: [], moved: ["startup.tree: [565, 915] -> [570, 920]"], orphaned: ["auth.login"], unmapped: ["wizard.js"] },
      compile: [{ path: "src/app/session-shell/session-shell.ts", errors: 3, codes: ["TS2339"], first: "Property 'ThemeBg' does not exist" }],
      reviewItems: ["src/integrations/pi/components/upstream/theme/theme.ts: 2 conflict hunks between A1's deviations and the upstream change"],
      changelog: null,
      commit: null,
    });
    const body = renderUpgradeBody(failing);
    const comment = renderUpgradeComment(failing, { date: "2026-09-19" });
    expect(body).toContain("1 automated gate failed (evaluator) and 1 is blocked by conflict markers (typecheck); this upgrade needs design work");
    expect(body).toContain("commit unresolved");
    expect(comment).toContain("  - FAIL evaluator: compile: tsc exited with 2");
    expect(comment).toContain("  - BLOCKED typecheck: conflict markers remain in src/integrations/pi/components/upstream/theme/theme.ts");
    expect(comment).toContain("1 with conflict markers to resolve (src/integrations/pi/components/upstream/theme/theme.ts)");
    expect(comment).toContain("1 kept as A1's version (src/integrations/pi/components/upstream/components/owned-editor.ts: upstream changed, A1 version kept, 240 delta lines)");
    expect(comment).toContain("1 entries orphaned (auth.login), 1 components unmapped (wizard.js)");
    expect(comment).toContain("- Candidate compile: 3 errors in 1 file (complete output in the proposal artifact):\n  - src/app/session-shell/session-shell.ts: 3 errors (TS2339) Property 'ThemeBg' does not exist");
    expect(comment).toContain("- Review items:\n  - src/integrations/pi/components/upstream/theme/theme.ts: 2 conflict hunks");
    expect(comment).toContain("upstream commit unresolved (pass --commit to the sync)");
    expect(comment).not.toContain("changelog excerpt");
  });

  it("lists the public API delta with consumers and the new upstream features as adoption items", () => {
    const body = renderUpgradeReport(report({
      publicApi: {
        added: [{ package: "@earendil-works/pi-tui", name: "OverlayBounds", kind: "interface", consumers: [] }],
        removed: [{ package: "@earendil-works/pi-coding-agent", name: "SettingsConfig", kind: "interface", consumers: ["src/integrations/pi/engine/settings-port.ts"] }],
        changed: [
          { package: "@earendil-works/pi-coding-agent", name: "ModelSelectorComponent", kind: "class", consumers: ["src/integrations/pi/components/shell-selectors-dialogs.ts"] },
          { package: "@earendil-works/pi-tui", name: "ScrollViewScrollbar", kind: "type", consumers: [] },
        ],
      },
      features: {
        created: [{ id: "command:thinking", feature: "/thinking" }, { id: "changelog:0.85.1:gpt-6-astra", feature: "GPT-6 Astra", summary: "Available through OpenAI API keys." }],
        retired: ["command:dementedelves"],
        pending: ["command:thinking", "changelog:0.85.1:gpt-6-astra"],
      },
    }));
    expect(body).toContain("- Public API: 1 exports added, 1 removed (1 consumed by A1), 2 changed (1 consumed by A1).");
    expect(body).toContain("  - removed interface `SettingsConfig` (@earendil-works/pi-coding-agent); consumers: src/integrations/pi/engine/settings-port.ts");
    expect(body).toContain("  - changed class `ModelSelectorComponent` (@earendil-works/pi-coding-agent); consumers: src/integrations/pi/components/shell-selectors-dialogs.ts");
    expect(body).toContain("  - not consumed by A1: ScrollViewScrollbar");
    expect(body).toContain("- New upstream features awaiting an A1 disposition: 2; rows retired upstream: 1; rows still pending: 2.\n  - command:thinking: /thinking\n  - changelog:0.85.1:gpt-6-astra: GPT-6 Astra — Available through OpenAI API keys.");
  });

  it("reports a refresh as another comment that names the reviewer's head", () => {
    const refreshed = report({
      mode: "refresh",
      steps: [{ name: "bump", status: "skipped", detail: "not re-run on a refresh" }, { name: "typecheck", status: "failed", detail: "error TS2339" }],
      reviewItems: ["src/x.ts: still conflicted"],
    });
    const comment = renderUpgradeComment(refreshed, { date: "2026-09-20" });
    expect(comment.startsWith("### Pi 0.85.1 sync report (2026-09-20)\n\nA refresh re-ran the derived steps and gates on the proposal branch head; the merge and evaluation verdicts are from the original proposal.")).toBe(true);
    expect(comment).toContain(renderUpgradeReport(refreshed));
    expect(comment).toContain("  - skip bump: not re-run on a refresh\n  - FAIL typecheck: error TS2339\n- Review items:\n  - src/x.ts: still conflicted");
    expect(comment).not.toContain("pass parity-suites");
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
    expect(files["openspec/changes/pi-upgrade-0-85-1/tasks.md"]).toContain(`## 2. Review Items\n\n- [ ] 2.1 ${UPGRADE_IMPLEMENTATION_ITEMS[0]}`);
    expect(files["openspec/changes/pi-upgrade-0-85-1/design.md"]).not.toContain("Sync report at proposal");
    const withReport = renderUpgradeChange({ previous, version: "0.85.1", commit, foundationSpec, date: "2026-09-19", report: report() });
    expect(withReport["openspec/changes/pi-upgrade-0-85-1/design.md"]).toContain(`## Sync report at proposal\n\n${renderUpgradeReport(report())}\n`);
    expect(() => renderUpgradeChange({ previous, version: "0.85.1", commit, foundationSpec: "nothing", date: "2026-09-19" })).toThrow("requirement naming the pin is missing");
  });
});
