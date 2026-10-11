import { describe, expect, it } from "vitest";
import { acceptanceChecklistDigest, acceptancePullBody, MAX_ACCEPTANCE_CHECKS, MAX_IMPLEMENTATION_PROGRESS_ITEMS,
  parseImplementationAcceptanceChecks, parseImplementationAcceptanceScenarios, parseImplementationProgress,
  verifyAcceptancePullBody } from "../../scripts/governance/openspec-acceptance-checklist.mjs";
import type { AcceptanceRecord } from "../../scripts/governance/openspec-acceptance-policy.mjs";

const checks = [
  "Overflowing content displays a scrollbar beside the visible viewport.",
  "Dragging the scrollbar updates the viewport while preserving the selected pane.",
];
const sourceBody = (items = checks) => `## Summary\n\nScrollbar behavior is implemented.\n\n\`\`\`openspec-implementation\n{"version":2,"change":"scrollbar"}\n\`\`\`\n\n## Acceptance checks\n\n${items.map(item => `- ${item}`).join("\n")}`;
const version3Body = (items = checks, prefix = "- ") => `## Proposal\n\nMake overflowing content easier to navigate without losing pane context.\n\n## Implementation\n\n- Add a viewport scrollbar synchronized with selection and scrolling.\n\n## Acceptance\n\n${items.map(item => `${prefix}${item}`).join("\n")}\n\n## Automation\n\n<details>\n<summary>Used by CI to link this PR to its OpenSpec change</summary>\n\n\`\`\`openspec-implementation\n{"version":3,"change":"scrollbar"}\n\`\`\`\n\n</details>`;
const progressItems: [string, string] = [
  "Add a viewport scrollbar synchronized with selection and scrolling.",
  "Preserve the selected pane while the viewport moves through overflowing content.",
];
const progressBody = (marks: string[] = [" ", "x"], items: readonly string[] = progressItems) => version3Body().replace(
  "- Add a viewport scrollbar synchronized with selection and scrolling.",
  items.map((item, index) => `- [${marks[index] ?? "x"}] ${item}`).join("\n"));
const legacyVersion3Body = (phase = "Implementation") => `> Phase: ${phase}\n\n${version3Body()}`;
const record = (): AcceptanceRecord => ({
  version: 2, repository: "owner/repo", change: "scrollbar", sourcePr: 42,
  sourceHead: "a".repeat(40), sourceMerge: "b".repeat(40), sourceBodyDigest: "c".repeat(64),
  artifactDigest: "d".repeat(64), specBaseSha: "e".repeat(40), acceptanceChecks: checks,
  validation: { runId: 1, headSha: "a".repeat(40), checkedSha: "a".repeat(40), attempt: 1 },
  tasks: [{ id: "1.1", text: "Implement scrollbar behavior.", done: false, digest: "f".repeat(64), completion: "pending", evidence: [] }],
  review: { decision: "accept-on-manual-merge", evidence: [], gaps: [] },
});

