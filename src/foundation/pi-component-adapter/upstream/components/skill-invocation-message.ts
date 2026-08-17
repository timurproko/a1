/**
 * Source-synchronized from Pi 0.84.2
 * packages/coding-agent/src/modes/interactive/components/skill-invocation-message.ts
 *
 * Modified only to use AddOne's public pi-tui instance and owned theme boundary.
 */
import { Box, getKeybindings, Markdown, Text, type MarkdownTheme } from "@earendil-works/pi-tui";
import { piTheme } from "../theme/theme.js";

export interface SkillInvocationBlock {
  readonly name: string;
  readonly content: string;
}

export class SkillInvocationMessageComponent extends Box {
  #expanded = false;

  constructor(
    private readonly skillBlock: SkillInvocationBlock,
    private readonly markdownTheme: MarkdownTheme,
  ) {
    super(1, 1, text => piTheme().bg("customMessageBg", text));
    this.#updateDisplay();
  }

  setExpanded(expanded: boolean): void {
    this.#expanded = expanded;
    this.#updateDisplay();
  }

  override invalidate(): void {
    super.invalidate();
    this.#updateDisplay();
  }

  #updateDisplay(): void {
    this.clear();
    if (this.#expanded) {
      const label = piTheme().fg("customMessageLabel", "\x1b[1m[skill]\x1b[22m");
      this.addChild(new Text(label, 0, 0));
      const header = `**${this.skillBlock.name}**\n\n`;
      this.addChild(new Markdown(header + this.skillBlock.content, 0, 0, this.markdownTheme, {
        color: text => piTheme().fg("customMessageText", text),
      }));
      return;
    }

    const expandKey = getKeybindings().getKeys("app.tools.expand")[0] ?? "";
    const line = piTheme().fg("customMessageLabel", "\x1b[1m[skill]\x1b[22m ")
      + piTheme().fg("customMessageText", this.skillBlock.name)
      + piTheme().fg("dim", ` (${expandKey} to expand)`);
    this.addChild(new Text(line, 0, 0));
  }
}
