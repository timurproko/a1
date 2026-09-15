import { describe, expect, it } from "vitest";
import { acceptanceChecklistDigest, acceptancePullBody, parseImplementationAcceptanceChecks,
  parseImplementationAcceptanceScenarios, verifyAcceptancePullBody } from "../../scripts/governance/openspec-acceptance-checklist.mjs";
import type { AcceptanceRecord } from "../../scripts/governance/openspec-acceptance-policy.mjs";

const checks = [
  "Overflowing content displays a scrollbar beside the visible viewport.",
  "Dragging the scrollbar updates the viewport while preserving the selected pane.",
];
const sourceBody = (items = checks) => `## Summary\n\nScrollbar behavior is implemented.\n\n\`\`\`openspec-implementation\n{"version":2,"change":"scrollbar"}\n\`\`\`\n\n## Acceptance checks\n\n${items.map(item => `- ${item}`).join("\n")}`;
const version3Body = (items = checks, prefix = "- ") => `> Phase: Acceptance\n\n## Proposal\n\nMake overflowing content easier to navigate without losing pane context.\n\n## Implementation\n\n- Add a viewport scrollbar synchronized with selection and scrolling.\n\n## Acceptance\n\n${items.map(item => `${prefix}${item}`).join("\n")}\n\n## Automation\n\n<details>\n<summary>Used by CI to link this PR to its OpenSpec change</summary>\n\n\`\`\`openspec-implementation\n{"version":3,"change":"scrollbar"}\n\`\`\`\n\n</details>`;
const record = (): AcceptanceRecord => ({
  version: 2, repository: "owner/repo", change: "scrollbar", sourcePr: 42,
  sourceHead: "a".repeat(40), sourceMerge: "b".repeat(40), sourceBodyDigest: "c".repeat(64),
  artifactDigest: "d".repeat(64), specBaseSha: "e".repeat(40), acceptanceChecks: checks,
  validation: { runId: 1, headSha: "a".repeat(40), checkedSha: "a".repeat(40), attempt: 1 },
  tasks: [{ id: "1.1", text: "Implement scrollbar behavior.", done: false, digest: "f".repeat(64), completion: "pending", evidence: [] }],
  review: { decision: "accept-on-manual-merge", evidence: [], gaps: [] },
});

describe("implementation-specific acceptance checklist", () => {
  it("extracts one to three final reviewed behavior checks outside metadata fences", () => {
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

  it("requires the canonical visible phase and section layout for completed deliveries", () => {
    expect(() => parseImplementationAcceptanceScenarios(version3Body().replace("> Phase: Acceptance", "> Phase: Implementation"), 3))
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
    ["too many", sourceBody([...checks, "Mouse-wheel scrolling keeps the scrollbar thumb synchronized with the viewport.", "Keyboard scrolling keeps the scrollbar thumb synchronized with the viewport."]), "acceptance-checklist-count"],
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
