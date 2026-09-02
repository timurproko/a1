import { UserMessageComponent, getMarkdownTheme, initTheme } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import type { OwnedUiTranscriptBlock } from "../../../src/contracts/owned-ui/index.js";
import { applyPiTheme, createPiShellTranscriptComponent } from "../../../src/integrations/pi/components/index.js";
import { PRODUCT_TEXT } from "../../../src/product-identity.js";
import {
  assertIndependentRawTerminalParity,
  normalizeRawTerminalFrame,
  type RawTerminalFrame,
} from "./pi-raw-terminal-parity.js";
import {
  PI_PARITY_COLOR_MODES,
  withPiParityColorMode,
  type PiParityColorMode,
} from "../../support/pi-terminal-capabilities.js";

function pinnedUserFrame(width: number): RawTerminalFrame {
  initTheme("dark", false);
  const component = new UserMessageComponent("Inspect **styled** parity with [docs](https://example.com).", getMarkdownTheme(), 1);
  return { producer: "pinned-pi-0.84.2", surface: "user-transcript", width, rows: component.render(width) };
}

function ownedUserFrame(width: number, mode: PiParityColorMode): RawTerminalFrame {
  applyPiTheme("dark", false, mode);
  const block: OwnedUiTranscriptBlock = {
    id: "user-parity",
    kind: "user",
    status: "finalized",
    revision: 1,
    title: null,
    text: "Inspect **styled** parity with [docs](https://example.com).",
    payload: {},
  };
  return {
    producer: "owned-product",
    surface: "user-transcript",
    width,
    rows: createPiShellTranscriptComponent(block, "D:/owned-work").render(width),
  };
}

describe("independent raw terminal visual parity authority", () => {
  it.each(PI_PARITY_COLOR_MODES.flatMap(mode => [24, 40, 72].map(width => [mode, width] as const)))(
    "compares independently produced %s rows at %i columns",
    (mode, width) => withPiParityColorMode(mode, () => {
      expect(() => assertIndependentRawTerminalParity(pinnedUserFrame(width), ownedUserFrame(width, mode))).not.toThrow();
    }),
  );

  it.each(PI_PARITY_COLOR_MODES)("fails when %s semantic SGR styling is stripped", mode => {
    withPiParityColorMode(mode, () => {
      const pinned = pinnedUserFrame(40);
      const owned = ownedUserFrame(40, mode);
      const stripped: RawTerminalFrame = {
        ...owned,
        rows: owned.rows.map(row => row.replace(/\u001b\[[0-9;:]*m/g, "")),
      };
      expect(() => assertIndependentRawTerminalParity(pinned, stripped)).toThrow(/semantic ANSI/);
    });
  });

  it.each(PI_PARITY_COLOR_MODES)("rejects an owned-product %s golden frame as pinned authority", mode => {
    withPiParityColorMode(mode, () => {
      const owned = ownedUserFrame(40, mode);
      const diagnostic: RawTerminalFrame = { ...owned, producer: "owned-diagnostic" };
      expect(() => assertIndependentRawTerminalParity(diagnostic, owned)).toThrow(/independently produced/);
    });
  });

  it("preserves cursor, clearing, restoration, and post-stop control order", () => {
    const controls = ["\u001b[?25l", "\u001b[2J\u001b[H", "\u001b[?1049l", "styled parent write", "\u001b[?25h"];
    const pinned: RawTerminalFrame = { producer: "pinned-pi-0.84.2", surface: "fullscreen-exit", width: 80, rows: [], controls };
    const owned: RawTerminalFrame = { producer: "owned-product", surface: "fullscreen-exit", width: 80, rows: [], controls: [...controls] };
    expect(() => assertIndependentRawTerminalParity(pinned, owned)).not.toThrow();
    expect(() => assertIndependentRawTerminalParity(pinned, { ...owned, controls: [...controls].reverse() })).toThrow(/control ordering/);
  });

  it("normalizes only declared timing envelopes, links, product identity, and paths", () => {
    const normalized = normalizeRawTerminalFrame({
      producer: "owned-product",
      surface: "normalization",
      width: 80,
      rows: [`\u001b[?2026h\u001b[2mTo resume:\u001b[22m ${PRODUCT_TEXT.commandName} D:/owned/session \u001b]8;;file:///D:/owned/readme.md\u001b\\README\u001b]8;;\u001b\\\u001b[?2026l`],
    }, { productCommand: ["pi", PRODUCT_TEXT.commandName], absolutePaths: [["/pi/session", "D:/owned/session"]] });
    expect(normalized.rows[0]).toContain("\u001b[2m");
    expect(normalized.rows[0]).toContain("\u001b[22m");
    expect(normalized.rows[0]).toContain("\u001b]8;;<absolute-link-target>/readme.md\u001b\\");
    expect(normalized.rows[0]).not.toContain("2026");
  });
});