describe("implementation-specific acceptance checklist", () => {
  it("extracts one to ten final reviewed behavior checks outside metadata fences", () => {
    expect(parseImplementationAcceptanceChecks(sourceBody())).toEqual(checks);
    expect(parseImplementationAcceptanceChecks(sourceBody([checks[0]!]))).toEqual([checks[0]]);
    expect(acceptanceChecklistDigest(checks)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("extracts version-3 plain acceptance scenarios and rejects checkbox state", () => {
    expect(parseImplementationAcceptanceScenarios(version3Body(), 3)).toEqual(checks);
    expect(parseImplementationAcceptanceScenarios(sourceBody(), 2)).toEqual(checks);
    expect(() => parseImplementationAcceptanceScenarios(version3Body(checks, "- [ ] "), 3)).toThrow("acceptance-checklist-item");
    expect(() => parseImplementationAcceptanceScenarios(sourceBody(), 3)).toThrow("acceptance-layout-phase");
    expect(() => parseImplementationAcceptanceScenarios(version3Body(), 1)).toThrow("acceptance-version");
  });

  it("tracks scoped Implementation items and requires completion for final version-3 parsing", () => {
    expect(parseImplementationProgress(progressBody())).toEqual({
      format: "checklist", complete: false,
      items: [{ checked: false, text: progressItems[0] }, { checked: true, text: progressItems[1] }],
    });
    expect(() => parseImplementationAcceptanceScenarios(progressBody(), 3)).toThrow("implementation-progress-incomplete");
    expect(parseImplementationAcceptanceScenarios(progressBody(["x", "x"]), 3)).toEqual(checks);
    expect(parseImplementationProgress(version3Body())).toMatchObject({ format: "legacy", complete: true });
  });

  it.each([
    ["mixed plain/task syntax", () => progressBody().replace(`- [x] ${progressItems[1]}`, `- ${progressItems[1]}`), "implementation-progress-item"],
    ["uppercase marker", () => progressBody(["x", "X"]), "implementation-progress-item"],
    ["duplicate item", () => progressBody(["x", "x"], [progressItems[0], progressItems[0]]), "implementation-progress-duplicate"],
    ["generic CI item", () => progressBody(["x", "x"], [progressItems[0], "Run the required CI checks."]), "implementation-progress-generic"],
    ["one item", () => progressBody(["x"], [progressItems[0]]), "implementation-progress-count"],
    ["too many items", () => progressBody(Array(MAX_IMPLEMENTATION_PROGRESS_ITEMS + 1).fill("x"),
      Array.from({ length: MAX_IMPLEMENTATION_PROGRESS_ITEMS + 1 }, (_value, index) => `Implement distinct viewport progress outcome number ${index}.`)), "implementation-progress-count"],
  ])("rejects %s in an Implementation checklist", (_name, body, code) => {
    expect(() => parseImplementationProgress(body())).toThrow(code);
  });

  it("requires the canonical phase-free section layout and scopes historical compatibility", () => {
    expect(version3Body().split("\n")[0]).toBe("## Proposal");
    expect(() => parseImplementationAcceptanceScenarios(legacyVersion3Body(), 3)).toThrow("acceptance-layout-phase");
    expect(() => parseImplementationAcceptanceScenarios(legacyVersion3Body("Acceptance"), 3)).toThrow("acceptance-layout-phase");
    expect(parseImplementationAcceptanceScenarios(legacyVersion3Body(), 3, { allowLegacyVersion3Phase: true })).toEqual(checks);
    expect(parseImplementationAcceptanceScenarios(legacyVersion3Body("Acceptance"), 3, { allowLegacyVersion3Phase: true })).toEqual(checks);
    expect(() => parseImplementationAcceptanceScenarios(legacyVersion3Body("Proposal"), 3, { allowLegacyVersion3Phase: true }))
      .toThrow("acceptance-layout-phase");
    expect(() => parseImplementationAcceptanceScenarios(version3Body().replace("## Implementation", "## Intent"), 3))
      .toThrow("acceptance-layout-sections");
    expect(() => parseImplementationAcceptanceScenarios(version3Body().replace("Used by CI to link this PR", "Machine data links this PR"), 3))
      .toThrow("acceptance-layout-automation");
    expect(() => parseImplementationAcceptanceScenarios(version3Body().replace("Make overflowing content easier to navigate without losing pane context.", "- Add a scrollbar."), 3))
      .toThrow("acceptance-layout-proposal");
    expect(() => parseImplementationAcceptanceScenarios(version3Body().replace("Make overflowing content easier to navigate without losing pane context.", "Improve navigation. Preserve pane context. Add more detail."), 3))
      .toThrow("acceptance-layout-proposal");
  });

  it.each([
    ["missing", "## Summary\nNo handoff.", "acceptance-checklist-missing"],
    ["empty", sourceBody([]), "acceptance-checklist-count"],
    ["too many", sourceBody(Array.from({ length: MAX_ACCEPTANCE_CHECKS + 1 }, (_value, index) => `Scrollbar row ${index} stays aligned with the viewport while the pane scrolls.`)), "acceptance-checklist-count"],
    ["duplicate", sourceBody([checks[0]!, checks[0]!.toUpperCase()]), "acceptance-checklist-duplicate"],
    ["generic review", sourceBody(["Review the linked implementation PR."]), "acceptance-checklist-generic"],
    ["generic CI", sourceBody(["Confirm the required CI checks passed."]), "acceptance-checklist-generic"],
    ["generic gap", sourceBody(["Confirm there are no blocking gaps."]), "acceptance-checklist-generic"],
    ["generic approval", sourceBody(["Approve the implementation."]), "acceptance-checklist-generic"],
    ["checkbox source", sourceBody(["[ ] Scrollbar behavior appears when content overflows the viewport."]), "acceptance-checklist-item"],
    ["oversized", sourceBody([`Scrollbar behavior ${"x".repeat(400)}`]), "acceptance-checklist-item"],
  ])("rejects %s handoff checks", (_name, body, code) => {
    expect(() => parseImplementationAcceptanceChecks(body)).toThrow(code);
  });

  it("renders a plain implementation reference and permits checkbox-state edits only", () => {
    const request = acceptancePullBody(record(), "fix(ui): restore pane scrollbar");
    expect(request.split("\n")[0]).toBe("Implementation: [#42: restore pane scrollbar](https://github.com/owner/repo/pull/42)");
    expect(request).not.toContain("[ ] Implementation:");
    expect(request.match(/- \[ \]/g)).toHaveLength(2);
    expect(verifyAcceptancePullBody(record(), "fix(ui): restore pane scrollbar", request)).toMatchObject({ complete: false, checks });
    const accepted = request.replaceAll("- [ ] ", "- [x] ");
    expect(verifyAcceptancePullBody(record(), "fix(ui): restore pane scrollbar", accepted, { requireComplete: true }))
      .toMatchObject({ complete: true, checks });
  });

  it.each([
    ["unchecked", (body: string) => body.replace("- [x] ", "- [ ] "), "acceptance-checklist-incomplete"],
    ["missing", (body: string) => body.split("\n").slice(0, -1).join("\n"), "acceptance-checklist-mismatch"],
    ["extra", (body: string) => `${body}\n- [x] An unrelated scenario was inserted into the request.`, "acceptance-checklist-mismatch"],
    ["renamed", (body: string) => body.replace("visible viewport", "current pane"), "acceptance-checklist-mismatch"],
    ["reordered", (body: string) => { const lines = body.split("\n"); return [...lines.slice(0, 2), lines[3], lines[2]].join("\n"); }, "acceptance-checklist-mismatch"],
    ["uppercase mark", (body: string) => body.replace("- [x] ", "- [X] "), "acceptance-checklist-mismatch"],
    ["extra prose", (body: string) => `${body}\nReviewed.`, "acceptance-checklist-mismatch"],
  ])("rejects a %s final body", (_name, mutate, code) => {
    const accepted = acceptancePullBody(record(), "fix(ui): restore pane scrollbar").replaceAll("- [ ] ", "- [x] ");
    expect(() => verifyAcceptancePullBody(record(), "fix(ui): restore pane scrollbar", mutate(accepted), { requireComplete: true })).toThrow(code);
  });
});
