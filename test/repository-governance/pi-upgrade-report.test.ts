import { describe, expect, it } from "vitest";
import {
  branchName,
  branchVersion,
  changeId,
  MARKER_BLOCKED_STEPS,
  REFRESH_STEPS,
  refreshUpgradeBody,
  renderUpgradeBody,
  renderUpgradeChange,
  renderUpgradeComment,
  renderUpgradeReport,
  REPORT_END,
  REPORT_START,
  UPGRADE_STEPS,
} from "../../scripts/pi/pi-upgrade-report.mjs";

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

  it("renders a body in the OpenSpec layout that ends with the automation details block", () => {
    const body = renderUpgradeBody(report());
    expect(body.startsWith("## Proposal\n\nUpgrade the pinned Pi packages from 0.84.2 (914cf14) to 0.85.1 (d981de1)")).toBe(true);
    expect(body).toContain("Every automated gate passed");
    expect(body).toContain("## Implementation\n\n- Version delta:");
    expect(body).toContain("  > ## [0.85.1] - 2026-09-01\n  > - Fixed a thing");
    expect(body).toContain(`${REPORT_START}\n- Vendored copies: 1 merged cleanly (src/integrations/pi/components/upstream/theme/theme.ts); 0 with conflict markers to resolve; 1 unchanged upstream; 0 kept as A1's version.`);
    expect(body).toContain("- Inventories: 1 anchors rewritten, 0 behavior ranges moved, 0 entries orphaned, 0 components unmapped.");
    expect(body).toContain("- Public API: 0 exports added, 0 removed (0 consumed by A1), 0 changed (0 consumed by A1).");
    expect(body).toContain("- New upstream features awaiting an A1 disposition: 0; rows retired upstream: 0; rows still pending: 0.");
    expect(body).toContain("  - pass bump");
    expect(body).toContain(`  - pass parity-suites\n${REPORT_END}\n\n## Automation`);
    expect(body).not.toContain("## Acceptance");
    expect(body).not.toContain("Candidate compile");
    expect(body.trimEnd().endsWith("</details>")).toBe(true);
    expect(body).toContain('"change": "pi-upgrade-0-85-1"');
  });

  it("names failed and blocked gates, kept copies, and review items so the proposal cannot read as clean", () => {
    const body = renderUpgradeBody(report({
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
    }));
    expect(body).toContain("1 automated gate failed (evaluator) and 1 is blocked by conflict markers (typecheck); this upgrade needs design work");
    expect(body).toContain("  - FAIL evaluator: compile: tsc exited with 2");
    expect(body).toContain("  - BLOCKED typecheck: conflict markers remain in src/integrations/pi/components/upstream/theme/theme.ts");
    expect(body).toContain("1 with conflict markers to resolve (src/integrations/pi/components/upstream/theme/theme.ts)");
    expect(body).toContain("1 kept as A1's version (src/integrations/pi/components/upstream/components/owned-editor.ts: upstream changed, A1 version kept, 240 delta lines)");
    expect(body).toContain("1 entries orphaned (auth.login), 1 components unmapped (wizard.js)");
    expect(body).toContain("- Candidate compile: 3 errors in 1 file (complete output in the proposal artifact):\n  - src/app/session-shell/session-shell.ts: 3 errors (TS2339) Property 'ThemeBg' does not exist");
    expect(body).toContain("- Review items:\n  - src/integrations/pi/components/upstream/theme/theme.ts: 2 conflict hunks");
    expect(body).toContain("commit unresolved");
    expect(body).not.toContain("changelog excerpt");
  });

  it("lists the public API delta with consumers and the new upstream features as adoption items", () => {
    const body = renderUpgradeBody(report({
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

  it("refreshes only the report between its markers and leaves the reviewer's sections alone", () => {
    const original = renderUpgradeBody(report());
    const edited = original
      .replace("## Proposal\n\nUpgrade the pinned Pi packages", "## Proposal\n\nThe reviewer rewrote this: upgrade the pinned Pi packages")
      .replace("- Version delta:", "- Reviewer note: keep the owned editor.\n- Version delta:");
    const refreshed = refreshUpgradeBody(edited, report({
      mode: "refresh",
      refreshedAt: "2026-09-19",
      steps: [{ name: "bump", status: "skipped", detail: "not re-run on a refresh" }, { name: "typecheck", status: "failed", detail: "error TS2339" }],
      reviewItems: ["src/x.ts: still conflicted"],
    }));
    expect(refreshed).toContain("The reviewer rewrote this: upgrade the pinned Pi packages");
    expect(refreshed).toContain("- Reviewer note: keep the owned editor.\n- Version delta:");
    expect(refreshed).toContain(`${REPORT_START}\n- Refreshed 2026-09-19 on the proposal branch head`);
    expect(refreshed).toContain("  - skip bump: not re-run on a refresh\n  - FAIL typecheck: error TS2339\n- Review items:\n  - src/x.ts: still conflicted\n" + REPORT_END);
    expect(refreshed).not.toContain("pass parity-suites");
    expect(refreshed.split(REPORT_START)).toHaveLength(2);
    expect(refreshed.split(REPORT_END)).toHaveLength(2);
    expect(refreshed.trimEnd().endsWith("</details>")).toBe(true);
    expect(refreshUpgradeBody("## Proposal\n\nHand-written without markers.\n", report())).toBe(renderUpgradeBody(report()));
  });

  it("posts the fresh report as a comment headed with the version and date when it may not push", () => {
    const comment = renderUpgradeComment(report({ reviewItems: ["inventory entry auth.login: source anchor no longer exists (orphaned)"] }), { date: "2026-09-19" });
    expect(comment.startsWith("### Pi 0.85.1 sync report (2026-09-19)\n\nThe nightly sync re-ran against Pi 0.85.1 (pin 0.84.2) and did not push")).toBe(true);
    expect(comment).toContain(renderUpgradeReport(report({ reviewItems: ["inventory entry auth.login: source anchor no longer exists (orphaned)"] })));
    expect(comment).toContain("  - inventory entry auth.login");
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
