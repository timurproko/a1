/**
 * Provenance: @earendil-works/pi-coding-agent 0.87.0 (MIT), commit 16787ad5b2dc748047f314ca1bfe7708f30f54f3,
 * packages/coding-agent/src/modes/interactive/components/thinking-selector.ts.
 * Modifications: Preserve the searchable thinking-level selector, current/default semantics,
 * selection, save, cancellation, and focus while accepting the active bare-A1 cycle-key label from the
 * shell, styling the title with the established bold semantic accent treatment, placing its muted hint
 * directly below it, deduplicating levels, and rendering aligned muted descriptions after an adjacent
 * success-colored active marker. All list and border colors use the owned theme and its explicit color
 * mode, and the footer uses the shared bare-A1 modal shortcut row. The comparison profile retains the
 * public pinned component.
 * Deviations: owned-modal-shortcut-hints, owned-level-cycle-shortcut, owned-thinking-selector-heading.
 */
import {
	Container,
	type Focusable,
	fuzzyFilter,
	getKeybindings,
	Input,
	type SelectItem,
	SelectList,
	type SelectListLayoutOptions,
	Spacer,
	Text,
} from "@earendil-works/pi-tui";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { piTheme, renderPiModalShortcutHints } from "../../theme.js";

export type ThinkingSelectorLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

const THINKING_SELECT_LIST_LAYOUT: SelectListLayoutOptions = {
	minPrimaryColumnWidth: 12,
	maxPrimaryColumnWidth: 32,
};

const LEVEL_DESCRIPTIONS: Record<ThinkingSelectorLevel, string> = {
	off: "No reasoning",
	minimal: "Very brief reasoning (~1k tokens)",
	low: "Light reasoning (~2k tokens)",
	medium: "Moderate reasoning (~8k tokens)",
	high: "Deep reasoning (~16k tokens)",
	xhigh: "Extra-high reasoning (~32k tokens)",
	max: "Maximum reasoning",
};

/** Bare-A1 thinking-level selector with profile-resolved shortcut presentation. */
export class OwnedThinkingSelectorComponent extends Container implements Focusable {
	private searchInput: Input;
	private selectList: SelectList;
	private selectListChildIndex: number;
	private allItems: SelectItem[];
	private onSelect: (level: ThinkingSelectorLevel) => void;
	private onCancel: () => void;
	private onSelectAsDefault: ((level: ThinkingSelectorLevel) => void) | undefined;
	private currentLevel: ThinkingSelectorLevel;
	private _focused = false;

	get focused(): boolean {
		return this._focused;
	}

	set focused(value: boolean) {
		this._focused = value;
		this.searchInput.focused = value;
	}

	constructor(
		currentLevel: ThinkingSelectorLevel,
		availableLevels: ThinkingSelectorLevel[],
		onSelect: (level: ThinkingSelectorLevel) => void,
		onCancel: () => void,
		cycleKeyDisplay: string,
		onSelectAsDefault?: (level: ThinkingSelectorLevel) => void,
		defaultThinkingLevel?: ThinkingSelectorLevel,
	) {
		super();
		this.onSelect = onSelect;
		this.onCancel = onCancel;
		this.onSelectAsDefault = onSelectAsDefault;
		this.currentLevel = currentLevel;

		this.allItems = [...new Set(availableLevels)].map((level) => ({
			value: level,
			label: level,
			description:
				level === defaultThinkingLevel ? `${LEVEL_DESCRIPTIONS[level]} · default` : LEVEL_DESCRIPTIONS[level],
		}));

		this.addChild(new DynamicBorder((text: string) => piTheme().fg("border", text)));
		this.addChild(new Spacer(1));
		this.addChild(new Text(piTheme().fg("accent", piTheme().bold("Thinking Level")), 0, 0));
		this.addChild(new Text(piTheme().fg("muted", `${cycleKeyDisplay} cycles thinking levels in-session`), 0, 0));
		this.addChild(new Spacer(1));

		this.searchInput = new Input();
		this.searchInput.onSubmit = () => this.selectList.handleInput("\r");
		this.addChild(this.searchInput);
		this.addChild(new Spacer(1));

		this.selectList = this.buildSelectList(this.allItems, currentLevel);
		this.selectListChildIndex = this.children.length;
		this.addChild(this.selectList);
		this.addChild(new Spacer(1));
		this.addChild(new Text(renderPiModalShortcutHints([
			{ key: this.keyDisplayText("tui.select.confirm"), action: "to select" },
			{ key: this.keyDisplayText("app.thinking.save"), action: "to set as default" },
			{ key: this.keyDisplayText("tui.select.cancel"), action: "to cancel" },
		], 2), 0, 0));
		this.addChild(new DynamicBorder((text: string) => piTheme().fg("border", text)));
	}

