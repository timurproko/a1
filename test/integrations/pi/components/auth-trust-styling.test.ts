import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyPiTheme, createPiShellAuthProviderSelector, createPiShellExtensionSelector, createPiShellSelector, createPiShellTrustSelector, createPiShellUserMessageSelector, createPiShellModelSelector, piTheme, setPiAccentColor } from "../../../../src/integrations/pi/components/index.js";
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
  it("standardizes the retained internal fork picker while preserving its wraparound controller", () => {
    const chosen = vi.fn();
    const fork = createPiShellUserMessageSelector([{ id: "first", label: "First" }, { id: "last", label: "Last" }], chosen, () => {}, "first", true);
    const title = fork.render(80).find(row => stripTerminalSequences(row).includes("Fork from Message"))!;
    expect(cellStyle(title, "F")).toEqual(cellStyle(piTheme().fg("accent", "F"), "F"));
    fork.handleInput?.("\u001b[A");
    assertSelected(fork.render(80).find(row => stripTerminalSequences(row).includes("→ "))!, "Last");
    fork.handleInput?.("\r");
    expect(chosen).toHaveBeenCalledWith("last");
  });

  it("standardizes retained internal model choices without losing provider or active-model roles", async () => {
    const models = [{ provider: "openai", id: "alpha", name: "Alpha" }, { provider: "openai", id: "omega", name: "Omega" }];
    const select = vi.fn();
    const model = createPiShellModelSelector({
      standardStyle: true, currentModel: models[0], scopedModels: [],
      modelRuntime: { getAvailableSnapshot: () => models, getModel: () => models[0], getError: () => undefined, refresh: async () => ({ aborted: false, errors: new Map() }) },
      runtime: { getColumns: () => 80, getRows: () => 24, requestRender() {} },
      onSelect: select, onSelectAsDefault() {}, onCancel() {},
    });
    await vi.waitFor(() => expect(stripTerminalSequences(model.render(80).join("\n"))).toContain("→ ✓ alpha"));
    const row = model.render(80).find(row => stripTerminalSequences(row).includes("→ ✓ alpha"))!;
    assertSelected(row, "alpha");
    expect(cellStyle(row, "[")).toEqual(cellStyle(piTheme().fg("muted", "["), "["));
    model.handleInput?.("\u001b[A"); model.handleInput?.("\r");
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: "omega" }));
    model.dispose?.();
  });

  it("gives internal generic choices the same title, foreground and selected background roles", () => {
    const chosen = vi.fn();
    const options = [{ id: "first", label: "Primary", description: "metadata" }, { id: "last", label: "Other" }];
    const component = createPiShellSelector({ title: "Choose internal option:", options, onSelect: chosen, onCancel() {} }, true);
    expect(stripTerminalSequences(component.render(80)[0]!)).toContain("Choose Internal Option");
    const row = component.render(80).find(row => stripTerminalSequences(row).includes("→"))!;
    expect(cellStyle(row, "P")).toEqual(cellStyle(piTheme().fg("text", "P"), "P"));
    expect(cellStyle(row, "d")).toEqual(cellStyle(piTheme().fg("muted", "d"), "d"));
    expect(cellBackgroundAt(row, 0)).toBe(cellBackgroundAt(piTheme().bg("selectedBg", "x"), 0));
    component.handleInput?.("\u001b[A"); component.handleInput?.("\r");
    expect(chosen).toHaveBeenCalledWith("last");
  });
  it("styles and cycles nested internal authentication choices without restyling external/comparison content", () => {
    const title = "Select Amazon Bedrock authentication method:";
    const choices = ["Bearer token", "AWS profile", "Existing AWS credential chain"];
    const select = vi.fn();
    const owned = createPiShellExtensionSelector(title, choices, select, () => {}, true);
    const comparison = createPiShellExtensionSelector(title, choices, () => {}, () => {});
    expect(stripTerminalSequences(owned.render(80)[1]!)).toContain("Select Amazon Bedrock Authentication Method");
    expect(stripTerminalSequences(comparison.render(80)[1]!)).toContain(title);
    owned.handleInput?.("\u001b[A");
    assertSelected(owned.render(80).find(row => stripTerminalSequences(row).includes("→ "))!, choices[2]!);
    owned.handleInput?.("\r");
    expect(select).toHaveBeenLastCalledWith(choices[2]);
    owned.handleInput?.("\u001b[B");
    owned.handleInput?.("\r");
    expect(select).toHaveBeenLastCalledWith(choices[0]);
    comparison.handleInput?.("\u001b[A");
    expect(stripTerminalSequences(comparison.render(80).join("\n"))).toContain("→ Bearer token");
  });

  it.each(["oauth", "api_key"] as const)("wraps %s providers across both ends and filtered matches", async authType => {
    const select = vi.fn();
    const options = Array.from({ length: 12 }, (_, index) => ({ id: `${authType}:provider-${index}`, providerId: `provider-${index}`, label: `Provider ${index}`, authType }));
    const auth = createPiShellAuthProviderSelector("login", options, select, () => {}, undefined, true);
    await auth.ready;
    auth.handleInput?.("\u001b[A");
    expect(stripTerminalSequences(auth.render(80).join("\n"))).toContain("(12/12)");
    auth.handleInput?.("\r");
    expect(select).toHaveBeenLastCalledWith(options[11]!.id);
    auth.handleInput?.("\u001b[B");
    auth.handleInput?.("\r");
    expect(select).toHaveBeenLastCalledWith(options[0]!.id);
    const filtered = createPiShellAuthProviderSelector("login", options, select, () => {}, "Provider 1", true);
    await filtered.ready;
    const first = stripTerminalSequences(filtered.render(80).find(row => stripTerminalSequences(row).includes("→ "))!);
    filtered.handleInput?.("\u001b[A");
    const last = stripTerminalSequences(filtered.render(80).find(row => stripTerminalSequences(row).includes("→ "))!);
    expect(last).not.toBe(first);
    filtered.handleInput?.("\u001b[B");
    expect(stripTerminalSequences(filtered.render(80).find(row => stripTerminalSequences(row).includes("→ "))!)).toBe(first);
    for (const subset of [[], [options[0]!]]) {
      const small = createPiShellAuthProviderSelector("login", subset, select, () => {}, undefined, true);
      await small.ready;
      small.handleInput?.("\u001b[A"); small.handleInput?.("\u001b[B");
      const before = select.mock.calls.length;
      small.handleInput?.("\r");
      expect(select.mock.calls.length).toBe(before + subset.length);
    }
  });
  it.each(["dark", "light"] as const)("uses live shared selection roles in %s appearance", async appearance => {
    applyPiTheme(appearance, false, "truecolor");
    const selected = vi.fn();
    const method = createPiShellExtensionSelector("Select Authentication Method", ["Account", "API Key"], selected, () => {}, true);
    const auth = createPiShellAuthProviderSelector("login", providers, selected, () => {}, undefined, true);
    await auth.ready;
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

  it("keeps provider filtering, paging, cancellation and clipped selection", async () => {
    applyPiTheme("dark", false, "256color");
    const selected = vi.fn();
    const cancel = vi.fn();
    const options = Array.from({ length: 20 }, (_, index) => ({ id: `oauth:provider-${index}`, providerId: `provider-${index}`, label: `Provider ${index}`, authType: "oauth" as const }));
    const auth = createPiShellAuthProviderSelector("login", options, selected, cancel, undefined, true);
    await auth.ready;
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

  it.each([null, { path: "D:/parent", decision: true }, { path: "D:/parent/project", decision: false }])("aligns resolved trust values without a saved path suffix: %j", async savedDecision => {
    const selected = vi.fn();
    const cancel = vi.fn();
    const trustOptions = [
      { label: "Trust", trusted: true, updates: [{ path: "D:/parent/project", decision: true }], savedPath: "D:/parent/project" },
      { label: "Do not trust", trusted: false, updates: [{ path: "D:/parent/project", decision: false }], savedPath: "D:/parent/project" },
    ];
    const component = createPiShellTrustSelector({ cwd: "D:/parent/project", savedDecision, projectTrusted: true, trustOptions, standardStyle: true, onSelect: selected, onCancel: cancel });
    await component.ready;
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
    if (savedDecision?.decision === false) component.handleInput?.("\u001b[B");
    component.handleInput?.("\u001b[A");
    component.handleInput?.("\r");
    expect(selected).toHaveBeenLastCalledWith(expect.objectContaining({ trusted: false }));
    component.handleInput?.("\u001b[B");
    component.handleInput?.("\r");
    expect(selected).toHaveBeenLastCalledWith(expect.objectContaining({ trusted: true }));
    component.handleInput?.("\u001b");
    expect(cancel).toHaveBeenCalledOnce();
    for (const row of component.render(12)) expect(visibleWidth(row)).toBeLessThanOrEqual(12);
  });
});
