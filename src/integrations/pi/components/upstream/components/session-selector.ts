/**
 * Provenance: @earendil-works/pi-coding-agent 1.0.4 (MIT), commit 7c10bd4337495ee613f2224843ecdf349b80d1df,
 * packages/coding-agent/src/modes/interactive/components/session-selector.ts.
 * Modifications: Source-synchronized session selector port: preserve threaded/current/all scope,
 * search, sort, named/path filters, rename, delete confirmation, active-session protection,
 * progressive partial results, cancellation, focus, and disposal while remapping public helpers, owned
 * keybindings/theme, canonical path handling, reverse-Tab scope cycling, and the shared bare-A1 modal
 * frame with standalone title, standard outer rules, stable filter/status row, progressive result
 * paging, aligned result columns, Session Tree selection roles, quiet in-field query syntax guidance,
 * and one-line bottom dynamic feedback and searchable-dialog shortcut footer. Selected session rows
 * use the blue selection surface while preserving title and metadata foregrounds; the active session
 * title uses success green independently of keyboard selection, with ordinary text weight.
 * Deviations: owned-modal-shortcut-hints, owned-resume-session-dialog,
 * owned-standard-dialog-selection.
 */
import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { unlink } from "node:fs/promises";
import * as os from "node:os";
import {
	type Component,
	Container,
	type Focusable,
	getKeybindings,
	Input,
	matchesKey,
	sliceByColumn,
	Spacer,
	Text,
	truncateToWidth,
	visibleWidth,
} from "@earendil-works/pi-tui";
import { KeybindingsManager } from "../adjacent/core/keybindings.js";
import { DynamicBorder, type SessionInfo } from "@earendil-works/pi-coding-agent";
import { addPiModalHeader, adoptPiModalFrame } from "../../modal-frame.js";
import { DIALOG_CLOSE_SHORTCUT_HINT, piTheme, renderPiModalShortcutHints, type PiModalShortcutHint } from "../../theme.js";

type SessionListProgress = (
	loaded: number,
	total: number,
	/** Sessions loaded so far, sorted by activity. Present on periodic updates. */
	partialSessions?: readonly SessionInfo[],
) => void;

const theme = new Proxy({} as ReturnType<typeof piTheme>, {
	get(_target, property) {
		const active = piTheme();
		const value = active[property as keyof typeof active];
		return typeof value === "function" ? value.bind(active) : value;
	},
});

type KeybindingName = Parameters<KeybindingsManager["getKeys"]>[0];

function keyText(keybinding: KeybindingName, keybindings: KeybindingsManager): string {
	return keybindings.getKeys(keybinding).join("/");
}

function shortcutHint(keybinding: KeybindingName, action: string, keybindings: KeybindingsManager): PiModalShortcutHint {
	return { key: keyText(keybinding, keybindings), action };
}

/** Keep the canonical close control complete while clipping preceding state-specific guidance. */
function withCloseHint(content: string, width: number): string {
	const close = renderPiModalShortcutHints([DIALOG_CLOSE_SHORTCUT_HINT]);
	const closeWidth = visibleWidth(close);
	if (width <= closeWidth) return truncateToWidth(close, width, "");
	const bodyWidth = Math.max(0, width - closeWidth - 2);
	const body = truncateToWidth(content, bodyWidth, "…");
	return body.length === 0 ? close : `${body}  ${close}`;
}
import { filterAndSortSessions, hasSessionName, type NameFilter, type SortMode } from "./session-selector-search.js";

type SessionScope = "current" | "all";

function shortenPath(path: string): string {
	const home = os.homedir();
	if (!path) return path;
	if (path.startsWith(home)) {
		return `~${path.slice(home.length)}`;
	}
	return path;
}

function formatSessionDate(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return "now";
	if (diffMins < 60) return `${diffMins}m`;
	if (diffHours < 24) return `${diffHours}h`;
	if (diffDays < 7) return `${diffDays}d`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
	if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
	return `${Math.floor(diffDays / 365)}y`;
}

function fitToWidth(value: string, width: number, ellipsis = ""): string {
	const available = Math.max(0, width);
	const clipped = truncateToWidth(value, available, ellipsis);
	return `${clipped}${" ".repeat(Math.max(0, available - visibleWidth(clipped)))}`;
}

function fitPathToWidth(value: string, width: number, preserveTail: boolean): string {
	if (!preserveTail || visibleWidth(value) <= width) return fitToWidth(value, width, "…");
	const tailWidth = Math.max(0, width - 1);
	const tail = sliceByColumn(value, Math.max(0, visibleWidth(value) - tailWidth), tailWidth, true);
	return fitToWidth(`…${tail}`, width);
}

