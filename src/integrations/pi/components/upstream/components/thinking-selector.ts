/**
 * Provenance: @earendil-works/pi-coding-agent 1.1.0 (MIT), commit abe508e1b89912adde45528136c3221eb69acdd7,
 * packages/coding-agent/src/modes/interactive/components/thinking-selector.ts.
 * Modifications: Preserve the searchable thinking-level selector, current/default semantics,
 * selection, and focus while accepting the active bare-A1 cycle-key label from the shell, styling the
 * title with the established bold semantic accent treatment, placing it directly below the top rule
 * through the shared compact padded modal frame and its muted hint directly below it, deduplicating
 * levels, and rendering exclusive radio-style default markers before level names, an item-adjacent
 * active checkmark, and aligned muted descriptions. Bare A1 persists defaults immediately on Space,
 * closes through the implicit Ctrl+C-capable selection-cancel action, and uses the shared compact
 * semantic shortcut row with Type/search guidance without advertising that alias. All list and border
 * colors use the owned theme and its explicit color mode. Selected rows use the shared bare-A1 blue
 * selection surface only around the rendered item span, with the existing accent arrow, normal-text
 * level, and preserved current/default/description roles. The comparison profile retains the public
 * pinned component.
 * Deviations: owned-modal-shortcut-hints, owned-level-cycle-shortcut, owned-thinking-selector-heading,
 * owned-thinking-selector-controls, owned-dialog-ctrl-c-cancel, owned-standard-dialog-selection.
 */
import {
	Container,
	type Component,
	type Focusable,
	fuzzyFilter,
	getKeybindings,
	Input,
	type SelectItem,
	SelectList,
	type SelectListLayoutOptions,
	Spacer,
	type TuiMouseEvent,
	type TuiMouseEventResult,
	Text,
} from "@earendil-works/pi-tui";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { addPiModalHeader, adoptPiModalFrame } from "../../modal-frame.js";
import { DIALOG_CLOSE_SHORTCUT_HINT, piTheme, renderPiModalListRow, renderPiModalShortcutHints } from "../../theme.js";

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

interface ThinkingSelectList {
	readonly list: SelectList;
	readonly presentation: Component;
}

class ThinkingSelectListPresentation implements Component {
	private readonly list: SelectList;
	private readonly items: readonly SelectItem[];

	constructor(list: SelectList, items: readonly SelectItem[]) {
		this.list = list;
		this.items = items;
	}

	invalidate(): void {
		this.list.invalidate();
	}

	handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
		return this.list.handleMouse(event);
	}

	render(width: number): string[] {
		const selected = this.list.getSelectedItem();
		const selectedIndex = selected === null ? -1 : this.items.findIndex((item) => item.value === selected.value);
		return this.list.render(width).map((row, index) => renderPiModalListRow(row, width, index === selectedIndex));
	}
}

/** Bare-A1 thinking-level selector with profile-resolved shortcut presentation. */
export class OwnedThinkingSelectorComponent extends Container implements Focusable {
	private searchInput: Input;
	private selectList: SelectList;
	private selectListContainer: Container;
	private allItems: SelectItem[];
	private onSelect: (level: ThinkingSelectorLevel) => void;
	private onCancel: () => void;
	private onSelectAsDefault: ((level: ThinkingSelectorLevel) => void) | undefined;
	private currentLevel: ThinkingSelectorLevel;
	private defaultThinkingLevel: ThinkingSelectorLevel | undefined;
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
		this.defaultThinkingLevel = defaultThinkingLevel;

		this.allItems = [...new Set(availableLevels)].map((level) => ({
			value: level,
			label: level,
			description: LEVEL_DESCRIPTIONS[level],
		}));

		const header = addPiModalHeader(
			this,
			new DynamicBorder((text: string) => piTheme().fg("border", text)),
			new Text(piTheme().fg("accent", piTheme().bold("Thinking Level")), 0, 0),
		);
		this.addChild(new Text(piTheme().fg("muted", `${cycleKeyDisplay} cycles thinking levels in-session`), 0, 0));
		this.addChild(new Spacer(1));

		this.searchInput = new Input();
		this.searchInput.onSubmit = () => this.selectList.handleInput("\r");
		this.addChild(this.searchInput);
		this.addChild(new Spacer(1));

