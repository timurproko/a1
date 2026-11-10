import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyPiTheme, createPiShellAuthProviderSelector, createPiShellExtensionSelector, createPiShellTrustSelector, piTheme, setPiAccentColor } from "../../../../src/integrations/pi/components/index.js";
import { cellBackgroundAt, cellStyle } from "../../../support/ansi-cell-style.js";

const providers = [
  { id: "oauth:anthropic", providerId: "anthropic", label: "Anthropic", authType: "oauth" as const },
  { id: "oauth:openrouter", providerId: "openrouter", label: "OpenRouter", authType: "oauth" as const, status: { type: "oauth" as const, source: "stored" } },
];

function assertSelected(row: string, label: string): void {
  const plain = stripTerminalSequences(row);
  const arrow = plain.indexOf("→");
  expect(arrow).toBe(1);
  expect(cellStyle(row, "→")).toEqual(cellStyle(piTheme().fg("accent", "→"), "→"));
  expect(cellStyle(row, label[0]!)).toEqual(cellStyle(piTheme().fg("text", label[0]!), label[0]!));
  expect(cellBackgroundAt(row, 0)).toBe("default");
  expect(cellBackgroundAt(row, arrow)).toBe(cellBackgroundAt(piTheme().bg("selectedBg", "x"), 0));
  expect(cellBackgroundAt(`${row}x`, plain.length)).toBe("default");
  expect(row).not.toContain("\u001b[1m");
}

afterEach(() => { setPiAccentColor("blue"); applyPiTheme("dark", false, "truecolor"); });

describe("standard sign-in and trust presentation", () => {
  it.each(["dark", "light"] as const)("uses live shared selection roles in %s appearance", appearance => {
    applyPiTheme(appearance, false, "truecolor");
    const selected = vi.fn();
    const method = createPiShellExtensionSelector("Select Authentication Method", ["Account", "API Key"], selected, () => {}, true);
    const auth = createPiShellAuthProviderSelector("login", providers, selected, () => {}, undefined, true);
    for (const accent of ["blue", "pink"] as const) {
      setPiAccentColor(accent);
      for (const component of [method, auth]) {
        const rows = component.render(80);
        const title = rows[1]!;
        expect(stripTerminalSequences(title)).toContain(component === method ? "Select Authentication Method" : "Select Provider to Configure");
        expect(stripTerminalSequences(title).trim()).not.toMatch(/:$/u);
        const row = rows.find(row => stripTerminalSequences(row).includes("→ "))!;
        assertSelected(row, component === method ? "Account" : "Anthropic");
      }
    }
    auth.handleInput?.("\u001b[B");
    const rows = auth.render(80);
    assertSelected(rows.find(row => stripTerminalSequences(row).includes("→ "))!, "OpenRouter");
    expect(stripTerminalSequences(rows.join("\n"))).toContain("OpenRouter ✦ ✓ stored");
    expect(rows.find(row => stripTerminalSequences(row).includes("Anthropic"))).not.toContain(piTheme().getBgAnsi("selectedBg"));
    auth.handleInput?.("\r");
    expect(selected).toHaveBeenLastCalledWith("oauth:openrouter");
  });

  it("keeps provider filtering, paging, cancellation and clipped selection", () => {
    applyPiTheme("dark", false, "256color");
    const selected = vi.fn();
    const cancel = vi.fn();
    const options = Array.from({ length: 20 }, (_, index) => ({ id: `oauth:provider-${index}`, providerId: `provider-${index}`, label: `Provider ${index}`, authType: "oauth" as const }));
    const auth = createPiShellAuthProviderSelector("login", options, selected, cancel, undefined, true);
    auth.handleInput?.("\u001b[6~");
    expect(stripTerminalSequences(auth.render(80).join("\n"))).toContain("(9/20)");
    for (const row of auth.render(14)) expect(visibleWidth(row)).toBeLessThanOrEqual(14);
    auth.handleInput?.("zzzz");
    expect(stripTerminalSequences(auth.render(80).join("\n"))).toContain("No matching providers");
    auth.handleInput?.("\r");
    expect(selected).not.toHaveBeenCalled();
    auth.handleInput?.("\u001b");
    expect(cancel).toHaveBeenCalledOnce();
  });

  it.each([null, { path: "D:/parent", decision: true }, { path: "D:/parent/project", decision: false }])("aligns resolved trust values without a saved path suffix: %j", savedDecision => {
    const selected = vi.fn();
    const cancel = vi.fn();
    const trustOptions = [
      { label: "Trust", trusted: true, updates: [{ path: "D:/parent/project", decision: true }], savedPath: "D:/parent/project" },
      { label: "Do not trust", trusted: false, updates: [{ path: "D:/parent/project", decision: false }], savedPath: "D:/parent/project" },
    ];
    const component = createPiShellTrustSelector({ cwd: "D:/parent/project", savedDecision, projectTrusted: true, trustOptions, standardStyle: true, onSelect: selected, onCancel: cancel });
    const rows = component.render(80);
    const plain = rows.map(stripTerminalSequences);
    expect(plain[1]?.trim()).toBe("Project Trust");
    expect(plain.some(row => row.trim() === "D:/parent/project")).toBe(true);
    const saved = plain.find(row => row.includes("Saved decision:"))!;
    const current = plain.find(row => row.includes("Current session:"))!;
    const decision = savedDecision === null ? "none" : savedDecision.decision ? "trusted" : "untrusted";
    expect(saved.trimEnd()).toBe(` Saved decision:  ${decision}`);
    expect(current.trimEnd()).toBe(" Current session: trusted");
    expect(saved.indexOf(decision)).toBe(current.indexOf("trusted"));
    expect(saved).not.toContain("(");
    assertSelected(rows.find(row => stripTerminalSequences(row).includes("→ "))!, savedDecision?.decision === false ? "Do not trust" : "Trust");
    component.handleInput?.("\r");
    expect(selected).toHaveBeenCalledWith(expect.objectContaining({ trusted: savedDecision?.decision !== false }));
    component.handleInput?.("\u001b");
    expect(cancel).toHaveBeenCalledOnce();
    for (const row of component.render(12)) expect(visibleWidth(row)).toBeLessThanOrEqual(12);
  });
});