function renderSelectedRow(value: string): string {
	const marker = "\u0000";
	const wrapper = theme.bg("selectedBg", marker);
	const markerIndex = wrapper.indexOf(marker);
	const on = wrapper.slice(0, markerIndex);
	const off = wrapper.slice(markerIndex + marker.length);
	const reasserted = value.replace(/\u001b\[[0-?]*[ -/]*m/gu, sequence => `${sequence}${on}`);
	return `${on}${reasserted}${off}`;
}

function canonicalizePath(path: string | undefined): string | undefined {
	if (!path) return path;
	try {
		return realpathSync(path);
	} catch {
		return path;
	}
}

class SessionSelectorHeader implements Component {
	private scope: SessionScope;
	private sortMode: SortMode;
	private nameFilter: NameFilter;
	private requestRender: () => void;
	private keybindings: KeybindingsManager;
	private showPath = false;
	private confirmingDeletePath: string | null = null;
	private statusMessage: { type: "info" | "error"; message: string } | null = null;
	private statusTimeout: ReturnType<typeof setTimeout> | null = null;
	private showRenameHint = false;

	constructor(
		scope: SessionScope,
		sortMode: SortMode,
		nameFilter: NameFilter,
		requestRender: () => void,
		keybindings: KeybindingsManager,
	) {
		this.scope = scope;
		this.sortMode = sortMode;
		this.nameFilter = nameFilter;
		this.requestRender = requestRender;
		this.keybindings = keybindings;
	}

	setScope(scope: SessionScope): void {
		this.scope = scope;
	}

	setSortMode(sortMode: SortMode): void {
		this.sortMode = sortMode;
	}

	setNameFilter(nameFilter: NameFilter): void {
		this.nameFilter = nameFilter;
	}

	setShowPath(showPath: boolean): void {
		this.showPath = showPath;
	}

	setShowRenameHint(show: boolean): void {
		this.showRenameHint = show;
	}

	setConfirmingDeletePath(path: string | null): void {
		this.confirmingDeletePath = path;
	}

	private clearStatusTimeout(): void {
		if (!this.statusTimeout) return;
		clearTimeout(this.statusTimeout);
		this.statusTimeout = null;
	}

	setStatusMessage(msg: { type: "info" | "error"; message: string } | null, autoHideMs?: number): void {
		this.clearStatusTimeout();
		this.statusMessage = msg;
		if (!msg || !autoHideMs) return;

		this.statusTimeout = setTimeout(() => {
			this.statusMessage = null;
			this.statusTimeout = null;
			this.requestRender();
		}, autoHideMs);
	}

	invalidate(): void {}

	render(width: number): string[] {
		const title = theme.fg("accent", theme.bold("Resume Session"));
		const scopeText = theme.fg("muted", "Filter: ")
			+ theme.fg(this.scope === "current" ? "accent" : "dim", "current")
			+ theme.fg("muted", " | ")
			+ theme.fg(this.scope === "all" ? "accent" : "dim", "all");
		const nameText = theme.fg("muted", "Name: ") + theme.fg("accent", this.nameFilter);
		const sortLabel = this.sortMode === "relevance" ? "fuzzy" : this.sortMode;
		const sortText = theme.fg("muted", "Sort: ") + theme.fg("accent", sortLabel);
		const status = `${scopeText}  ${nameText}  ${sortText}`;
		return [truncateToWidth(title, width, ""), truncateToWidth(status, width, "")];
	}

	renderFooter(width: number): string[] {
		if (this.confirmingDeletePath !== null) {
			const confirmHint = theme.fg("error", "Delete session? ") + renderPiModalShortcutHints([
				shortcutHint("tui.select.confirm", "confirm", this.keybindings),
			]);
			return [withCloseHint(confirmHint, width)];
		}
		if (this.statusMessage) {
			const color = this.statusMessage.type === "error" ? "error" : "accent";
			return [withCloseHint(theme.fg(color, this.statusMessage.message), width)];
		}

		const pathState = this.showPath ? "(on)" : "(off)";
		const hints: PiModalShortcutHint[] = [
			{ key: "Type", action: "search" },
			{ key: "↑↓", action: "navigate" },
			shortcutHint("tui.select.confirm", "select", this.keybindings),
			shortcutHint("tui.input.tab", "scope", this.keybindings),
			shortcutHint("app.session.toggleSort", "sort", this.keybindings),
			shortcutHint("app.session.toggleNamedFilter", "named", this.keybindings),
			shortcutHint("app.session.delete", "delete", this.keybindings),
			shortcutHint("app.session.togglePath", `path ${pathState}`, this.keybindings),
		];
		if (this.showRenameHint) hints.push(shortcutHint("app.session.rename", "rename", this.keybindings));
		return [withCloseHint(renderPiModalShortcutHints(hints), width)];
	}
}

class SessionSelectorFooter implements Component {
	private readonly presentation: SessionSelectorHeader;

	constructor(presentation: SessionSelectorHeader) {
		this.presentation = presentation;
	}

	invalidate(): void {
		this.presentation.invalidate();
	}

	render(width: number): string[] {
		return this.presentation.renderFooter(width);
	}
}

/** A session tree node for hierarchical display */
interface SessionTreeNode {
	session: SessionInfo;
	children: SessionTreeNode[];
	latestActivity: number;
}

/** Flattened node for display with tree structure info */
interface FlatSessionNode {
	session: SessionInfo;
	depth: number;
	isLast: boolean;
	/** For each ancestor level, whether there are more siblings after it */
	ancestorContinues: boolean[];
}

/**
 * Build a tree structure from sessions based on parentSessionPath.
 * Returns root nodes sorted by modified date (descending).
 */
function buildSessionTree(sessions: SessionInfo[]): SessionTreeNode[] {
	const byPath = new Map<string, SessionTreeNode>();

	for (const session of sessions) {
		const sessionPath = canonicalizePath(session.path) ?? session.path;
		byPath.set(sessionPath, { session, children: [], latestActivity: session.modified.getTime() });
	}

	const roots: SessionTreeNode[] = [];

	for (const session of sessions) {
		const sessionPath = canonicalizePath(session.path) ?? session.path;
		const node = byPath.get(sessionPath)!;
		const parentPath = canonicalizePath(session.parentSessionPath);

		if (parentPath && byPath.has(parentPath)) {
			byPath.get(parentPath)!.children.push(node);
		} else {
			roots.push(node);
		}
	}

	const updateLatestActivity = (node: SessionTreeNode): number => {
		let latestActivity = node.session.modified.getTime();
		for (const child of node.children) {
			latestActivity = Math.max(latestActivity, updateLatestActivity(child));
		}
		node.latestActivity = latestActivity;
		return latestActivity;
	};

	for (const root of roots) {
		updateLatestActivity(root);
	}

	// Sort children and roots by latest activity in each subtree (descending)
	const sortNodes = (nodes: SessionTreeNode[]): void => {
		nodes.sort((a, b) => b.latestActivity - a.latestActivity);
		for (const node of nodes) {
			sortNodes(node.children);
		}
	};
	sortNodes(roots);

	return roots;
}

/**
 * Flatten tree into display list with tree structure metadata.
 */
function flattenSessionTree(roots: SessionTreeNode[]): FlatSessionNode[] {
	const result: FlatSessionNode[] = [];

	const walk = (node: SessionTreeNode, depth: number, ancestorContinues: boolean[], isLast: boolean): void => {
		result.push({ session: node.session, depth, isLast, ancestorContinues });

		for (let i = 0; i < node.children.length; i++) {
			const childIsLast = i === node.children.length - 1;
			// Only show continuation line for non-root ancestors
			const continues = depth > 0 ? !isLast : false;
			walk(node.children[i]!, depth + 1, [...ancestorContinues, continues], childIsLast);
		}
	};

	for (let i = 0; i < roots.length; i++) {
		walk(roots[i]!, 0, [], i === roots.length - 1);
	}

	return result;
}

/**
 * Custom session list component with multi-line items and search
 */
class SessionList implements Component, Focusable {
	public getSelectedSessionPath(): string | undefined {
		const selected = this.filteredSessions[this.selectedIndex];
		return selected?.session.path;
	}
	private allSessions: SessionInfo[] = [];
	private filteredSessions: FlatSessionNode[] = [];
	private selectedIndex: number = 0;
	private selectionTouched = false;
	private searchInput: Input;
	private showCwd = false;
	private sortMode: SortMode = "threaded";
	private nameFilter: NameFilter = "all";
	private keybindings: KeybindingsManager;
	private showPath = false;
	private confirmingDeletePath: string | null = null;
	private currentSessionCanonicalPath: string | undefined;
	public onSelect?: (sessionPath: string) => void;
	public onCancel?: () => void;
	public onExit: () => void = () => {};
	public onToggleScope?: () => void;
	public onToggleSort?: () => void;
	public onToggleNameFilter?: () => void;
	public onTogglePath?: (showPath: boolean) => void;
	public onDeleteConfirmationChange?: (path: string | null) => void;
	public onDeleteSession?: (sessionPath: string) => Promise<void>;
	public onRenameSession?: (sessionPath: string) => void;
	public onError?: (message: string) => void;
	private maxVisible: number = 10; // Max sessions visible (one line each)

	// Focusable implementation - propagate to searchInput for IME cursor positioning
	private _focused = false;
	get focused(): boolean {
		return this._focused;
	}
	set focused(value: boolean) {
		this._focused = value;
		this.searchInput.focused = value;
	}

	constructor(
		sessions: SessionInfo[],
		showCwd: boolean,
		sortMode: SortMode,
		nameFilter: NameFilter,
		keybindings: KeybindingsManager,
		currentSessionFilePath?: string,
	) {
		this.allSessions = sessions;
		this.filteredSessions = [];
		this.searchInput = new Input({
			placeholder: 're:<pattern> regex, "phrase" exact',
			placeholderStyle: text => text === "r" ? text : `\u001b[2m${text}\u001b[22m`,
		});
		this.showCwd = showCwd;
		this.sortMode = sortMode;
		this.nameFilter = nameFilter;
		this.keybindings = keybindings;
		this.currentSessionCanonicalPath = canonicalizePath(currentSessionFilePath);
		this.filterSessions("");

		// Handle Enter in search input - select current item
		this.searchInput.onSubmit = () => {
			if (this.filteredSessions[this.selectedIndex]) {
				const selected = this.filteredSessions[this.selectedIndex]!;
				if (this.onSelect) {
					this.onSelect(selected.session.path);
				}
			}
		};
	}

	setSortMode(sortMode: SortMode): void {
		this.sortMode = sortMode;
		this.filterSessions(this.searchInput.getValue());
	}

	setNameFilter(nameFilter: NameFilter): void {
		this.nameFilter = nameFilter;
		this.filterSessions(this.searchInput.getValue());
	}

	setSessions(sessions: SessionInfo[], showCwd: boolean): void {
		const selectedPath = this.selectionTouched ? this.getSelectedSessionPath() : undefined;
		this.allSessions = sessions;
		this.showCwd = showCwd;
		this.filterSessions(this.searchInput.getValue());
		if (!this.selectionTouched) {
			this.selectedIndex = 0;
		} else if (selectedPath) {
			const selectedIndex = this.filteredSessions.findIndex((node) => node.session.path === selectedPath);
			if (selectedIndex >= 0) this.selectedIndex = selectedIndex;
		}
	}

	private filterSessions(query: string): void {
		const trimmed = query.trim();
		const nameFiltered =
			this.nameFilter === "all" ? this.allSessions : this.allSessions.filter((session) => hasSessionName(session));

		if (this.sortMode === "threaded" && !trimmed) {
			// Threaded mode without search: show tree structure
			const roots = buildSessionTree(nameFiltered);
			this.filteredSessions = flattenSessionTree(roots);
		} else {
			// Other modes or with search: flat list
			const filtered = filterAndSortSessions(nameFiltered, query, this.sortMode, "all");
			this.filteredSessions = filtered.map((session) => ({
				session,
				depth: 0,
				isLast: true,
				ancestorContinues: [],
			}));
		}
		this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.filteredSessions.length - 1));
	}

	private setConfirmingDeletePath(path: string | null): void {
		this.confirmingDeletePath = path;
		this.onDeleteConfirmationChange?.(path);
	}

	private startDeleteConfirmationForSelectedSession(): void {
		const selected = this.filteredSessions[this.selectedIndex];
		if (!selected) return;

		// Prevent deleting current session
		if (this.isCurrentSessionPath(selected.session.path)) {
			this.onError?.("Cannot delete the currently active session");
			return;
		}

		this.setConfirmingDeletePath(selected.session.path);
	}

	private isCurrentSessionPath(path: string): boolean {
		if (!this.currentSessionCanonicalPath) return false;
		return (canonicalizePath(path) ?? path) === this.currentSessionCanonicalPath;
	}

	private sessionPathText(session: SessionInfo): string {
		if (this.showPath) return shortenPath(session.path);
		return this.showCwd && session.cwd ? shortenPath(session.cwd) : "";
	}

	invalidate(): void {}

	render(width: number): string[] {
		const lines: string[] = [];

		// Render search input
		lines.push(...this.searchInput.render(width));
		lines.push(""); // Blank line after search

		if (this.filteredSessions.length === 0) {
			let emptyMessage: string;
			if (this.nameFilter === "named") {
				const toggleKey = keyText("app.session.toggleNamedFilter", this.keybindings);
				if (this.showCwd) {
					emptyMessage = `  No named sessions found. Press ${toggleKey} to show all.`;
				} else {
					emptyMessage = `  No named sessions in current folder. Press ${toggleKey} to show all, or Tab to view all.`;
				}
			} else if (this.showCwd) {
				// "All" scope - no sessions anywhere that match filter
				emptyMessage = "  No sessions found";
			} else {
				// "Current folder" scope - hint to try "all"
				emptyMessage = "  No sessions in current folder. Press Tab to view all.";
			}
			lines.push(theme.fg("muted", truncateToWidth(emptyMessage, width, "…")));
			return lines;
		}

		// Calculate visible range with scrolling
		const startIndex = Math.max(
			0,
			Math.min(this.selectedIndex - Math.floor(this.maxVisible / 2), this.filteredSessions.length - this.maxVisible),
		);
		const endIndex = Math.min(startIndex + this.maxVisible, this.filteredSessions.length);
		const pathTexts = this.filteredSessions.map((node) => this.sessionPathText(node.session));
		const longestPath = Math.max(0, ...pathTexts.map((path) => visibleWidth(path)));
		const countColumnWidth = Math.max(1, ...this.filteredSessions.map((node) => String(node.session.messageCount).length));
		const ageColumnWidth = Math.max(1, ...this.filteredSessions.map((node) => formatSessionDate(node.session.modified).length));
		const trailingColumnsWidth = countColumnWidth + 1 + ageColumnWidth;
		const columnGapWidth = 2;
		const maxPathColumnWidth = Math.max(0, width - trailingColumnsWidth - columnGapWidth * 2 - 12);
		const pathColumnWidth = Math.min(longestPath, Math.floor(width * 0.45), maxPathColumnWidth);
		const metadataWidth = columnGapWidth + trailingColumnsWidth
			+ (pathColumnWidth > 0 ? pathColumnWidth + columnGapWidth : 0);
		const titleColumnWidth = Math.max(0, width - metadataWidth);

		// Render visible sessions (one line each with stable title, path, count, and age columns)
		for (let i = startIndex; i < endIndex; i++) {
			const node = this.filteredSessions[i]!;
			const session = node.session;
			const isSelected = i === this.selectedIndex;
			const isConfirmingDelete = session.path === this.confirmingDeletePath;
			const isCurrent = this.isCurrentSessionPath(session.path);

			// Build tree prefix
			const prefix = this.buildTreePrefix(node);

			// Session display text (name or first message)
			const hasName = !!session.name;
			const displayText = session.name ?? session.firstMessage;
			const normalizedMessage = displayText.replace(/[\x00-\x1f\x7f]/g, " ").trim();

			const age = formatSessionDate(session.modified);
			const msgCount = String(session.messageCount);
			const pathText = this.sessionPathText(session);

			// Cursor and title stay inside their column so metadata always begins at one boundary.
			const cursor = isSelected ? theme.fg("accent", "→ ") : "  ";
			const prefixWidth = visibleWidth(prefix);
			const availableForMsg = Math.max(0, titleColumnWidth - 2 - prefixWidth);
			const truncatedMsg = truncateToWidth(normalizedMessage, availableForMsg, "…");

			// Style message
			let messageColor: "error" | "warning" | "success" | null = null;
			if (isConfirmingDelete) {
				messageColor = "error";
			} else if (isCurrent) {
				messageColor = "success";
			} else if (hasName) {
				messageColor = "warning";
			}
			const styledMsg = messageColor ? theme.fg(messageColor, truncatedMsg) : truncatedMsg;

			const metadataColor = isConfirmingDelete ? "error" : "dim";
			const titleColumn = fitToWidth(cursor + theme.fg("dim", prefix) + styledMsg, titleColumnWidth, "…");
			const pathColumn = pathColumnWidth > 0
				? `${theme.fg(metadataColor, fitPathToWidth(pathText, pathColumnWidth, this.showPath))}${" ".repeat(columnGapWidth)}`
				: "";
			const countColumn = theme.fg(metadataColor, msgCount.padStart(countColumnWidth));
			const ageColumn = theme.fg(metadataColor, age.padStart(ageColumnWidth));
			const fittedLine = fitToWidth(
				`${titleColumn}${" ".repeat(columnGapWidth)}${pathColumn}${countColumn} ${ageColumn}`,
				width,
			);
			lines.push(isSelected ? renderSelectedRow(fittedLine) : fittedLine);
		}

		// Add scroll indicator if needed
		if (startIndex > 0 || endIndex < this.filteredSessions.length) {
			const scrollText = `  (${this.selectedIndex + 1}/${this.filteredSessions.length})`;
			const scrollInfo = theme.fg("muted", truncateToWidth(scrollText, width, ""));
			lines.push(scrollInfo);
		}

		return lines;
	}

	private buildTreePrefix(node: FlatSessionNode): string {
		if (node.depth === 0) {
			return "";
		}

		const parts = node.ancestorContinues.map((continues) => (continues ? "│  " : "   "));
		const branch = node.isLast ? "└─ " : "├─ ";
		return parts.join("") + branch;
	}

	handleInput(keyData: string): void {
		const kb = getKeybindings();

		// Handle delete confirmation state first - intercept all keys
		if (this.confirmingDeletePath !== null) {
			if (kb.matches(keyData, "tui.select.confirm")) {
				const pathToDelete = this.confirmingDeletePath;
				this.setConfirmingDeletePath(null);
				void this.onDeleteSession?.(pathToDelete);
				return;
			}
			if (kb.matches(keyData, "tui.select.cancel")) {
				this.setConfirmingDeletePath(null);
				return;
			}
			// Ignore all other keys while confirming
			return;
		}

		if (matchesKey(keyData, "shift+tab") || kb.matches(keyData, "tui.input.tab")) {
			if (this.onToggleScope) {
				this.onToggleScope();
			}
			return;
		}

		if (kb.matches(keyData, "app.session.toggleSort")) {
			this.onToggleSort?.();
			return;
		}

		if (this.keybindings.matches(keyData, "app.session.toggleNamedFilter")) {
			this.onToggleNameFilter?.();
			return;
		}

		// Ctrl+P: toggle path display
		if (kb.matches(keyData, "app.session.togglePath")) {
			this.showPath = !this.showPath;
			this.onTogglePath?.(this.showPath);
			return;
		}

		// Ctrl+D: initiate delete confirmation (useful on terminals that don't distinguish Ctrl+Backspace from Backspace)
		if (kb.matches(keyData, "app.session.delete")) {
			this.startDeleteConfirmationForSelectedSession();
			return;
		}

		// Rename selected session
		if (kb.matches(keyData, "app.session.rename")) {
			const selected = this.filteredSessions[this.selectedIndex];
			if (selected) {
				this.onRenameSession?.(selected.session.path);
			}
			return;
		}

		// Ctrl+Backspace: non-invasive convenience alias for delete
		// Only triggers deletion when the query is empty; otherwise it is forwarded to the input
		if (kb.matches(keyData, "app.session.deleteNoninvasive")) {
			if (this.searchInput.getValue().length > 0) {
				this.searchInput.handleInput(keyData);
				this.filterSessions(this.searchInput.getValue());
				return;
			}

			this.startDeleteConfirmationForSelectedSession();
			return;
		}

		this.selectionTouched = true;
		// Up arrow
		if (kb.matches(keyData, "tui.select.up")) {
			this.selectedIndex = Math.max(0, this.selectedIndex - 1);
		}
		// Down arrow
		else if (kb.matches(keyData, "tui.select.down")) {
			this.selectedIndex = Math.min(this.filteredSessions.length - 1, this.selectedIndex + 1);
		}
		// Page up - jump up by maxVisible items
		else if (kb.matches(keyData, "tui.select.pageUp")) {
			this.selectedIndex = Math.max(0, this.selectedIndex - this.maxVisible);
		}
		// Page down - jump down by maxVisible items
		else if (kb.matches(keyData, "tui.select.pageDown")) {
			this.selectedIndex = Math.min(this.filteredSessions.length - 1, this.selectedIndex + this.maxVisible);
		}
		// Enter
		else if (kb.matches(keyData, "tui.select.confirm")) {
			const selected = this.filteredSessions[this.selectedIndex];
			if (selected && this.onSelect) {
				this.onSelect(selected.session.path);
			}
		}
		// Escape - cancel
		else if (kb.matches(keyData, "tui.select.cancel")) {
			if (this.onCancel) {
				this.onCancel();
			}
		}
		// Pass everything else to search input
		else {
			this.searchInput.handleInput(keyData);
			this.filterSessions(this.searchInput.getValue());
		}
	}
}

