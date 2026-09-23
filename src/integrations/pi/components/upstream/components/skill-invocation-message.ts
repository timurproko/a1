/**
 * Provenance: @earendil-works/pi-coding-agent 0.87.1 (MIT), commit f07218c4d4bbc12bef056a7058c3dd49dfe41abe,
 * packages/coding-agent/src/modes/interactive/components/skill-invocation-message.ts.
 * Modifications: Mechanical port uses A1's public pi-tui instance, owned theme boundary, and
 * root-instance keybinding registry because the public coding-agent component closes over a second
 * nested pi-tui singleton and cannot observe A1's keybindings.
 * Deviations: none.
 */
import { Box, Container, getKeybindings, Markdown, MouseRegion, Text, type MarkdownTheme } from "@earendil-works/pi-tui";
import { piTheme } from "../theme/theme.js";

export interface SkillInvocationBlock {
  readonly name: string;
  readonly content: string;
}

export class SkillInvocationMessageComponent extends Box {
  #expanded = false;

  private readonly skillBlock: SkillInvocationBlock;
  private readonly markdownTheme: MarkdownTheme;
  constructor(
    skillBlock: SkillInvocationBlock,
    markdownTheme: MarkdownTheme,
  ) {
    super(1, 1, text => piTheme().bg("customMessageBg", text));
    this.skillBlock = skillBlock;
    this.markdownTheme = markdownTheme;
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
    const content = new Container();
    if (this.#expanded) {
      const label = piTheme().fg("customMessageLabel", "\x1b[1m[skill]\x1b[22m");
      content.addChild(new Text(label, 0, 0));
      const header = `**${this.skillBlock.name}**\n\n`;
      content.addChild(new Markdown(header + this.skillBlock.content, 0, 0, this.markdownTheme, {
        color: text => piTheme().fg("customMessageText", text),
      }));
    } else {
      const expandKey = getKeybindings().getKeys("app.tools.expand")[0] ?? "";
      const line = piTheme().fg("customMessageLabel", "\x1b[1m[skill]\x1b[22m ")
        + piTheme().fg("customMessageText", this.skillBlock.name)
        + piTheme().fg("dim", ` (${expandKey} to expand)`);
      content.addChild(new Text(line, 0, 0));
    }

    this.addChild(new MouseRegion(content, event => {
      if (event.type !== "click" || event.button !== "left") return undefined;
      this.setExpanded(!this.#expanded);
      return { handled: true };
    }));
  }
}
