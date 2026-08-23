// Mechanically adapted from Pi commit 914cf14
// packages/coding-agent/src/modes/interactive/components/custom-entry.ts (MIT).
// Local modifications: remap private imports to public package-root or owned theme boundaries.
import type { Component } from "#pi-tui";
import { Box, Container, Spacer, Text } from "#pi-tui";
import type { CustomEntry, EntryRenderer } from "@earendil-works/pi-coding-agent";
import { piTheme } from "../theme/theme.js";

/**
 * Component that renders a custom session entry from extensions.
 * The host owns transcript spacing; renderer output should provide only its content.
 */
export class CustomEntryComponent extends Container {
	private entry: CustomEntry<unknown>;
	private renderer: EntryRenderer;
	private customComponent: Component | undefined;
	private _expanded = false;

	constructor(entry: CustomEntry<unknown>, renderer: EntryRenderer) {
		super();
		this.entry = entry;
		this.renderer = renderer;
		this.rebuild();
	}

	hasContent(): boolean {
		return this.customComponent !== undefined;
	}

	setExpanded(expanded: boolean): void {
		if (this._expanded !== expanded) {
			this._expanded = expanded;
			this.rebuild();
		}
	}

	override invalidate(): void {
		super.invalidate();
		this.rebuild();
	}

	private rebuild(): void {
		this.clear();
		this.customComponent = undefined;

		let component: Component | undefined;
		try {
			component = this.renderer(this.entry, { expanded: this._expanded }, piTheme());
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const box = new Box(1, 1, (text) => piTheme().bg("customMessageBg", text));
			box.addChild(new Text(piTheme().fg("error", `[${this.entry.customType}] renderer failed: ${message}`), 0, 0));
			component = box;
		}

		if (!component) {
			return;
		}

		this.customComponent = component;
		this.addChild(new Spacer(1));
		this.addChild(component);
	}
}