type SessionsLoader = (onProgress?: SessionListProgress, signal?: AbortSignal) => Promise<SessionInfo[]>;

/**
 * Delete a session file, trying the `trash` CLI first, then falling back to unlink
 */
async function deleteSessionFile(
	sessionPath: string,
): Promise<{ ok: boolean; method: "trash" | "unlink"; error?: string }> {
	// Try `trash` first (if installed)
	const trashArgs = sessionPath.startsWith("-") ? ["--", sessionPath] : [sessionPath];
	const trashResult = spawnSync("trash", trashArgs, { encoding: "utf-8" });

	const getTrashErrorHint = (): string | null => {
		const parts: string[] = [];
		if (trashResult.error) {
			parts.push(trashResult.error.message);
		}
		const stderr = trashResult.stderr?.trim();
		if (stderr) {
			parts.push(stderr.split("\n")[0] ?? stderr);
		}
		if (parts.length === 0) return null;
		return `trash: ${parts.join(" · ").slice(0, 200)}`;
	};

	// If trash reports success, or the file is gone afterwards, treat it as successful
	if (trashResult.status === 0 || !existsSync(sessionPath)) {
		return { ok: true, method: "trash" };
	}

	// Fallback to permanent deletion
	try {
		await unlink(sessionPath);
		return { ok: true, method: "unlink" };
	} catch (err) {
		const unlinkError = err instanceof Error ? err.message : String(err);
		const trashErrorHint = getTrashErrorHint();
		const error = trashErrorHint ? `${unlinkError} (${trashErrorHint})` : unlinkError;
		return { ok: false, method: "unlink", error };
	}
}

