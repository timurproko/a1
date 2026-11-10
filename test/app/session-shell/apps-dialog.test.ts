import { describe, expect, it, vi } from "vitest";
import { AppsDialog } from "../../../src/app/session-shell/apps-dialog.js";
import { displayWidth, stripAnsi, type UiTheme } from "../../../src/ui/components/index.js";

const theme: UiTheme = {
  fg: (_role, text) => text, bold: text => text, plain: text => text,
  highlight: text => text, disabled: text => text, panel: text => text, background: (_role, text) => text,
};
function fixture(height = 24) {
  const select = vi.fn(), cancel = vi.fn();
  const dialog = new AppsDialog({ theme: () => theme, height: () => height, legacyKey: data => data, select, cancel, requestRender() {} });
  return { dialog, select, cancel, text: () => dialog.render(60).map(stripAnsi).join("\n") };
}

describe("Launcher dialog", () => {
  it("wraps at both ends of the current results without opening until confirmed", () => {
    const { dialog, select, text } = fixture();
    dialog.handleInput("\u001b[A");
    expect(text()).toContain("→ Hotkeys");
    expect(select).not.toHaveBeenCalled();
    dialog.handleInput("\u001b[B");
    expect(text()).toContain("→ Agent");
    dialog.handleInput("g");
    dialog.handleInput("\u001b[A");
    expect(text()).toContain("→ Changelog");
    dialog.handleInput("\u001b[B");
    expect(text()).toContain("→ Agent");
    dialog.handleInput("\u007f"); dialog.handleInput("SET");
    dialog.handleInput("\u001b[A"); dialog.handleInput("\u001b[B");
    dialog.handleInput("\r");
    expect(select).toHaveBeenCalledExactlyOnceWith("settings");
  });
  it("renders all applications with searchable compact-selector chrome", () => {
    const { dialog, text } = fixture();
    expect(text()).toContain("Launcher");
    expect(text()).not.toContain("Apps");
    expect(text()).not.toContain("Open an application");
    const rows = dialog.render(60).map(stripAnsi);
    expect(rows.findIndex(row => row.includes("> "))).toBe(rows.findIndex(row => row.includes("Launcher")) + 2);
    expect(text()).toContain("→ Agent");
    expect(text()).toContain("Settings");
    expect(text()).toContain("Changelog");
    expect(text()).toContain("Hotkeys");
    expect(text()).toContain("Type search  ↑↓ navigate  Enter open  Esc close");
    for (const width of [12, 24, 60]) expect(dialog.render(width).every(row => displayWidth(row) === width)).toBe(true);
  });

  it.each([4, 6, 8, 12])("keeps Launcher, input, selected choice, and close guidance in %i rows", height => {
    const { dialog, text } = fixture(height);
    expect(dialog.render(60).length).toBeLessThanOrEqual(height);
    expect(text()).toContain("Launcher");
    expect(text()).toContain("> ");
    expect(text()).toContain("→ Agent");
    expect(text()).toContain("Esc close");
  });

  it.each([["SET", "settings"], ["change", "changelog"], ["agent", "agent"], ["HOT", "hotkeys"]])("filters %s case-insensitively and opens %s", (query, id) => {
    const { dialog, select, text } = fixture();
    dialog.handleInput(query);
    expect(text()).toContain(`> ${query}`);
    dialog.handleInput("\r");
    expect(select).toHaveBeenCalledExactlyOnceWith(id);
  });

  it("navigates matching choices and cancels without selecting", () => {
    const { dialog, select, cancel } = fixture();
    dialog.handleInput("\u001b[B");
    dialog.handleInput("\r");
    expect(select).toHaveBeenLastCalledWith("settings");
    dialog.handleInput("\u001b");
    expect(cancel).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledOnce();
  });

  it("cannot open a no-match row and recovers after query deletion", () => {
    const { dialog, select, text } = fixture();
    dialog.handleInput("zzz");
    expect(text()).toContain("No apps found");
    dialog.handleInput("\u001b[A"); dialog.handleInput("\u001b[B");
    dialog.handleInput("\r");
    expect(select).not.toHaveBeenCalled();
    for (let index = 0; index < 3; index++) dialog.handleInput("\u007f");
    dialog.handleInput("\r");
    expect(select).toHaveBeenCalledWith("agent");
  });
});
