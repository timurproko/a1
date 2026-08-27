import { getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Box, Markdown, type Component } from "#pi-tui";
import type { OwnedUiTranscriptBlock } from "../../../contracts/owned-ui/index.js";
import { piTheme } from "./theme.js";

export interface PiShellSubmittedPromptComposer {
  readonly layout: (width: number, source?: Date | number | null) => { readonly contentWidth: number };
  readonly compose: (
    contentRows: readonly string[],
    width: number,
    source?: Date | number | null,
    style?: {
      readonly prefix?: (text: string) => string;
      readonly timestamp?: (text: string) => string;
    },
  ) => readonly string[];
}

/** Pi owns Markdown and theme adaptation; the injected composer owns neutral row geometry. */
export function createPiSubmittedPromptComponent(
  block: OwnedUiTranscriptBlock,
  composer: PiShellSubmittedPromptComposer,
): Component {
  const timestamp = numericTimestamp(block);
  const markdown = new Markdown(
    block.text,
    0,
    0,
    getMarkdownTheme(),
    { color: content => piTheme().fg("userMessageText", content) },
    { preserveOrderedListMarkers: true, preserveBackslashEscapes: true },
  );
  const content: Component = {
    render(width: number): string[] {
      const layout = composer.layout(width, timestamp);
      return [...composer.compose(markdown.render(layout.contentWidth), width, timestamp, {
        prefix: text => piTheme().fg("muted", text),
        timestamp: text => piTheme().fg("dim", text),
      })];
    },
    invalidate: () => markdown.invalidate(),
  };
  const box = new Box(0, 0, line => piTheme().bg("userMessageBg", line));
  box.addChild(content);
  return box;
}

function numericTimestamp(block: OwnedUiTranscriptBlock): number | null {
  if (typeof block.payload !== "object" || block.payload === null) return null;
  const value = (block.payload as Record<string, unknown>).timestamp;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