/**
 * Component that renders a session selector
 */
export class SessionSelectorComponent extends Container implements Focusable {
	handleInput(data: string): void {
		if (this.mode === "rename") {
			const kb = getKeybindings();
			if (kb.matches(data, "tui.select.cancel")) {
				this.exitRenameMode();
				return;
			}
			this.renameInput.handleInput(data);
			return;
		}

		this.sessionList.handleInput(data);
	}

	private canRename = true;
	private sessionList: SessionList;
	private header: SessionSelectorHeader;
	private footer: SessionSelectorFooter;
	private keybindings: KeybindingsManager;
	private scope: SessionScope = "current";
	private sortMode: SortMode = "threaded";
	private nameFilter: NameFilter = "all";
	private currentSessions: SessionInfo[] | null = null;
	private allSessions: SessionInfo[] | null = null;
	private currentSessionsLoader: SessionsLoader;
	private allSessionsLoader: SessionsLoader;
	private requestRender: () => void;
	private renameSession: ((sessionPath: string, currentName: string | undefined) => Promise<void>) | undefined;
	private currentLoad: AbortController | null = null;
	private allLoad: AbortController | null = null;

	private mode: "list" | "rename" = "list";
	private renameInput = new Input();
	private renameTargetPath: string | null = null;

	// Focusable implementation - propagate to sessionList for IME cursor positioning
	private _focused = false;
	get focused(): boolean {
		return this._focused;
	}
	set focused(value: boolean) {
		this._focused = value;
		this.sessionList.focused = value;
		this.renameInput.focused = value;
		if (value && this.mode === "rename") {
			this.renameInput.focused = true;
		}
	}

