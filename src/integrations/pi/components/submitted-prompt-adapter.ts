import { Box, Markdown, Text, type Component } from "@earendil-works/pi-tui";
import type { OwnedUiTranscriptBlock, PromptChipWrapProtection } from "../../../contracts/owned-ui/index.js";
import { protectPiPromptChipPresentation } from "./prompt-chip-presentation.js";
import { getPiMarkdownTheme, piTheme } from "./theme.js";

export interface PiShellSubmittedPromptComposer {
  readonly layout: (width: number) => { readonly contentWidth: number };
  readonly compose: (
    contentRows: readonly string[],
    width: number,
    style?: { readonly prefix?: (text: string) => string },
  ) => readonly string[];
}

/** Branch summaries share the block kind but do not participate in prompt navigation. */
export function isPiPromptStyleCompaction(block: OwnedUiTranscriptBlock): boolean {
  return block.kind === "compaction" && block.status === "finalized"
    && typeof block.payload === "object" && block.payload !== null
    && (block.payload as Record<string, unknown>).role === "compactionSummary";
}

/** Pi owns Markdown and theme adaptation; the injected composer owns neutral row geometry. */
export function createPiSubmittedPromptComponent(
  block: OwnedUiTranscriptBlock,
  composer: PiShellSubmittedPromptComposer,
  heading?: string,
): Component {
  // Invariant: presentation-only chrome stays outside the summary's Markdown parser and stored text.
  const header = heading === undefined ? undefined : new Text(heading, 0, 0);
  let chipWrapping: PromptChipWrapProtection | undefined;
  const markdown = new Markdown(
    block.text,
    0,
    0,
    getPiMarkdownTheme(),
    { color: content => piTheme().fg("userMessageText", content) },
    {
      preserveOrderedListMarkers: true,
      preserveBackslashEscapes: true,
      ...(block.kind === "user" ? { transform: (text: string, width: number) => {
        const wrapping = protectPiPromptChipPresentation(text, width);
        chipWrapping = wrapping;
        return wrapping.text;
      } } : {}),
    },
  );
  const content: Component = {
    render(width: number): string[] {
      const layout = composer.layout(width);
      const renderedBodyRows = markdown.render(layout.contentWidth);
      const wrapping = chipWrapping;
      const bodyRows = wrapping === undefined ? renderedBodyRows : renderedBodyRows.map(row => wrapping.restore(row));
      const rows = header === undefined ? bodyRows : [
        ...header.render(layout.contentWidth).map(row => piTheme().fg("userMessageText", row)),
        ...(bodyRows.length === 0 ? [] : ["", ...bodyRows]),
      ];
      return [...composer.compose(rows, width, {
        prefix: text => piTheme().fg("muted", text),
      })];
    },
    invalidate() {
      header?.invalidate();
      markdown.invalidate();
    },
  };
  const box = new Box(0, 0, line => piTheme().bg("userMessageBg", line));
  box.addChild(content);
  return box;
}
