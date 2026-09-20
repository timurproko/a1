/**
 * Provenance: @earendil-works/pi-coding-agent 0.86.0 (MIT), commit ecac0a9c4edad3dac5d9f8b40e0c7db7a56471fc,
 * packages/coding-agent/src/modes/interactive/components/skill-invocation-message.ts.
 * Modifications: Mechanical port uses A1's public pi-tui instance, owned theme boundary, and
 * root-instance keybinding registry because the public coding-agent component closes over a second
 * nested pi-tui singleton and cannot observe A1's keybindings.
 * Deviations: none.
 */
<<<<<<< a1
import { Box, getKeybindings, Markdown, Text, type MarkdownTheme } from "@earendil-works/pi-tui";
import { piTheme } from "../theme/theme.js";

export interface SkillInvocationBlock {
  readonly name: string;
  readonly content: string;
}
||||||| pi 0.85.1
import { Box, Markdown, type MarkdownTheme, Text } from "@earendil-works/pi-tui";
import type { ParsedSkillBlock } from "../../../core/agent-session.ts";
import { getMarkdownTheme, theme } from "../theme/theme.ts";
import { keyText } from "./keybinding-hints.ts";
=======
import { Box, Container, Markdown, type MarkdownTheme, MouseRegion, Text } from "@earendil-works/pi-tui";
import type { ParsedSkillBlock } from "../../../core/agent-session.ts";
import { getMarkdownTheme, theme } from "../theme/theme.ts";
import { keyText } from "./keybinding-hints.ts";
>>>>>>> pi 0.86.0

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

<<<<<<< a1
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
||||||| pi 0.85.1
	private updateDisplay(): void {
		this.clear();
=======
	private updateDisplay(): void {
		this.clear();
		const content = new Container();
>>>>>>> pi 0.86.0

<<<<<<< a1
    const expandKey = getKeybindings().getKeys("app.tools.expand")[0] ?? "";
    const line = piTheme().fg("customMessageLabel", "\x1b[1m[skill]\x1b[22m ")
      + piTheme().fg("customMessageText", this.skillBlock.name)
      + piTheme().fg("dim", ` (${expandKey} to expand)`);
    this.addChild(new Text(line, 0, 0));
  }
||||||| pi 0.85.1
		if (this.expanded) {
			// Expanded: label + skill name header + full content
			const label = theme.fg("customMessageLabel", `\x1b[1m[skill]\x1b[22m`);
			this.addChild(new Text(label, 0, 0));
			const header = `**${this.skillBlock.name}**\n\n`;
			this.addChild(
				new Markdown(header + this.skillBlock.content, 0, 0, this.markdownTheme, {
					color: (text: string) => theme.fg("customMessageText", text),
				}),
			);
		} else {
			// Collapsed: single line - [skill] name (hint to expand)
			const line =
				theme.fg("customMessageLabel", `\x1b[1m[skill]\x1b[22m `) +
				theme.fg("customMessageText", this.skillBlock.name) +
				theme.fg("dim", ` (${keyText("app.tools.expand")} to expand)`);
			this.addChild(new Text(line, 0, 0));
		}
	}
=======
		if (this.expanded) {
			// Expanded: label + skill name header + full content
			const label = theme.fg("customMessageLabel", `\x1b[1m[skill]\x1b[22m`);
			content.addChild(new Text(label, 0, 0));
			const header = `**${this.skillBlock.name}**\n\n`;
			content.addChild(
				new Markdown(header + this.skillBlock.content, 0, 0, this.markdownTheme, {
					color: (text: string) => theme.fg("customMessageText", text),
				}),
			);
		} else {
			// Collapsed: single line - [skill] name (hint to expand)
			const line =
				theme.fg("customMessageLabel", `\x1b[1m[skill]\x1b[22m `) +
				theme.fg("customMessageText", this.skillBlock.name) +
				theme.fg("dim", ` (${keyText("app.tools.expand")} to expand)`);
			content.addChild(new Text(line, 0, 0));
		}

		this.addChild(
			new MouseRegion(content, (event) => {
				if (event.type !== "click" || event.button !== "left") return undefined;
				this.setExpanded(!this.expanded);
				return { handled: true };
			}),
		);
	}
>>>>>>> pi 0.86.0
}