	private buildBaseLayout(content: Component, options?: { showHeader?: boolean }): void {
		this.clear();
		const showHeader = options?.showHeader ?? true;
		const modalHeader = showHeader
			? addPiModalHeader(this, new DynamicBorder(), this.header)
			: undefined;
		if (!showHeader) this.addChild(new DynamicBorder());
		this.addChild(new Spacer(1));
		this.addChild(content);
		this.addChild(new Spacer(1));
		if (showHeader) this.addChild(this.footer);
		this.addChild(new DynamicBorder());
		const frame = { topIndex: 0, bottomIndex: this.children.length - 1 } as const;
		if (modalHeader === undefined) adoptPiModalFrame(this, frame);
		else adoptPiModalFrame(this, { ...frame, header: modalHeader });
	}

	constructor(
		currentSessionsLoader: SessionsLoader,
		allSessionsLoader: SessionsLoader,
		onSelect: (sessionPath: string) => void,
		onCancel: () => void,
		onExit: () => void,
		requestRender: () => void,
		options?: {
			renameSession?: (sessionPath: string, currentName: string | undefined) => Promise<void>;
			showRenameHint?: boolean;
			keybindings?: KeybindingsManager;
		},
		currentSessionFilePath?: string,
	) {
		super();
		this.keybindings = options?.keybindings ?? KeybindingsManager.create();
		this.currentSessionsLoader = currentSessionsLoader;
		this.allSessionsLoader = allSessionsLoader;
		this.requestRender = requestRender;
		this.header = new SessionSelectorHeader(this.scope, this.sortMode, this.nameFilter, this.requestRender, this.keybindings);
		this.footer = new SessionSelectorFooter(this.header);
		const renameSession = options?.renameSession;
		this.renameSession = renameSession;
		this.canRename = !!renameSession;
		this.header.setShowRenameHint(options?.showRenameHint ?? this.canRename);

		// Create session list (starts empty, will be populated after load)
		this.sessionList = new SessionList(
			[],
			false,
			this.sortMode,
			this.nameFilter,
			this.keybindings,
			currentSessionFilePath,
		);

		this.buildBaseLayout(this.sessionList);

		this.renameInput.onSubmit = (value) => {
			void this.confirmRename(value);
		};

		// Ensure header status timeouts are cleared when leaving the selector
		const clearStatusMessage = () => this.header.setStatusMessage(null);
		this.sessionList.onSelect = (sessionPath) => {
			clearStatusMessage();
			this.cancelLoads();
			onSelect(sessionPath);
		};
		this.sessionList.onCancel = () => {
			clearStatusMessage();
			this.cancelLoads();
			onCancel();
		};
		this.sessionList.onExit = () => {
			clearStatusMessage();
			this.cancelLoads();
			onExit();
		};
		this.sessionList.onToggleScope = () => this.toggleScope();
		this.sessionList.onToggleSort = () => this.toggleSortMode();
		this.sessionList.onToggleNameFilter = () => this.toggleNameFilter();
		this.sessionList.onRenameSession = (sessionPath) => {
			if (!renameSession) return;
			if (this.scope === "current" ? this.currentLoad : this.allLoad) return;

			const sessions = this.scope === "all" ? (this.allSessions ?? []) : (this.currentSessions ?? []);
			const session = sessions.find((s) => s.path === sessionPath);
			this.enterRenameMode(sessionPath, session?.name);
		};

		// Sync list events to header
		this.sessionList.onTogglePath = (showPath) => {
			this.header.setShowPath(showPath);
			this.requestRender();
		};
		this.sessionList.onDeleteConfirmationChange = (path) => {
			this.header.setConfirmingDeletePath(path);
			this.requestRender();
		};
		this.sessionList.onError = (msg) => {
			this.header.setStatusMessage({ type: "error", message: msg }, 3000);
			this.requestRender();
		};

		// Handle session deletion
		this.sessionList.onDeleteSession = async (sessionPath: string) => {
			const result = await deleteSessionFile(sessionPath);

			if (result.ok) {
				if (this.currentSessions) {
					this.currentSessions = this.currentSessions.filter((s) => s.path !== sessionPath);
				}
				if (this.allSessions) {
					this.allSessions = this.allSessions.filter((s) => s.path !== sessionPath);
				}

				const sessions = this.scope === "all" ? (this.allSessions ?? []) : (this.currentSessions ?? []);
				const showCwd = this.scope === "all";
				this.sessionList.setSessions(sessions, showCwd);

				const msg = result.method === "trash" ? "Session moved to trash" : "Session deleted";
				this.header.setStatusMessage({ type: "info", message: msg }, 2000);
				await this.refreshSessionsAfterMutation();
			} else {
				const errorMessage = result.error ?? "Unknown error";
				this.header.setStatusMessage({ type: "error", message: `Failed to delete: ${errorMessage}` }, 3000);
			}

			this.requestRender();
		};

		// Start loading current sessions immediately
		void this.loadScope("current");
	}

