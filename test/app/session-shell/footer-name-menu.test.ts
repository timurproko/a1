import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import { screenshotPng } from "../../fixtures/image-sources.js";
import { piTheme } from "../../../src/integrations/pi/components/index.js";
import { cellBackgroundAt } from "../../support/ansi-cell-style.js";
import { fixture, nextImmediate } from "./session-shell-fixture.js";

async function namedFixture(name = "alpha project", bare = true) {
  const value = await fixture([], [], bare, undefined, undefined, undefined, undefined, undefined, undefined,
    engine => { engine.session.name = name; });
  if (bare) await vi.waitFor(() => expect(value.shell.root.chrome.footerName).toBeDefined());
  return value;
}

async function rightClick(value: Awaited<ReturnType<typeof fixture>>) {
  value.shell.runtime.renderNow();
  const region = value.shell.root.chrome.footerName?.region()!;
  expect(region).toBeDefined();
  value.terminal.input(`\x1b[<2;${region.columnStart};${region.rowStart}M\x1b[<2;${region.columnStart};${region.rowStart}m`);
  await vi.waitFor(() => expect(value.shell.readiness().overlayOpen).toBe(true));
  value.shell.runtime.renderNow();
  return region;
}

function clickEdit(value: Awaited<ReturnType<typeof fixture>>) {
  const region = value.shell.root.chrome.footerName?.region()!;
  const column = Math.min(region.columnStart + 1, value.terminal.columns - 4);
  value.terminal.input(`\x1b[<0;${column};${region.rowStart - 1}M\x1b[<0;${column};${region.rowStart - 1}m`);
}