	private keyDisplayText(keybinding: Parameters<ReturnType<typeof getKeybindings>["getKeys"]>[0]): string {
		return getKeybindings().getKeys(keybinding)
			.map((key) => key.split("+").map((part) => {
				const display = process.platform === "darwin" && part.toLowerCase() === "alt" ? "option" : part;
				return display.charAt(0).toUpperCase() + display.slice(1);
			}).join("+"))
			.join("/");
	}

	private buildSelectList(items: SelectItem[], preselect?: ThinkingSelectorLevel): SelectList {
		const primaryWidth = this.allItems.reduce((widest, item) => {
			const level = item.label ?? item.value;
			return Math.max(widest, level.length + (item.value === this.currentLevel ? 2 : 0));
		}, 0);
		const themedItems = items.map((item) => {
			const level = item.label ?? item.value;
			const current = item.value === this.currentLevel;
			const currentMarker = current ? ` ${piTheme().fg("success", "✓")}` : "";
			const separator = " ".repeat(Math.max(1, primaryWidth - level.length - (current ? 2 : 0) + 1));
			const description = item.description ? piTheme().fg("muted", item.description) : "";
			return { value: item.value, label: `${level}${currentMarker}${separator}${description}` };
		});
		// Invariant: the bare selector uses the owned theme's explicit color mode, not upstream's host detection.
		const list = new SelectList(themedItems, Math.max(1, themedItems.length), {
			selectedPrefix: text => piTheme().fg("accent", text),
			selectedText: text => piTheme().fg("accent", text),
			description: text => piTheme().fg("muted", text),
			scrollInfo: text => piTheme().fg("muted", text),
			noMatch: text => piTheme().fg("muted", text),
		}, THINKING_SELECT_LIST_LAYOUT);
		const currentIndex = themedItems.findIndex((item) => item.value === preselect);
		if (currentIndex !== -1) list.setSelectedIndex(currentIndex);
		list.onSelect = (item) => this.onSelect(item.value as ThinkingSelectorLevel);
		list.onCancel = () => this.onCancel();
		return list;
	}

	private applyFilter(query: string): void {
		const filtered = query
			? fuzzyFilter(this.allItems, query, (item) => `${item.value} ${item.description ?? ""}`)
			: this.allItems;
		const selectedValue = this.selectList.getSelectedItem()?.value as ThinkingSelectorLevel | undefined;
		const newList = this.buildSelectList(filtered, selectedValue);
		this.children[this.selectListChildIndex] = newList;
		this.selectList = newList;
	}

	handleInput(keyData: string): void {
		const kb = getKeybindings();
		if (kb.matches(keyData, "app.thinking.save") && this.onSelectAsDefault) {
			const item = this.selectList.getSelectedItem();
			if (item) this.onSelectAsDefault(item.value as ThinkingSelectorLevel);
			return;
		}

		const isNav =
			kb.matches(keyData, "tui.select.up") ||
			kb.matches(keyData, "tui.select.down") ||
			kb.matches(keyData, "tui.select.confirm") ||
			kb.matches(keyData, "tui.select.cancel");
		if (isNav) {
			this.selectList.handleInput(keyData);
			return;
		}

		this.searchInput.handleInput(keyData);
		this.applyFilter(this.searchInput.getValue());
	}

	getSelectList(): SelectList {
		return this.selectList;
	}
}