	private cancelLoads(): void {
		if (this.currentLoad) {
			this.currentLoad.abort();
			this.currentLoad = null;
			this.currentSessions = null;
		}
		if (this.allLoad) {
			this.allLoad.abort();
			this.allLoad = null;
			this.allSessions = null;
		}
	}

	private enterRenameMode(sessionPath: string, currentName: string | undefined): void {
		this.mode = "rename";
		this.renameTargetPath = sessionPath;
		this.renameInput.setValue(currentName ?? "");
		this.renameInput.focused = true;

		const panel = new Container();
		panel.addChild(new Text(theme.bold("Rename Session"), 1, 0));
		panel.addChild(new Spacer(1));
		panel.addChild(this.renameInput);
		panel.addChild(new Spacer(1));
		panel.addChild(new Text(renderPiModalShortcutHints([
			shortcutHint("tui.select.confirm", "to save", this.keybindings),
			DIALOG_CLOSE_SHORTCUT_HINT,
		]), 1, 0));

		this.buildBaseLayout(panel, { showHeader: false });
		this.requestRender();
	}

	private exitRenameMode(): void {
		this.mode = "list";
		this.renameTargetPath = null;

		this.buildBaseLayout(this.sessionList);

		this.requestRender();
	}

	private async confirmRename(value: string): Promise<void> {
		const next = value.trim();
		if (!next) return;
		const target = this.renameTargetPath;
		if (!target) {
			this.exitRenameMode();
			return;
		}

		// Find current name for callback
		const renameSession = this.renameSession;
		if (!renameSession) {
			this.exitRenameMode();
			return;
		}

		try {
			await renameSession(target, next);
			await this.refreshSessionsAfterMutation();
		} finally {
			this.exitRenameMode();
		}
	}