describe("footer name context editing", () => {
  it("hovers only the rendered name and clears hover when leaving it", async () => {
    const value = await namedFixture();
    try {
      value.terminal.resize(100, 24);
      value.shell.runtime.renderNow();
      const region = value.shell.root.chrome.footerName?.region()!;
      const original = value.shell.root.render(100)[region.rowStart - 1]!;
      value.terminal.input(`\x1b[<35;${region.columnStart};${region.rowStart}M`);
      await vi.waitFor(() => expect(cellBackgroundAt(value.shell.root.render(100)[region.rowStart - 1]!, region.columnStart - 1))
        .toBe(cellBackgroundAt(piTheme().bg("selectedBg", "x"), 0)));
      const hovered = value.shell.root.render(100)[region.rowStart - 1]!;
      const selected = cellBackgroundAt(piTheme().bg("selectedBg", "x"), 0);
      for (let col = region.columnStart; col <= region.columnEnd; col++) expect(cellBackgroundAt(hovered, col - 1)).toBe(selected);
      expect(cellBackgroundAt(hovered, region.columnStart - 2)).toBe(cellBackgroundAt(original, region.columnStart - 2));
      expect(cellBackgroundAt(hovered, region.columnEnd)).toBe(cellBackgroundAt(original, region.columnEnd));
      value.terminal.input(`\x1b[<35;${region.columnEnd + 1};${region.rowStart}M`);
      expect(value.shell.root.render(100)[region.rowStart - 1]).toBe(original);
    } finally { await value.shell.dispose(); }
  });

  it("opens the prefilled dialog from Edit without submitting or losing the prompt", async () => {
    const value = await namedFixture();
    try {
      value.shell.root.editor.setText("an unfinished prompt");
      const region = await rightClick(value);
      expect(value.shell.readiness().overlayOpen).toBe(true);
      expect(stripTerminalSequences(value.terminal.writes.join(""))).toContain("Edit");
      expect(value.shell.root.usesDefaultInputSurface()).toBe(true);
      value.terminal.input(`\x1b[<35;${region.columnStart + 1};${region.rowStart - 1}M`);
      clickEdit(value);
      expect(value.shell.readiness().overlayOpen).toBe(false);
      expect(value.shell.root.usesDefaultInputSurface()).toBe(false);
      expect(stripTerminalSequences(value.shell.root.render(80).join("\n"))).toContain("> alpha project");
      expect(value.shell.root.editor.getText()).toBe("an unfinished prompt");
      value.terminal.input("\x01");
      value.terminal.input("New Name");
      value.terminal.input("\r");
      await nextImmediate();
      await vi.waitFor(() => expect(value.engine.session.name).toBe("new name"));
      expect(value.shell.root.usesDefaultInputSurface()).toBe(true);
      expect(value.shell.root.editor.getText()).toBe("an unfinished prompt");
      expect(value.engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([]);
    } finally { await value.shell.dispose(); }
  });

  it.each([false, true])("retains attached images and unsent text after naming, save=%s", async save => {
    const value = await fixture([], [], true, undefined, {
      readText: async () => null,
      readImage: async () => ({ data: screenshotPng(8, 8).toString("base64"), mimeType: "image/png" }),
    }, undefined, undefined, undefined, undefined, engine => { engine.session.name = "attached draft"; });
    try {
      value.terminal.input("\x16");
      await vi.waitFor(() => expect(value.shell.root.promptChips.prepareSubmission(value.shell.root.editor.getText()).images).toHaveLength(1));
      const draft = `${value.shell.root.editor.getText()} unfinished prompt`;
      value.shell.root.editor.setText(draft);
      const attachments = value.shell.root.promptChips.prepareSubmission(draft).images;
      await rightClick(value);
      clickEdit(value);
      expect(value.shell.root.usesDefaultInputSurface()).toBe(false);
      value.terminal.input("\x01");
      value.terminal.input("Updated");
      value.terminal.input(save ? "\r" : "\x1b");
      await nextImmediate();
      expect(value.engine.session.name).toBe(save ? "updated" : "attached draft");
      expect(value.shell.root.editor.getText()).toBe(draft);
      expect(value.shell.root.promptChips.prepareSubmission(draft).images).toEqual(attachments);
      expect(value.engine.session.promptOptions).toHaveLength(0);
    } finally { await value.shell.dispose(); }
  });

  it("supports keyboard choice and silent menu/dialog cancellation with a retained draft", async () => {
    const value = await namedFixture();
    try {
      value.shell.root.editor.setText("keep this draft");
      for (const cancel of ["\x1b", "\x03"]) {
        await rightClick(value);
        value.terminal.input(cancel);
        expect(value.shell.readiness().overlayOpen).toBe(false);
        expect(value.shell.root.editor.getText()).toBe("keep this draft");
      }
      await rightClick(value);
      value.terminal.input("\x1b[B");
      value.terminal.input("\r");
      expect(value.shell.root.usesDefaultInputSurface()).toBe(false);
      value.terminal.input("\x01");
      value.terminal.input("not saved");
      value.terminal.input("\x1b");
      await nextImmediate();
      expect(value.engine.session.name).toBe("alpha project");
      expect(value.shell.root.editor.getText()).toBe("keep this draft");
      expect(value.shell.root.usesDefaultInputSurface()).toBe(true);

      await rightClick(value);
      value.terminal.input("\x1b[<0;1;1M\x1b[<32;12;1M\x1b[<0;12;1m");
      expect(value.shell.readiness().overlayOpen).toBe(false);
      expect(value.shell.root.viewport.hasSelection).toBe(false);
      expect(value.shell.root.editor.getText()).toBe("keep this draft");
    } finally { await value.shell.dispose(); }
  });

  it("tracks clipped and resized name cells and does not target neighboring footer text", async () => {
    const value = await namedFixture("a long session name that must be clipped");
    try {
      value.terminal.resize(36, 14);
      value.shell.runtime.renderNow();
      let region = value.shell.root.chrome.footerName?.region()!;
      expect(region.columnEnd).toBeLessThan(36);
      expect(region.rowStart).toBeLessThanOrEqual(14);
      expect(region.columnEnd - region.columnStart + 1).toBeLessThan(39);
      value.terminal.input(`\x1b[<2;${region.columnEnd + 1};${region.rowStart}M\x1b[<2;${region.columnEnd + 1};${region.rowStart}m`);
      expect(value.shell.readiness().overlayOpen).toBe(false);
      await rightClick(value);
      value.terminal.resize(28, 10);
      value.shell.runtime.renderNow();
      region = value.shell.root.chrome.footerName?.region()!;
      clickEdit(value);
      expect(value.shell.root.usesDefaultInputSurface()).toBe(false);
      value.terminal.input("\x1b");
      await nextImmediate();
      value.terminal.resize(100, 30);
      value.shell.runtime.renderNow();
      expect(value.shell.root.chrome.footerName?.region()!.rowStart).toBeGreaterThan(region.rowStart);
    } finally { await value.shell.dispose(); }
  });

  it("has no name target for unnamed, comparison, or extension-replaced footers", async () => {
    for (const [name, bare] of [["", true], ["named", false]] as const) {
      const value = await namedFixture(name, bare);
      try {
        value.shell.runtime.renderNow();
        expect(value.shell.root.chrome.footerName?.region()).toBeUndefined();
      } finally { await value.shell.dispose(); }
    }
    const value = await namedFixture();
    try {
      value.shell.root.setExtensionFooter({ render: () => ["custom footer"], invalidate() {} });
      value.shell.runtime.renderNow();
      expect(value.shell.root.chrome.footerName?.region()).toBeUndefined();
    } finally { await value.shell.dispose(); }
  });
});
