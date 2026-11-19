import { sliceByColumn, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import type { OwnedUiSessionViewModel } from "../../../../src/contracts/owned-ui/index.js";
import { applyPiTheme, applyPiThemeInstance, createPiShellFooter, currentPiAccentColor, piTheme, setPiAccentColor } from "../../../../src/integrations/pi/components/index.js";
import { paintPiStatusHover } from "../../../support/status-hover-paint.js";
import { cellBackgroundAt, cellInverseAt, cellStyle } from "../../../support/ansi-cell-style.js";
import { withPiParityColorMode } from "../../../support/pi-terminal-capabilities.js";

function view(): OwnedUiSessionViewModel {
  return {
    contractVersion: 1, sessionId: "hover", revision: 1, lifecycle: "ready", transcript: [],
    editor: { text: "", queuedSubmissions: [], selection: null, cursorOffset: 0, historyRevision: 0, submitEnabled: true },
    status: { title: "A1", workingMessage: null, diagnostics: [], badges: ["ready"], footer: {
      branch: "feature/hover", repositoryPath: "D:/work", sessionName: "ALPHA session", availableProviderCount: 2,
      pullRequest: { number: 977, url: "https://github.com/timurproko/a1/pull/977" }, extensionStatuses: [["status", "Extension status"]],
    } },
    terminal: { columns: 120, rows: 24, focusedRegion: "editor", hardwareCursor: false },
    activeModel: { providerId: "provider", modelId: "MODEL-6.1", displayName: "Model" }, thinkingLevel: "medium",
    activeCommandIds: [], dialog: null, overlay: null, customizations: [], diagnostics: [],
  };
}

const roles = { off: "thinkingOff", minimal: "thinkingMinimal", low: "thinkingLow", medium: "thinkingMedium", high: "thinkingHigh", xhigh: "thinkingXhigh" } as const;

describe("inverted status-bar hover", () => {
  it.each(["truecolor", "256color"] as const)("keeps every non-target cell unchanged and uses live semantic colors (%s)", mode => {
    withPiParityColorMode(mode, () => {
      const previous = piTheme(), accent = currentPiAccentColor();
      try {
        applyPiTheme("dark", false, mode);
        for (const color of ["blue", "pink"] as const) {
          setPiAccentColor(color);
          for (const level of Object.keys(roles) as (keyof typeof roles)[]) {
            const state = { ...view(), thinkingLevel: level };
            const footer = createPiShellFooter(state, "D:/work", "a1");
            for (const control of ["name", "models", "thinking"] as const) {
              footer.setFooterHovered?.(undefined);
              const rest = footer.render(120);
              const targets = footer.footerControlSpans!();
              const target = targets.find(span => span.command === control)!;
              expect(target).toBeDefined();
              footer.setFooterHovered?.(control);
              const hovered = footer.render(120);
              expect(footer.footerControlSpans!()).toEqual(targets);
              expect(hovered[0]).toBe(rest[0]);
              expect(hovered[2]).toBe(rest[2]);
              expect(hovered.map(stripTerminalSequences)).toEqual(rest.map(stripTerminalSequences));
              const line = hovered[target.row]!, original = rest[target.row]!;
              const plain = stripTerminalSequences(line);
              const role = control === "thinking" ? roles[level] : "dim";
              for (let column = 0; column < plain.length; column++) {
                const character = plain[column]!;
                const actual = cellStyle(sliceByColumn(line, column, 1), character);
                const inside = column >= target.column && column < target.column + target.width;
                const expected = inside
                  ? cellStyle(paintPiStatusHover(role, character), character)
                  : cellStyle(sliceByColumn(original, column, 1), character);
                expect(actual).toEqual(expected);
                expect(cellBackgroundAt(line, column)).toBe(cellBackgroundAt(original, column));
                expect(cellInverseAt(line, column)).toBe(inside);
              }
              expect(line).not.toMatch(/\u001b\[(?:48|4m)/u);
              footer.setFooterHovered?.(undefined);
              expect(footer.render(120)).toEqual(rest);
            }
            footer.dispose?.();
          }
        }
      } finally { setPiAccentColor(accent); applyPiThemeInstance(previous); }
    });
  });

  it("keeps clipped wide names and reveal frames within their original spans", () => {
    const state = view();
    const footer = createPiShellFooter({ ...state, status: { ...state.status, footer: { ...state.status.footer!, sessionName: "界 👩‍💻 é project name" } } }, "D:/work", "a1");
    try {
      for (const width of [20, 36, 80]) {
        footer.setFooterHovered?.(undefined);
        footer.setNameReveal?.({ from: "old name", elapsed: 650 });
        const rest = footer.render(width);
        const spans = footer.footerControlSpans!();
        footer.setFooterHovered?.("name");
        const hovered = footer.render(width);
        expect(hovered.map(stripTerminalSequences)).toEqual(rest.map(stripTerminalSequences));
        expect(hovered.every(row => visibleWidth(row) <= width)).toBe(true);
        expect(footer.footerControlSpans!()).toEqual(spans);
        footer.setFooterHovered?.(undefined);
        expect(footer.render(width)).toEqual(rest);
      }
    } finally { footer.dispose?.(); }
  });

  it("does not invent a hover target in comparison mode or for a suppressed level", () => {
    const state = view();
    const comparison = createPiShellFooter(state, "D:/work", "pi");
    const hiddenLevel = createPiShellFooter(state, "D:/work", "a1", () => false);
    try {
      const rest = comparison.render(100);
      for (const control of ["name", "models", "thinking"] as const) {
        comparison.setFooterHovered?.(control);
        expect(comparison.render(100)).toEqual(rest);
        expect(comparison.footerControlSpans!()).toEqual([]);
      }
      const hidden = hiddenLevel.render(100);
      hiddenLevel.setFooterHovered?.("thinking");
      expect(hiddenLevel.render(100)).toEqual(hidden);
      expect(hiddenLevel.footerControlSpans!().some(span => span.command === "thinking")).toBe(false);
    } finally { comparison.dispose?.(); hiddenLevel.dispose?.(); }
  });
});