	private async loadScope(scope: SessionScope): Promise<void> {
		if (scope === "current" ? this.currentLoad : this.allLoad) return;

		const showCwd = scope === "all";
		const controller = new AbortController();
		if (scope === "current") {
			this.currentLoad = controller;
		} else {
			this.allLoad = controller;
		}
		this.header.setScope(scope);
		this.requestRender();

		const isActive = () => (scope === "current" ? this.currentLoad : this.allLoad) === controller;
		const onProgress: SessionListProgress = (_loaded, _total, partialSessions) => {
			if (!isActive()) return;
			if (partialSessions) {
				const sessions = [...partialSessions];
				if (scope === "current") {
					this.currentSessions = sessions;
				} else {
					this.allSessions = sessions;
				}
				if (scope === this.scope) this.sessionList.setSessions(sessions, showCwd);
			}
			if (scope !== this.scope) return;
			this.requestRender();
		};

		try {
			const sessions = await (scope === "current"
				? this.currentSessionsLoader(onProgress, controller.signal)
				: this.allSessionsLoader(onProgress, controller.signal));
			if (!isActive()) return;

			if (scope === "current") {
				this.currentSessions = sessions;
				this.currentLoad = null;
			} else {
				this.allSessions = sessions;
				this.allLoad = null;
			}

			if (scope !== this.scope) return;
			this.sessionList.setSessions(sessions, showCwd);
			this.requestRender();
		} catch (err) {
			if (!isActive()) return;
			if (scope === "current") {
				this.currentLoad = null;
				this.currentSessions = null;
			} else {
				this.allLoad = null;
				this.allSessions = null;
			}
			if (scope !== this.scope) return;

			const message = err instanceof Error ? err.message : String(err);
			this.header.setStatusMessage({ type: "error", message: `Failed to load sessions: ${message}` }, 4000);
			this.sessionList.setSessions([], showCwd);
			this.requestRender();
		}
	}

