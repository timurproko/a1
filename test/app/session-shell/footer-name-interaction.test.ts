import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import { piTheme } from "../../../src/integrations/pi/components/index.js";
import { cellBackgroundAt } from "../../support/ansi-cell-style.js";
import { screenshotPng } from "../../fixtures/image-sources.js";
import { fixture, nextImmediate } from "./session-shell-fixture.js";

async function namedFixture(name = "alpha project", bare = true, clipboard?: Parameters<typeof fixture>[4]) {
  const value = await fixture([], [], bare, undefined, clipboard, undefined, undefined, undefined, undefined,
    engine => { engine.session.name = name; });
  if (bare) await vi.waitFor(() => expect(value.shell.root.chrome.footerName).toBeDefined());
  return value;
}

function clickName(value: Awaited<ReturnType<typeof fixture>>, side: "left" | "right" = "left") {
  value.shell.runtime.renderNow();
  const region = value.shell.root.chrome.footerName?.region()!;
  expect(region).toBeDefined();
  const column = side === "left" ? region.columnStart : region.columnEnd;
  value.terminal.input(`\x1b[<0;${column};${region.rowStart}M\x1b[<0;${column};${region.rowStart}m`);
}

describe("direct footer name editing", () => {
  it("hovers only the name text without adding spaces or moving neighboring text", async () => {
    const value = await namedFixture();
    try {
      value.terminal.resize(100, 24);
      value.shell.runtime.renderNow();
      const region = value.shell.root.chrome.footerName?.region()!;
      const original = value.shell.root.render(100)[region.rowStart - 1]!;
      const plain = stripTerminalSequences(original);
      expect(plain.slice(region.columnStart - 1, region.columnEnd)).toBe("alpha project");
      const expected = cellBackgroundAt(piTheme().bg("selectedBg", "x"), 0);
      for (const column of [region.columnStart, region.columnEnd]) {
        value.terminal.input(`\x1b[<35;${column};${region.rowStart}M`);
        const hovered = value.shell.root.render(100)[region.rowStart - 1]!;
        expect(stripTerminalSequences(hovered)).toBe(plain);
        for (let col = region.columnStart; col <= region.columnEnd; col++) expect(cellBackgroundAt(hovered, col - 1)).toBe(expected);
        expect(cellBackgroundAt(hovered, region.columnStart - 2)).toBe(cellBackgroundAt(original, region.columnStart - 2));
        expect(cellBackgroundAt(hovered, region.columnEnd)).toBe(cellBackgroundAt(original, region.columnEnd));
      }
      value.terminal.input(`\x1b[<35;${region.columnEnd + 1};${region.rowStart}M`);
      expect(value.shell.root.render(100)[region.rowStart - 1]).toBe(original);
    } finally { await value.shell.dispose(); }
  });

  it.each(["left", "right"] as const)("opens directly from the %s text edge and retains the prompt", async side => {
    const value = await namedFixture();
    try {
      value.shell.root.editor.setText("an unfinished prompt");
      clickName(value, side);
      expect(value.shell.readiness().overlayOpen).toBe(false);
      expect(value.shell.root.usesDefaultInputSurface()).toBe(false);
      expect(stripTerminalSequences(value.shell.root.render(80).join("\n"))).toContain("alpha project");
      expect(stripTerminalSequences(value.terminal.writes.join(""))).not.toContain(" Edit ");
      value.terminal.input("New Name");
      value.terminal.input("\r");
      await vi.waitFor(() => expect(value.engine.session.name).toBe("new name"));
      expect(value.shell.root.editor.getText()).toBe("an unfinished prompt");
      expect(value.engine.session.promptOptions).toHaveLength(0);
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
      clickName(value);
      expect(value.shell.root.usesDefaultInputSurface()).toBe(false);
      value.terminal.input("Updated");
      if (save) value.terminal.input("\r");
      else clickName(value);
      await vi.waitFor(() => expect(value.shell.root.usesDefaultInputSurface()).toBe(true));
      expect(value.engine.session.name).toBe(save ? "updated" : "attached draft");
      expect(value.shell.root.editor.getText()).toBe(draft);
      expect(value.shell.root.promptChips.prepareSubmission(draft).images).toEqual(attachments);
      expect(value.engine.session.promptOptions).toHaveLength(0);
    } finally { await value.shell.dispose(); }
  });

  it("supports word and whole-name repeated clicks through the real shell route", async () => {
    const copied: string[] = [];
    const value = await namedFixture("alpha project", true, { readText: async () => null, writeText: async text => { copied.push(text); } });
    try {
      value.shell.root.editor.setText("retained draft");
      clickName(value);
      value.shell.runtime.renderNow();
      const rows = value.shell.root.render(80).map(stripTerminalSequences);
      const row = rows.findIndex(line => line.trimStart().startsWith(">")) + 1;
      const column = rows[row - 1]!.indexOf("project") + 1;
      const click = () => value.terminal.input(`\x1b[<0;${column};${row}M\x1b[<0;${column};${row}m`);
      click(); click();
      value.terminal.input("\x03");
      await vi.waitFor(() => expect(copied).toEqual(["project"]));
      value.shell.runtime.renderNow();
      click(); click(); click();
      value.terminal.input("\x03");
      await vi.waitFor(() => expect(copied).toEqual(["project", "alpha project"]));
      value.terminal.input("\x1b");
      expect(value.shell.root.editor.getText()).toBe("retained draft");
    } finally { await value.shell.dispose(); }
  });

  it("does not open a menu on right-click or edit neighboring metadata", async () => {
    const value = await namedFixture();
    try {
      value.shell.root.editor.setText("retained");
      value.shell.runtime.renderNow();
      const region = value.shell.root.chrome.footerName?.region()!;
      value.terminal.input(`\x1b[<2;${region.columnStart};${region.rowStart}M\x1b[<2;${region.columnStart};${region.rowStart}m`);
      expect(value.shell.readiness().overlayOpen).toBe(false);
      expect(value.shell.root.usesDefaultInputSurface()).toBe(true);
      value.terminal.input(`\x1b[<0;${region.columnEnd + 1};${region.rowStart}M\x1b[<0;${region.columnEnd + 1};${region.rowStart}m`);
      expect(value.shell.root.usesDefaultInputSurface()).toBe(true);
      clickName(value);
      value.terminal.input("discarded");
      value.terminal.input("\x1b");
      await nextImmediate();
      expect(value.engine.session.name).toBe("alpha project");
      expect(value.shell.root.editor.getText()).toBe("retained");
    } finally { await value.shell.dispose(); }
  });

  it("tracks clipped and resized targets", async () => {
    const value = await namedFixture("a long session name that must be clipped");
    try {
      for (const [columns, rows] of [[36, 14], [28, 10], [100, 30]]) {
        value.terminal.resize(columns!, rows!);
        value.shell.runtime.renderNow();
        const region = value.shell.root.chrome.footerName?.region();
        if (region === undefined) continue;
        expect(region.columnEnd).toBeLessThan(columns!);
        expect(region.rowStart).toBeLessThanOrEqual(rows!);
        clickName(value);
        expect(value.shell.root.usesDefaultInputSurface()).toBe(false);
        value.terminal.input("\x1b");
      }
    } finally { await value.shell.dispose(); }
  });

  it.each(["models", "thinking"] as const)("opens %s from its text-only footer control without losing the draft", async command => {
    const value = await namedFixture();
    try {
      value.shell.root.editor.setText("unsent selected prompt");
      value.terminal.input("\x01");
      expect(value.shell.root.editor.hasSelection()).toBe(true);
      value.shell.runtime.renderNow();
      const region = value.shell.root.chrome.footerName?.region(command)!;
      expect(region).toBeDefined();
      value.terminal.input(`\x1b[<35;${region.columnStart};${region.rowStart}M`);
      const row = value.shell.root.render(80)[region.rowStart - 1]!;
      const expected = cellBackgroundAt(piTheme().bg("selectedBg", "x"), 0);
      for (let column = region.columnStart; column <= region.columnEnd; column++) expect(cellBackgroundAt(row, column - 1)).toBe(expected);
      value.terminal.input(`\x1b[<0;${region.columnEnd};${region.rowStart}M\x1b[<0;${region.columnEnd};${region.rowStart}m`);
      await vi.waitFor(() => expect(value.shell.root.usesDefaultInputSurface()).toBe(false));
      await vi.waitFor(() => expect(stripTerminalSequences(value.shell.root.render(80).join("\n"))).toContain(command === "models" ? "Models" : "Thinking Level"));
      expect(value.shell.root.editor.getText()).toBe("unsent selected prompt");
      value.terminal.input("\x1b");
      await vi.waitFor(() => expect(value.shell.root.usesDefaultInputSurface()).toBe(true));
      expect(value.shell.root.editor.getText()).toBe("unsent selected prompt");
      expect(value.shell.root.editor.hasSelection()).toBe(true);
      expect(value.engine.session.promptOptions).toHaveLength(0);
    } finally { await value.shell.dispose(); }
  });

  it.each(["name", "models", "thinking"] as const)("keeps %s hover active and toggles its dialog through Escape", async command => {
    const value = await namedFixture();
    try {
      value.shell.root.editor.setText("retained selected draft");
      value.terminal.input("\x01");
      const initialName = value.engine.session.name;
      const initialModel = value.engine.session.model;
      const initialLevel = value.engine.session.thinkingLevel;
      const click = () => {
        value.shell.runtime.renderNow();
        const region = value.shell.root.chrome.footerName?.region(command)!;
        expect(region).toBeDefined();
        value.terminal.input(`\x1b[<0;${region.columnStart};${region.rowStart}M\x1b[<0;${region.columnStart};${region.rowStart}m`);
      };
      for (const via of ["footer", "command"]) {
        if (via === "footer") click();
        else await value.shell.runWorkflow({ command, argument: "" });
        await vi.waitFor(() => expect(value.shell.root.usesDefaultInputSurface()).toBe(false));
        await vi.waitFor(() => expect(stripTerminalSequences(value.shell.root.render(80).join("\n")))
          .toContain(command === "name" ? "Session Name" : command === "models" ? "Models" : "Thinking Level"));
        if (via === "footer") {
          const opened = value.shell.root.chrome.footerName?.region(command)!;
          expect(cellBackgroundAt(value.shell.root.render(80)[opened.rowStart - 1]!, opened.columnStart - 1))
            .toBe(cellBackgroundAt(piTheme().bg("selectedBg", "x"), 0));
        }
        value.shell.root.handleInput(command === "name" ? "unsaved name" : command === "models" ? "gpt" : "low");
        value.shell.runtime.renderNow();
        const region = value.shell.root.chrome.footerName?.region(command)!;
        value.terminal.input(`\x1b[<35;${region.columnStart};${region.rowStart}M`);
        const row = value.shell.root.render(80)[region.rowStart - 1]!;
        expect(cellBackgroundAt(row, region.columnStart - 1)).toBe(cellBackgroundAt(piTheme().bg("selectedBg", "x"), 0));
        click();
        await vi.waitFor(() => expect(value.shell.root.usesDefaultInputSurface()).toBe(true));
        expect(value.engine.session.name).toBe(initialName);
        expect(value.engine.session.model).toBe(initialModel);
        expect(value.engine.session.thinkingLevel).toBe(initialLevel);
        expect(value.shell.root.editor.getText()).toBe("retained selected draft");
        expect(value.shell.root.editor.hasSelection()).toBe(true);
        expect(value.engine.session.promptOptions).toHaveLength(0);
      }
    } finally { await value.shell.dispose(); }
  });

  it("blocks background footer actions through a floating overlay", async () => {
    const value = await namedFixture();
    try {
      value.shell.root.editor.setText("retained draft");
      value.shell.runtime.renderNow();
      const region = value.shell.root.chrome.footerName?.region("name")!;
      value.shell.showSelector("Overlay", [{ id: "one", label: "One" }], () => {});
      value.shell.runtime.renderNow();
      value.terminal.input(`\x1b[<0;${region.columnStart};${region.rowStart}M\x1b[<0;${region.columnStart};${region.rowStart}m`);
      expect(value.shell.readiness().overlayOpen).toBe(true);
      expect(value.shell.root.usesDefaultInputSurface()).toBe(true);
      expect(value.shell.root.editor.getText()).toBe("retained draft");
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
