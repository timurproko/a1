/**
 * Provenance: @earendil-works/pi-coding-agent 1.5.1 (MIT), commit dd30101cfc5b0609411dd80b6f93adbc14db14cf,
 * packages/coding-agent/src/modes/interactive/components/skill-invocation-message.ts.
 * Modifications: Mechanical port uses A1's public pi-tui instance, owned theme boundary, and
 * root-instance keybinding registry because the public coding-agent component closes over a second
 * nested pi-tui singleton and cannot observe A1's keybindings.
 * Deviations: none.
 */
<<<<<<< a1
import { Box, Container, getKeybindings, Markdown, MouseRegion, Text, type MarkdownTheme } from "@earendil-works/pi-tui";
import { piTheme } from "../theme/theme.js";
||||||| pi 1.5.0
import { Box, Container, Markdown, type MarkdownTheme, MouseRegion, Text } from "@earendil-works/pi-tui";
import type { ParsedSkillBlock } from "../../../core/agent-session.ts";
import { getMarkdownTheme, theme } from "../theme/theme.ts";
import { keyText } from "./keybinding-hints.ts";
=======
import { Box, Container, Markdown, type MarkdownTheme, MouseRegion, Text } from "@earendil-works/pi-tui";
import type { ParsedSkillBlock } from "../../../core/agent-session.ts";
import type { MarkdownTransformer } from "../../../core/extensions/types.ts";
import { getMarkdownTheme, theme } from "../theme/theme.ts";
import { keyText } from "./keybinding-hints.ts";
import { createMarkdownTransform } from "./markdown-transform.ts";
>>>>>>> pi 1.5.1

<<<<<<< a1
export interface SkillInvocationBlock {
  readonly name: string;
  readonly content: string;
}
||||||| pi 1.5.0
/**
 * Component that renders a skill invocation message with collapsed/expanded state.
 * Uses same background color as custom messages for visual consistency.
 * Only renders the skill block itself - user message is rendered separately.
 */
export class SkillInvocationMessageComponent extends Box {
	private expanded = false;
	private skillBlock: ParsedSkillBlock;
	private markdownTheme: MarkdownTheme;

	constructor(skillBlock: ParsedSkillBlock, markdownTheme: MarkdownTheme = getMarkdownTheme(), outputPad = 1) {
		super(outputPad, 1, (t) => theme.bg("customMessageBg", t));
		this.skillBlock = skillBlock;
		this.markdownTheme = markdownTheme;
		this.updateDisplay();
	}

	setExpanded(expanded: boolean): void {
		this.expanded = expanded;
		this.updateDisplay();
	}

	setOutputPad(outputPad: number): void {
		this.setPaddingX(outputPad);
	}

	override invalidate(): void {
		super.invalidate();
		this.updateDisplay();
	}

	private updateDisplay(): void {
		this.clear();
		const content = new Container();

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
=======
/**
 * Component that renders a skill invocation message with collapsed/expanded state.
 * Uses same background color as custom messages for visual consistency.
 * Only renders the skill block itself - user message is rendered separately.
 */
export class SkillInvocationMessageComponent extends Box {
	private expanded = false;
	private skillBlock: ParsedSkillBlock;
	private markdownTheme: MarkdownTheme;
	private markdownTransformers: readonly MarkdownTransformer[];
	private messageId?: string;
	private timestamp?: string;

	constructor(
		skillBlock: ParsedSkillBlock,
		markdownTheme: MarkdownTheme = getMarkdownTheme(),
		outputPad = 1,
		markdownTransformers: readonly MarkdownTransformer[] = [],
		messageId?: string,
		timestamp?: string,
	) {
		super(outputPad, 1, (t) => theme.bg("customMessageBg", t));
		this.skillBlock = skillBlock;
		this.markdownTheme = markdownTheme;
		this.markdownTransformers = markdownTransformers;
		this.messageId = messageId;
		this.timestamp = timestamp;
		this.updateDisplay();
	}

	setExpanded(expanded: boolean): void {
		this.expanded = expanded;
		this.updateDisplay();
	}

	setOutputPad(outputPad: number): void {
		this.setPaddingX(outputPad);
	}

	override invalidate(): void {
		super.invalidate();
		this.updateDisplay();
	}

	private updateDisplay(): void {
		this.clear();
		const content = new Container();

		if (this.expanded) {
			// Expanded: label + skill name header + full content
			const label = theme.fg("customMessageLabel", `\x1b[1m[skill]\x1b[22m`);
			content.addChild(new Text(label, 0, 0));
			const header = `**${this.skillBlock.name}**\n\n`;
			const transform = createMarkdownTransform(
				"custom",
				() => false,
				this.markdownTransformers,
				this.messageId,
				this.timestamp,
			);
			content.addChild(
				new Markdown(
					this.skillBlock.content,
					0,
					0,
					this.markdownTheme,
					{ color: (text: string) => theme.fg("customMessageText", text) },
					// Transformers see only the skill content, not Pi's header.
					{ transform: (markdown, width) => header + transform(markdown, width) },
				),
			);
		} else {
			// Collapsed: single line - [skill] name (hint to expand)
			const line =
				theme.fg("customMessageLabel", `\x1b[1m[skill]\x1b[22m `) +
				theme.fg("customMessageText", this.skillBlock.name) +
				theme.fg("dim", ` (${keyText("app.tools.expand")} to expand)`);
			content.addChild(new Text(line, 0, 0));
		}
>>>>>>> pi 1.5.1

export class SkillInvocationMessageComponent extends Box {
  #expanded = false;

  private readonly skillBlock: SkillInvocationBlock;
  private readonly markdownTheme: MarkdownTheme;
  constructor(
    skillBlock: SkillInvocationBlock,
    markdownTheme: MarkdownTheme,
    outputPad = 1,
  ) {
    super(outputPad, 1, text => piTheme().bg("customMessageBg", text));
    this.skillBlock = skillBlock;
    this.markdownTheme = markdownTheme;
    this.#updateDisplay();
  }

  setExpanded(expanded: boolean): void {
    this.#expanded = expanded;
    this.#updateDisplay();
  }

  setOutputPad(outputPad: number): void {
    this.setPaddingX(outputPad);
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