	private toggleSortMode(): void {
		// Cycle: threaded -> recent -> relevance -> threaded
		this.sortMode = this.sortMode === "threaded" ? "recent" : this.sortMode === "recent" ? "relevance" : "threaded";
		this.header.setSortMode(this.sortMode);
		this.sessionList.setSortMode(this.sortMode);
		this.requestRender();
	}

	private toggleNameFilter(): void {
		this.nameFilter = this.nameFilter === "all" ? "named" : "all";
		this.header.setNameFilter(this.nameFilter);
		this.sessionList.setNameFilter(this.nameFilter);
		this.requestRender();
	}

	private async refreshSessionsAfterMutation(): Promise<void> {
		this.cancelLoads();
		this.currentSessions = null;
		this.allSessions = null;
		await this.loadScope(this.scope);
	}

	private toggleScope(): void {
		this.scope = this.scope === "current" ? "all" : "current";
		const sessions = this.scope === "current" ? this.currentSessions : this.allSessions;
		const loading = (this.scope === "current" ? this.currentLoad : this.allLoad) !== null;
		this.header.setScope(this.scope);
		this.sessionList.setSessions(sessions ?? [], this.scope === "all");
		this.requestRender();
		if (sessions === null && !loading) void this.loadScope(this.scope);
	}

	getSessionList(): SessionList {
		return this.sessionList;
	}
}