		const initialList = this.buildSelectList(this.allItems, currentLevel);
		this.selectList = initialList.list;
		this.selectListContainer = new Container();
		this.selectListContainer.addChild(initialList.presentation);
		this.addChild(this.selectListContainer);
		this.addChild(new Spacer(1));
		this.addChild(new Text(renderPiModalShortcutHints([
			{ key: "Type", action: "search" },
			{ key: this.keyDisplayText("tui.select.confirm"), action: "select" },
			{ key: "Space", action: "default" },
			DIALOG_CLOSE_SHORTCUT_HINT,
		]), 0, 0));
		this.addChild(new DynamicBorder((text: string) => piTheme().fg("border", text)));
		adoptPiModalFrame(this, { topIndex: 0, bottomIndex: this.children.length - 1, header });
	}

	private keyDisplayText(keybinding: Parameters<ReturnType<typeof getKeybindings>["getKeys"]>[0]): string {
		return getKeybindings().getKeys(keybinding)
			.map((key) => key.split("+").map((part) => {
				const display = process.platform === "darwin" && part.toLowerCase() === "alt" ? "option" : part;
				return display.charAt(0).toUpperCase() + display.slice(1);
			}).join("+"))
			.join("/");
	}

	private buildSelectList(items: SelectItem[], preselect?: ThinkingSelectorLevel): ThinkingSelectList {
		const theme = piTheme();
		const levelWidth = this.allItems.reduce((widest, item) => Math.max(widest, (item.label ?? item.value).length), 0);
		const selectedDefaultMarker = theme.fg("text", "◉");
		const unselectedDefaultMarker = theme.fg("dim", "○");
		const themedItems = items.map((item) => {
			const level = item.label ?? item.value;
			const isCurrent = item.value === this.currentLevel;
			const currentMarker = isCurrent ? ` ${theme.fg("success", "✓")}` : "";
			const statePadding = " ".repeat(levelWidth - level.length + (isCurrent ? 0 : 2));
			const defaultMarker = item.value === this.defaultThinkingLevel ? selectedDefaultMarker : unselectedDefaultMarker;
			const description = item.description ? theme.fg("muted", item.description) : "";
			return { value: item.value, label: `${defaultMarker} ${level}${currentMarker}${statePadding} ${description}` };
		});
		// Invariant: the bare selector uses the owned theme's explicit color mode, not upstream's host detection.
		const list = new SelectList(themedItems, Math.max(1, themedItems.length), {
			selectedPrefix: text => theme.fg("accent", text),
			selectedText: text => {
				const arrowEnd = text.startsWith("→ ") ? 2 : 0;
				const arrow = arrowEnd === 0 ? "" : theme.fg("accent", text.slice(0, arrowEnd));
				const marker = text.includes(selectedDefaultMarker) ? selectedDefaultMarker : unselectedDefaultMarker;
				const markerIndex = text.indexOf(marker, arrowEnd);
				return markerIndex === -1
					? arrow + theme.fg("text", text.slice(arrowEnd))
					: arrow
						+ theme.fg("text", text.slice(arrowEnd, markerIndex))
						+ marker
						+ theme.fg("text", text.slice(markerIndex + marker.length));
			},
			description: text => theme.fg("muted", text),
			scrollInfo: text => theme.fg("muted", text),
			noMatch: text => theme.fg("muted", text),
		}, THINKING_SELECT_LIST_LAYOUT);
		const currentIndex = themedItems.findIndex((item) => item.value === preselect);
		if (currentIndex !== -1) list.setSelectedIndex(currentIndex);
		list.onSelect = (item) => this.onSelect(item.value as ThinkingSelectorLevel);
		return { list, presentation: new ThinkingSelectListPresentation(list, themedItems) };
	}

	private applyFilter(query: string): void {
		const filtered = query
			? fuzzyFilter(this.allItems, query, (item) => `${item.value} ${item.description ?? ""}`)
			: this.allItems;
		const selectedValue = this.selectList.getSelectedItem()?.value as ThinkingSelectorLevel | undefined;
		const newList = this.buildSelectList(filtered, selectedValue);
		this.selectListContainer.clear();
		this.selectListContainer.addChild(newList.presentation);
		this.selectList = newList.list;
	}

	handleInput(keyData: string): void {
		const kb = getKeybindings();
		if (keyData === " ") {
			const item = this.selectList.getSelectedItem();
			if (item) {
				this.defaultThinkingLevel = item.value as ThinkingSelectorLevel;
				this.applyFilter(this.searchInput.getValue());
				this.onSelectAsDefault?.(this.defaultThinkingLevel);
			}
			return;
		}
		if (kb.matches(keyData, "tui.select.cancel")) {
			this.onCancel();
			return;
		}

		const isNav =
			kb.matches(keyData, "tui.select.up") ||
			kb.matches(keyData, "tui.select.down") ||
			kb.matches(keyData, "tui.select.confirm");
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
