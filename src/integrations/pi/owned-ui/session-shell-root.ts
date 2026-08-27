import type {
  OwnedUiCommand,
  OwnedUiDialog,
  OwnedUiSessionViewModel,
  OwnedUiThinkingLevel,
  OwnedUiViewportSettings,
  OwnedUiViewportSettingsPort,
} from "../../../contracts/owned-ui/index.js";
import type { UiRouteHost } from "./route-host.js";
import {
  TranscriptViewport,
  backgroundSgrSpan,
  composeSubmittedPromptRows,
  displayWidth,
  formatSubmittedPromptTime,
  hyperlinkSgrSpan,
  nativeHyperlinkStyle,
  overlaySpan,
  submittedPromptLayout,
  routeMouseInput,
  scrollForTrackPage,
  scrollForThumbRow,
  scrollbarSelectionRows,
  scrollbarWheelRows,
  stripAnsi,
  type TranscriptPromptAnchor,
} from "../../../ui/components/index.js";
import {
  PINNED_PI_HIDDEN_COMMAND_NAMES,
  PINNED_PI_WORKFLOW_COMMAND_NAMES,
  type AdapterCommandResult,
  type OwnedPiExtensionResourceSummary,
  type OwnedPiExtensionSourceSummary,
  type PiEngineAdapter,
  type PiWorkflowInteractionRequest,
  type PiWorkflowLoginNotification,
  type PiWorkflowLoginStart,
  type PiWorkflowRequest,
  type PiWorkflowResult,
  type PiWorkflowRoute,
} from "../engine/index.js";
import {
  createPiExtensionUiBridge,
  createPiQueuedInputStatus,
  createPiShellArmin,
  createPiShellAuthProviderSelector,
  createPiShellChangelog,
  createPiShellDaxnuts,
  createPiShellDialog,
  createPiShellEarendilAnnouncement,
  createPiShellEditor,
  createPiShellExtensionSelector,
  createPiShellFooter,
  createPiShellHeader,
  createPiShellHotkeys,
  createPiShellLoadedResources,
  createPiShellLoginDialog,
  createPiShellModelSelector,
  createPiShellOperationLoader,
  createPiShellReloadBox,
  createPiShellScopedModelsSelector,
  createPiShellSelector,
  createPiShellSessionInfo,
  createPiShellSessionSelector,
  createPiShellSettingsSelector,
  createPiShellStatus,
  createPiShellTranscriptComponent,
  createPiShellTreeSelector,
  createPiShellTrustSelector,
  createPiShellUserMessageSelector,
  onPiThemeChange,
  piShellVisibleWidth,
  piTheme,
  renderPiShellPackageUpdateNotice,
  renderPiShellStartupDiagnostic,
  renderPiShellStatusText,
  renderPiShellTranscriptBlock,
  type PiExtensionUiBridge,
  type PiShellClipboardContent,
  type PiShellComponentPort,
  type PiShellEditorPort,
  type PiShellExtensionRendererResolver,
  type PiShellHeaderOptions,
  type PiShellHeaderPort,
  type PiShellLoadedResourcesPort,
  type PiShellLoginDialogPort,
  type PiShellQueuedInputPort,
  type PiShellResourceEntry,
  type PiShellScopedModelsSelectorPort,
  type PiShellSelectorOption,
  type PiShellStatusPort,
  type PiShellSubmittedPromptComposer,
  type PiShellTranscriptComponentPort,
  type PiShellViewComponentPort,
} from "../components/index.js";
import {
  PiTuiRuntimeAdapter,
  type PiTuiComponentPort,
  type PiTuiLayoutNode,
  type PiTuiOverlayHandle,
  type PiTuiTerminalPort,
} from "../tui-runtime/index.js";
import { PromptChipStore, type PreparedPrompt } from "./prompt-chips.js";

export type OwnedUiBackendPort = PiEngineAdapter;
export type OwnedUiTerminalPort = PiTuiTerminalPort;
type OwnedUiStartupOptions = PiShellHeaderOptions;

export interface OwnedUiClipboardPort {
  readText(): Promise<string | null>;
  readImage?(): Promise<{ readonly data: string; readonly mimeType: string } | null>;
  writeText?(text: string): Promise<void>;
}

export interface OwnedUiSessionShellOptions {
  readonly backend: OwnedUiBackendPort;
  readonly cwd: string;
  readonly terminal?: OwnedUiTerminalPort;
  readonly startup?: OwnedUiStartupOptions;
  /**
   * Declared A1-owned routes. A route this host claims resolves to its app;
   * every other route continues to the pinned workflow table unchanged.
   */
  readonly routeHost?: UiRouteHost;
  /** Bare A1 selects the owned bounded viewport; comparison profiles stay pinned. */
  readonly sessionLayout?: "pinned" | "custom-viewport";
  /** Live profile-local settings, supplied only to the bare-A1 composition. */
  readonly viewportSettings?: OwnedUiViewportSettingsPort;
  /** Optional platform seam; production uses A1's system clipboard adapter. */
  readonly clipboard?: OwnedUiClipboardPort;
}

export class OwnedUiSessionShellRoot implements PiTuiComponentPort {
  readonly editor: PiShellEditorPort;
  readonly header: PiShellHeaderPort;
  readonly resources: PiShellLoadedResourcesPort;
  readonly #cwd: string;
  readonly #transcript = new Map<string, PiShellTranscriptComponentPort>();
  readonly #blocksById = new Map<string, OwnedUiSessionViewModel["transcript"][number]>();
  readonly #renderedRows = new Map<string, Map<number, { readonly revision: number; readonly rows: readonly string[] }>>();
  /** Flattened transcript rows reused by wheel, rail, jump, and selection frames. */
  readonly #documentLayouts = new Map<number, { readonly rows: readonly string[]; readonly promptAnchors: readonly TranscriptPromptAnchor[] }>();
  readonly #themeUnsubscribe: () => void;
  #transcriptOrder: string[] = [];
  #view: OwnedUiSessionViewModel;
  readonly #status: PiShellStatusPort;
  readonly #footer: PiShellViewComponentPort;
  readonly #queued: PiShellQueuedInputPort;
  readonly #extensionRenderers: PiShellExtensionRendererResolver;
  readonly #promptChips = new PromptChipStore();
  readonly #customViewport: boolean;
  readonly #submittedPromptComposer: PiShellSubmittedPromptComposer | undefined;
  readonly #viewport = new TranscriptViewport();
  #viewportConfig: OwnedUiViewportSettings = {
    scrollbarAppearance: "hover",
    scrollbarStyle: "thin",
    scrollbarSpeed: "normal",
  };
  #dragGrabOffset: number | null = null;
  /** A left-button sequence begun in status/editor/footer chrome is swallowed. */
  #dockPointerSuppressed = false;
  /** Last composed terminal rows occupied by the default prompt editor. */
  #editorPointerFrame: { readonly rowStart: number; readonly rowEnd: number } | undefined;
  #selectionAutoScrollTimer: ReturnType<typeof setTimeout> | undefined;
  #selectionAutoScrollPointer: { readonly column: number; readonly row: number } | undefined;
  #viewportActivityTimer: ReturnType<typeof setTimeout> | undefined;
  readonly #componentRuntime: {
    readonly getColumns: () => number;
    readonly getRows: () => number;
    readonly requestRender: () => void;
  };
  #toolsExpanded = false;
  #thinkingVisible = true;
  #workflowTranscriptSequence = 0;
  readonly #workflowStatusAnchors = new Map<string, number>();
  readonly #workflowStatusMessages = new Map<string, string>();
  #lastWorkflowStatusId: string | undefined;
  #inputSurface: PiShellComponentPort;
  #extensionHeader: PiShellComponentPort | null = null;
  #extensionFooter: PiShellComponentPort | null = null;
  readonly #extensionWidgets = new Map<string, { readonly component: PiShellComponentPort; readonly placement: "aboveEditor" | "belowEditor" }>();
  readonly #extensionStatuses = new Map<string, string>();
  #extensionWorkingMessage: string | undefined;
  #extensionWorkingVisible = true;

  constructor(
    view: OwnedUiSessionViewModel,
    cwd: string,
    handlers: {
      readonly getColumns: () => number;
      readonly getRows: () => number;
      readonly requestRender: () => void;
      readonly onSubmit: (text: string) => void;
      readonly onInterrupt: () => void;
      readonly onClear?: () => void;
      readonly onExit: () => void;
      readonly onModelSelect: () => void;
      readonly onModelCycle?: (direction: "forward" | "backward") => void;
      readonly onThinkingCycle: () => void;
      readonly onThinkingToggle?: () => void;
      readonly onMessageCopy?: () => void;
      readonly onFollowUp?: () => void;
      readonly onDequeue?: () => void;
      readonly onCopyText?: (text: string) => void;
      readonly readClipboardContent?: () => Promise<PiShellClipboardContent | null>;
    },
    startup: PiShellHeaderOptions = {},
    agentDir?: string,
    extensionRenderers: PiShellExtensionRendererResolver = {
      getMessageRenderer: () => undefined,
      getToolDefinition: () => undefined,
    },
    sessionLayout: "pinned" | "custom-viewport" = "pinned",
  ) {
    this.#view = view;
    this.#customViewport = sessionLayout === "custom-viewport";
    this.#submittedPromptComposer = this.#customViewport
      ? {
          layout: submittedPromptLayout,
          compose: (rows, width, source, style) => composeSubmittedPromptRows(rows, width, source, style)
            .map(row => nativeHyperlinkStyle(row, text => piTheme().fg("mdLink", text))),
        }
      : undefined;
    this.#cwd = cwd;
    this.#extensionRenderers = extensionRenderers;
    this.#componentRuntime = handlers;
    this.header = createPiShellHeader(startup);
    this.resources = createPiShellLoadedResources(startup.resources ?? [], startup.expanded ?? false);
    this.#status = createPiShellStatus(view, handlers);
    this.#footer = createPiShellFooter(this.#viewWithExtensionStatuses(view), cwd);
    this.#queued = createPiQueuedInputStatus(
      view.editor.queuedSubmissions,
      this.#customViewport ? "custom-viewport" : "pinned",
    );
    this.editor = createPiShellEditor({
      ...handlers,
      keybindingProfile: this.#customViewport ? "a1" : "pi",
      paintEditorSelection: (line, from, to, atomic) => backgroundSgrSpan(
        line,
        from,
        to,
        atomic ? "\u001b[7m" : "\u001b[27m\u001b[48;2;38;79;120m",
        atomic ? "\u001b[27m" : "\u001b[49m",
        piShellVisibleWidth,
      ),
      transformPastedContent: content => this.#promptChips.transformPastedContent(content),
      editorAtomicRanges: line => this.#promptChips.atomicRanges(line),
      decorateEditorRow: row => {
        const plain = stripAnsi(row);
        return this.#promptChips.hyperlinkRanges(plain).reduce((decorated, range) => hyperlinkSgrSpan(
          decorated,
          piShellVisibleWidth(plain.slice(0, range.start)),
          piShellVisibleWidth(plain.slice(0, range.end)),
          range.target,
          piShellVisibleWidth,
        ), row);
      },

      expandCopiedEditorText: text => this.#promptChips.expandCopiedText(text),
      cwd,
      ...(agentDir === undefined ? {} : { agentDir }),
      onToolsExpand: () => this.#setToolsExpanded(!this.#toolsExpanded),
    });
    this.editor.setThinkingLevel(view.thinkingLevel);
    this.#inputSurface = this.editor;
    for (const block of view.transcript) {
      if (block.kind === "user") this.editor.addToHistory(block.text);
    }
    this.#syncTranscript(view.transcript);
    // Colours come from the active theme, so rendered rows outlive their revision only
    // until the theme under them changes.
    this.#themeUnsubscribe = onPiThemeChange(() => {
      this.#renderedRows.clear();
      this.#documentLayouts.clear();
    });
  }

  preparePromptSubmission(text: string): PreparedPrompt {
    return this.#promptChips.prepareSubmission(text);
  }

  update(view: OwnedUiSessionViewModel): void {
    if (view.diagnostics.length !== this.#view.diagnostics.length
      || view.diagnostics.some((diagnostic, index) => diagnostic.sequence !== this.#view.diagnostics[index]?.sequence)) {
      this.#documentLayouts.clear();
    }
    this.#view = view;
    this.#status.update(view);
    this.#footer.update(this.#viewWithExtensionStatuses(view));
    this.#queued.update(view.editor.queuedSubmissions);
    this.#syncTranscript(view.transcript);
    this.editor.setSubmitEnabled(view.lifecycle !== "stopping" && view.lifecycle !== "stopped" && view.lifecycle !== "failed");
    this.editor.setThinkingLevel(view.thinkingLevel);
    this.invalidate();
  }

  /**
   * Applies one block: its component is created or updated in place and the order grows
   * only when the block is new. A streamed chunk costs one component update rather than a
   * walk of the whole transcript.
   */
  applyTranscriptBlock(block: OwnedUiSessionViewModel["transcript"][number]): void {
    this.#blocksById.set(block.id, block);
    const component = this.#transcript.get(block.id);
    if (component === undefined) {
      const created = createPiShellTranscriptComponent(block, this.#cwd, this.#extensionRenderers, this.#submittedPromptComposer);
      created.setExpanded(this.#toolsExpanded);
      this.#transcript.set(block.id, created);
      this.#transcriptOrder.push(block.id);
    } else if (component.revision !== block.revision) {
      component.update(block);
    }
    // One chunk touches one block, and the updated component tracks its own dirtiness.
    // Invalidating the whole shell here would re-wrap the entire transcript per chunk.
    this.#renderedRows.delete(block.id);
    this.#documentLayouts.clear();
  }

  render(width: number): readonly string[] {
    if (!this.#customViewport) {
      this.#editorPointerFrame = undefined;
      return [...this.#renderDocument(width), ...this.#renderDock(width)];
    }

    const height = Math.max(0, this.#componentRuntime.getRows());
    const dock = this.#renderDockLayout(width);
    const availableWithoutStatus = Math.max(0, height - Math.min(height, dock.rowsWithoutStatus.length));
    // Ordinary transcript content uses the full terminal width. The rail is an
    // overlay, not a lost wrapping cell. Submitted prompts alone retain the
    // intentional final gutter after their right-aligned timestamp.
    const documentWidth = width;
    let document = this.#renderDocumentLayout(documentWidth);
    const statusRows = dock.statusRows;
    // v2 pins Working only while the complete transcript still fits. Once the
    // transcript overflows, status joins the scrollable document tail so it
    // naturally leaves the screen when the user scrolls up.
    // Pi presents pending messages before Working. Keep status in the dock while
    // a queue exists so moving overflowing status into the document cannot
    // reverse that semantic order; it returns to v2 scrolling once the queue clears.
    const pinStatus = this.#view.editor.queuedSubmissions.length > 0
      || document.rows.length + statusRows.length <= availableWithoutStatus;
    const dockRows = pinStatus ? dock.rows : dock.rowsWithoutStatus;
    if (!pinStatus) document = { ...document, rows: [...document.rows, ...statusRows] };
    const dockStartRow = height - dockRows.length + 1;
    const editorOffset = pinStatus ? dock.editorOffsetWithStatus : dock.editorOffsetWithoutStatus;
    this.#editorPointerFrame = this.usesDefaultInputSurface()
      ? {
          rowStart: dockStartRow + editorOffset,
          rowEnd: dockStartRow + editorOffset + dock.inputRows - 1,
        }
      : undefined;
    this.#viewport.setConfig(this.#viewportConfig);
    return this.#viewport.compose({
      documentRows: document.rows,
      dockRows,
      promptAnchors: document.promptAnchors,
      width,
      height,
      // Anchor above the stable editor/widget/footer group. Queued input,
      // working states, and transient notifications may grow above it without
      // moving the floating control up and down the terminal.
      bottomControlRow: Math.max(0, height - Math.min(height, dock.stableBottomRows) - 1),
      theme: {
        // Match the v2 rail: a continuously dim track and an accent thumb at
        // rest, thickening on hover/drag through the presentation glyph. Reset
        // inherited text decorations so dim transcript rows cannot dull the
        // thumb; the row background deliberately remains intact.
        track: text => `${SCROLLBAR_CELL_RESET}${piTheme().fg("dim", text)}`,
        thumb: text => `${SCROLLBAR_CELL_RESET}${piTheme().fg("text", text)}`,
        sticky: (text, hovered) => piTheme().bg(
          hovered ? "selectedBg" : "toolPendingBg",
          piTheme().fg("text", withoutTerminalBackground(text)),
        ),
        quietSticky: text => `\u001b[2m${text.replace(/\u001b\[(?:0|22)m/g, "$&\u001b[2m")}\u001b[22m`,
        bottomControl: (text, hovered) => piTheme().bg(hovered ? "selectedBg" : "toolPendingBg", piTheme().fg("text", text)),
        // Selection paints only the familiar dark-blue background. Source
        // foreground roles (including links, warnings, muted text, and bold
        // intensity) remain exactly as rendered instead of being inverted.
        selection: (line, from, to) => backgroundSgrSpan(
          line,
          from,
          to,
          "\u001b[48;2;38;79;120m",
          "\u001b[49m",
        ),
      },
    }).rows;
  }

  setViewportConfig(config: OwnedUiViewportSettings): void {
    if (config.scrollbarAppearance !== this.#viewportConfig.scrollbarAppearance) this.#documentLayouts.clear();
    this.#viewportConfig = config;
    this.#viewport.setConfig(config);
    this.#componentRuntime.requestRender();
  }

  resumeViewportFollowing(): void {
    if (!this.#customViewport) return;
    this.#stopSelectionAutoScroll();
    const selectionChanged = this.#viewport.clearSelection();
    const scrolled = this.#viewport.scrollToEnd();
    if (scrolled) this.#scheduleViewportActivityExpiry();
    if (scrolled || selectionChanged) this.#componentRuntime.requestRender();
  }

  noteCompletedAssistantMessage(): void {
    if (!this.#customViewport || !this.#viewport.noteNewMessage()) return;
    this.#componentRuntime.requestRender();
  }

  resetViewport(): void {
    if (this.#viewportActivityTimer !== undefined) clearTimeout(this.#viewportActivityTimer);
    this.#viewportActivityTimer = undefined;
    this.#stopSelectionAutoScroll();
    this.#viewport.reset();
  }

  clearViewportPointerState(): void {
    if (this.#viewportActivityTimer !== undefined) clearTimeout(this.#viewportActivityTimer);
    this.#viewportActivityTimer = undefined;
    this.#dragGrabOffset = null;
    this.#dockPointerSuppressed = false;
    this.#stopSelectionAutoScroll();
    this.#viewport.clearSelection();
    this.#viewport.clearTransient();
  }

  handleViewportPreInput(data: string, allowWheel = true, now = Date.now()): {
    readonly data: string;
    readonly consumed: boolean;
    readonly copyText?: string;
  } {
    if (!this.#customViewport) return { data, consumed: false };
    // Pi components share one keybinding manager. Restore bare A1's aliases
    // before the focused vanilla editor handles this input.
    this.editor.activateKeybindings();
    // Handle the physical paste chord at the pre-input boundary. Windows
    // terminals vary between forwarding Ctrl+V and performing terminal-owned
    // bracketed paste; the latter continues unchanged to Pi below.
    if (this.editor.matchesTerminalKey(data, "ctrl+v") && this.editor.pasteClipboard()) {
      return { data: "", consumed: true };
    }
    if (this.#viewport.frame === null) return { data, consumed: false };
    if (data === "\u0003") {
      // Prompt selection has priority while the editor owns one; without it,
      // Ctrl+C retains transcript-copy and then Pi's ordinary clear behavior.
      if (this.editor.hasSelection()) {
        if (this.#viewport.clearSelection()) this.#componentRuntime.requestRender();
      } else {
        const copyText = this.#viewport.selectedText();
        if (copyText !== null && copyText.length > 0) {
          this.#viewport.clearSelection();
          this.#componentRuntime.requestRender();
          return { data: "", consumed: true, copyText };
        }
      }
    }
    // Plain Home/End own transcript boundaries. Their Ctrl-modified forms are
    // not matched here and continue to Pi's vanilla prompt editor.
    if (allowWheel && this.editor.matchesTerminalKey(data, "home")) {
      if (this.#viewport.scrollTo(0, now)) {
        this.#scheduleViewportActivityExpiry();
        this.#componentRuntime.requestRender();
      }
      return { data: "", consumed: true };
    }
    if (allowWheel && this.editor.matchesTerminalKey(data, "end")) {
      if (!this.#viewport.followingEnd) {
        this.#viewport.scrollToEnd(now);
        this.#scheduleViewportActivityExpiry();
        this.#componentRuntime.requestRender();
      }
      return { data: "", consumed: true };
    }
    if (allowWheel && (SHIFT_UP_INPUTS.has(data) || SHIFT_DOWN_INPUTS.has(data))) {
      const scrolled = SHIFT_UP_INPUTS.has(data)
        ? this.#viewport.scrollToPreviousPrompt(now)
        : this.#viewport.scrollToNextPrompt(now);
      if (scrolled) {
        this.#scheduleViewportActivityExpiry();
        this.#componentRuntime.requestRender();
      }
      return { data: "", consumed: true };
    }
    // Keyboard interaction returns ownership to the prompt and dismisses a
    // stale transcript selection. Mouse reports are resolved by surface below.
    if (!data.includes("\u001b[<") && data !== "\u0003" && this.#viewport.clearSelection()) {
      this.#componentRuntime.requestRender();
    }
    const frame = this.#viewport.frame;
    let repaint = false;
    let activity = false;
    const routed = routeMouseInput(data, event => {
      const hits = frame.hits;
      const overRail = hits.rail !== null
        && event.column === hits.rail.column
        && event.row >= hits.rail.rowStart
        && event.row < hits.rail.rowStart + hits.rail.trackHeight;
      const overSticky = hits.sticky !== null && event.row === hits.sticky.row && event.column <= hits.sticky.width;
      const overBottom = hits.bottom !== null && event.row === hits.bottom.row
        && event.column >= hits.bottom.columnStart && event.column <= hits.bottom.columnEnd;

      if (event.kind === "motion") {
        this.#viewport.setRailHovered(overRail);
        this.#viewport.setStickyHovered(overSticky);
        this.#viewport.setBottomHovered(overBottom);
        repaint = true;
        if (this.editor.ownsPointer() && this.#editorPointerFrame !== undefined) {
          this.editor.handlePointer({
            kind: "motion",
            button: event.button,
            column: event.column,
            row: event.row - this.#editorPointerFrame.rowStart + 1,
          });
          return true;
        }
        if (this.#dockPointerSuppressed) return true;
        // Once a left-button selection starts, its release—not the button bits
        // on an intermediate motion report—ends ownership. Some terminals emit
        // no-button motion while busy frames are being coalesced; accepting it
        // keeps the drag continuous instead of apparently freezing.
        if (this.#viewport.selectionActive) {
          this.#viewport.extendSelection(event.column, event.row, now, false);
          this.#updateSelectionAutoScroll(event.column, event.row, hits.viewportHeight);
          activity = true;
          return true;
        }
        if (this.#dragGrabOffset !== null && hits.rail !== null) {
          const target = scrollForThumbRow(hits.rail.geometry, event.row - hits.rail.rowStart - this.#dragGrabOffset);
          this.#viewport.scrollTo(target, now);
          activity = true;
          return true;
        }
        return overRail || overSticky || overBottom;
      }
      if (event.kind === "wheel-up" || event.kind === "wheel-down") {
        if (!allowWheel || event.row < 1 || event.row > hits.viewportHeight) return false;
        const distance = scrollbarWheelRows(this.#viewportConfig.scrollbarSpeed);
        this.#viewport.scrollBy(event.kind === "wheel-up" ? -distance : distance, now);
        activity = true;
        repaint = true;
        return true;
      }
      if (event.kind === "press") {
        const editorFrame = this.#editorPointerFrame;
        if (event.button === 2 && editorFrame !== undefined
          && event.row >= editorFrame.rowStart && event.row <= editorFrame.rowEnd) {
          this.#stopSelectionAutoScroll();
          if (this.#viewport.clearSelection()) repaint = true;
          this.editor.pasteClipboard();
          // Own the matching release as editor chrome input as well.
          this.#dockPointerSuppressed = true;
          repaint = true;
          return true;
        }
        if (event.button !== 0) return false;
        this.#stopSelectionAutoScroll();
        if (this.#viewport.clearSelection()) repaint = true;
        if (overBottom) {
          this.#viewport.scrollToEnd(now);
          activity = true;
          repaint = true;
          return true;
        }
        if (overSticky && hits.sticky !== null) {
          this.#viewport.scrollTo(hits.sticky.target, now);
          activity = true;
          repaint = true;
          return true;
        }
        if (overRail && hits.rail !== null) {
          const trackRow = event.row - hits.rail.rowStart;
          const geometry = hits.rail.geometry;
          if (trackRow >= geometry.thumbTop && trackRow < geometry.thumbTop + geometry.thumbHeight) {
            this.#dragGrabOffset = trackRow - geometry.thumbTop;
            this.#viewport.setRailDragging(true);
          } else {
            this.#viewport.scrollTo(scrollForTrackPage(geometry, trackRow, frame.scrollTop, hits.viewportHeight), now);
          }
          activity = true;
          repaint = true;
          return true;
        }
        if (editorFrame !== undefined && event.row >= editorFrame.rowStart && event.row <= editorFrame.rowEnd) {
          const handled = this.editor.handlePointer({
            kind: "press",
            button: event.button,
            column: event.column,
            row: event.row - editorFrame.rowStart + 1,
          });
          if (!handled) this.#dockPointerSuppressed = true;
          repaint = true;
          return true;
        }
        if (event.row > hits.viewportHeight) {
          // Status, non-text editor chrome, widgets, and footer are controls.
          // Consume the complete drag so terminal selection cannot paint them.
          this.#dockPointerSuppressed = true;
          return true;
        }
        if (event.row >= 1 && event.row <= hits.viewportHeight && event.column <= frame.contentWidth) {
          this.#viewport.pressSelection(event.column, event.row, now);
          repaint = true;
          return true;
        }
        return false;
      }
      if (event.kind === "release") {
        if (this.editor.ownsPointer() && this.#editorPointerFrame !== undefined) {
          this.editor.handlePointer({
            kind: "release",
            button: event.button,
            column: event.column,
            row: event.row - this.#editorPointerFrame.rowStart + 1,
          });
          repaint = true;
          return true;
        }
        if (this.#viewport.releaseSelection()) {
          this.#stopSelectionAutoScroll();
          repaint = true;
          return true;
        }
        if (this.#dragGrabOffset !== null) {
          this.#dragGrabOffset = null;
          this.#viewport.setRailDragging(false);
          repaint = true;
          return true;
        }
        if (this.#dockPointerSuppressed) {
          this.#dockPointerSuppressed = false;
          return true;
        }
      }
      return false;
    });
    if (activity) this.#scheduleViewportActivityExpiry();
    if (repaint) this.#componentRuntime.requestRender();
    return routed;
  }

  #updateSelectionAutoScroll(column: number, row: number, viewportHeight: number): void {
    const beyondEdge = row <= 1 || row > viewportHeight;
    if (!beyondEdge) {
      this.#stopSelectionAutoScroll();
      return;
    }
    this.#selectionAutoScrollPointer = { column, row };
    if (this.#selectionAutoScrollTimer !== undefined) return;
    this.#selectionAutoScrollTimer = setTimeout(
      () => this.#selectionAutoScrollTick(),
      SELECTION_AUTO_SCROLL_INTERVAL_MS,
    );
    this.#selectionAutoScrollTimer.unref?.();
  }

  #selectionAutoScrollTick(): void {
    this.#selectionAutoScrollTimer = undefined;
    const pointer = this.#selectionAutoScrollPointer;
    if (pointer === undefined || !this.#viewport.selectionActive) {
      this.#stopSelectionAutoScroll();
      return;
    }
    const before = this.#viewport.scrollTop;
    const rowsPerTick = scrollbarSelectionRows(this.#viewportConfig.scrollbarSpeed);
    for (let row = 0; row < rowsPerTick; row += 1) {
      const previous = this.#viewport.scrollTop;
      this.#viewport.extendSelection(pointer.column, pointer.row);
      if (this.#viewport.scrollTop === previous) break;
    }
    if (this.#viewport.scrollTop === before) {
      this.#stopSelectionAutoScroll();
      return;
    }
    this.#componentRuntime.requestRender();
    this.#scheduleViewportActivityExpiry();
    this.#selectionAutoScrollTimer = setTimeout(
      () => this.#selectionAutoScrollTick(),
      SELECTION_AUTO_SCROLL_INTERVAL_MS,
    );
    this.#selectionAutoScrollTimer.unref?.();
  }

  #stopSelectionAutoScroll(): void {
    if (this.#selectionAutoScrollTimer !== undefined) clearTimeout(this.#selectionAutoScrollTimer);
    this.#selectionAutoScrollTimer = undefined;
    this.#selectionAutoScrollPointer = undefined;
  }

  #scheduleViewportActivityExpiry(): void {
    if (this.#viewportActivityTimer !== undefined) clearTimeout(this.#viewportActivityTimer);
    this.#viewportActivityTimer = setTimeout(() => {
      this.#viewportActivityTimer = undefined;
      this.#componentRuntime.requestRender();
    }, 925);
    this.#viewportActivityTimer.unref?.();
  }

  #renderDock(width: number): readonly string[] {
    return this.#renderDockLayout(width).rows;
  }

  #renderDockLayout(width: number): {
    readonly rows: readonly string[];
    readonly rowsWithoutStatus: readonly string[];
    readonly statusRows: readonly string[];
    readonly stableBottomRows: number;
    readonly editorOffsetWithStatus: number;
    readonly editorOffsetWithoutStatus: number;
    readonly inputRows: number;
  } {
    const queued = this.#view.editor.queuedSubmissions.length === 0 ? [] : this.#queued.render(width);
    const statusRows = this.#renderStatus(width);
    const aboveWidgets = this.#renderWidgets("aboveEditor", width);
    const input = this.#inputSurface.render(width);
    const belowWidgets = this.#renderWidgets("belowEditor", width);
    const footer = this.#renderFooter(width);
    return {
      rows: [...queued, ...statusRows, ...aboveWidgets, ...input, ...belowWidgets, ...footer],
      rowsWithoutStatus: [...queued, ...aboveWidgets, ...input, ...belowWidgets, ...footer],
      statusRows,
      stableBottomRows: aboveWidgets.length + input.length + belowWidgets.length + footer.length,
      editorOffsetWithStatus: queued.length + statusRows.length + aboveWidgets.length,
      editorOffsetWithoutStatus: queued.length + aboveWidgets.length,
      inputRows: input.length,
    };
  }

  layoutRoot(): PiTuiLayoutNode {
    const document = layoutPort(width => this.#renderDocument(width), () => this.invalidate());
    const queued = layoutPort(width => this.#view.editor.queuedSubmissions.length === 0 ? [] : this.#queued.render(width), () => this.#queued.invalidate());
    const aboveWidgets = layoutPort(width => this.#renderWidgets("aboveEditor", width), () => this.#invalidateExtensions());
    const status = layoutPort(width => this.#renderStatus(width), () => this.#status.invalidate());
    const editor = layoutPort(width => this.#inputSurface.render(width), () => this.#inputSurface.invalidate(), data => this.#inputSurface.handleInput?.(data));
    const belowWidgets = layoutPort(width => this.#renderWidgets("belowEditor", width), () => this.#invalidateExtensions());
    const footer = layoutPort(width => this.#renderFooter(width), () => (this.#extensionFooter ?? this.#footer).invalidate());
    return {
      type: "stack",
      direction: "vertical",
      children: [
        {
          basis: 0,
          grow: 1,
          shrink: 1,
          minSize: 1,
          node: {
            type: "scroll",
            id: "transcript",
            follow: "end",
            primary: true,
            overscroll: "chain",
            scrollbar: "auto",
            scrollbarStyle: text => piTheme().bg("scrollbarThumb", text),
            child: { type: "component", component: document },
          },
        },
        {
          basis: "auto",
          grow: 0,
          shrink: 1,
          minSize: 1,
          node: {
            type: "stack",
            direction: "vertical",
            children: [
              { shrink: 1, minSize: 0, node: { type: "component", component: queued } },
              { shrink: 1, minSize: 0, node: { type: "component", component: status } },
              { shrink: 1, minSize: 0, node: { type: "component", component: aboveWidgets } },
              { shrink: 1, minSize: 3, node: { type: "component", component: editor } },
              { shrink: 1, minSize: 0, node: { type: "component", component: belowWidgets } },
              { shrink: 1, minSize: 1, node: { type: "component", component: footer } },
            ],
          },
        },
      ],
    };
  }

  #renderDocument(width: number): readonly string[] {
    return this.#renderDocumentLayout(width).rows;
  }

  #renderDocumentLayout(width: number): { readonly rows: readonly string[]; readonly promptAnchors: readonly TranscriptPromptAnchor[] } {
    // Extension headers may animate independently of transcript revisions, so
    // only the stable built-in document participates in this frame cache.
    const cached = this.#extensionHeader === null ? this.#documentLayouts.get(width) : undefined;
    if (cached !== undefined) return cached;
    const diagnostics = this.#view.diagnostics;
    const startupRows = diagnostics
      .filter(diagnostic => diagnostic.code === "engine-startup")
      .flatMap(diagnostic => renderPiShellStartupDiagnostic(diagnostic, width));
    const resourceRows = this.#customViewport ? [] : [...this.resources.render(width)];
    if (resourceRows.at(-1) === "") resourceRows.pop();
    const headerRows = this.#extensionHeader !== null
      ? this.#extensionHeader.render(width)
      : this.#customViewport ? [] : this.header.render(width);
    const rows: string[] = [
      ...startupRows,
      ...headerRows,
      ...resourceRows,
    ];
    const promptAnchors: TranscriptPromptAnchor[] = [];
    for (let index = 0; index < this.#transcriptOrder.length; index += 1) {
      const id = this.#transcriptOrder[index]!;
      const block = this.#blocksById.get(id);
      if (!this.#thinkingVisible && block?.kind === "thinking") continue;
      const blockWidth = this.#customViewport
        && block?.kind === "user"
        && this.#viewportConfig.scrollbarAppearance !== "hidden"
        && width > 1
        ? width - 1
        : width;
      const blockRows = this.#blockRows(id, block, blockWidth);
      if (block?.kind === "user") {
        // The first natural prompt gets one breathing row at the document top.
        // Once scrolling advances, the prompt itself reaches row zero and then
        // becomes sticky there, so the spacer is never pinned with it.
        if (this.#customViewport && index === 0) rows.push("");
        else if (index > 0) rows.push("");
      }
      const firstRow = rows.length;
      rows.push(...blockRows);
      if (block?.kind === "user" && blockRows[0] !== undefined) {
        promptAnchors.push({
          id: block.id,
          firstRow,
          lastRow: Math.max(firstRow, rows.length - 1),
          sourceRow: pinnedPromptSourceRow(block, blockRows[0], blockWidth),
        });
      }
    }
    rows.push(...diagnostics
      .filter(diagnostic => diagnostic.code === "package-updates")
      .flatMap(diagnostic => renderPiShellPackageUpdateNotice(
        diagnostic.message.split("\n").filter(line => line.startsWith("- ")).map(line => line.slice(2)),
        width,
      )));
    rows.push(...diagnostics
      .filter(diagnostic => diagnostic.code !== "engine-startup" && diagnostic.code !== "package-updates")
      .slice(-3)
      .flatMap(diagnostic =>
        renderPiShellTranscriptBlock({
          id: `diagnostic-${diagnostic.sequence}`,
          kind: diagnostic.severity === "error" ? "error" : "system",
          status: "finalized",
          revision: diagnostic.sequence,
          title: diagnostic.code,
          text: diagnostic.message,
          payload: {},
        }, width, this.#cwd)));
    const layout = { rows: Object.freeze(rows), promptAnchors: Object.freeze(promptAnchors) };
    if (this.#extensionHeader === null) {
      this.#documentLayouts.set(width, layout);
      // The custom viewport commonly probes full width and reserved-rail width.
      while (this.#documentLayouts.size > 2) this.#documentLayouts.delete(this.#documentLayouts.keys().next().value!);
    }
    return layout;
  }

  /**
   * Rows for one transcript block. A finalized block renders once for a given revision
   * and width and is reused after that, so a frame costs what changed rather than what
   * the session has accumulated. A live block, and anything the shell drives itself, is
   * rendered every time because its content is still moving.
   */
  #blockRows(id: string, block: OwnedUiSessionViewModel["transcript"][number] | undefined, width: number): readonly string[] {
    const component = this.#transcript.get(id);
    if (component === undefined) return [];
    const render = (): readonly string[] => {
      const rows = component.render(width);
      if (!this.#customViewport || block?.kind === "user") return rows;
      return rows.map(row => nativeHyperlinkStyle(row, text => piTheme().fg("mdLink", text)));
    };
    if (block === undefined || block.status !== "finalized") return render();

    let byWidth = this.#renderedRows.get(id);
    const cached = byWidth?.get(width);
    if (cached?.revision === block.revision) return cached.rows;
    const rows = render();
    if (byWidth === undefined) {
      byWidth = new Map();
      this.#renderedRows.set(id, byWidth);
    }
    byWidth.set(width, { revision: block.revision, rows });
    // Bare A1 probes full width before reserving the overflowing rail column;
    // retain both widths without turning resize history into an unbounded cache.
    while (byWidth.size > 2) byWidth.delete(byWidth.keys().next().value!);
    return rows;
  }

  transcriptComponent(id: string): PiShellTranscriptComponentPort | undefined {
    return this.#transcript.get(id);
  }

  appendWorkflowStatus(message: string): void {
    const previousId = this.#lastWorkflowStatusId;
    if (previousId !== undefined
      && this.#transcriptOrder.at(-1) === previousId
      && this.#workflowStatusAnchors.get(previousId) === this.#view.transcript.length) {
      this.#workflowStatusMessages.set(previousId, message);
      this.#documentLayouts.clear();
      this.invalidate();
      return;
    }
    const id = this.#appendAnchoredWorkflowComponent(width => [
      "",
      ...renderPiShellStatusText(this.#workflowStatusMessages.get(id) ?? message, width),
    ]);
    this.#workflowStatusMessages.set(id, message);
    this.#lastWorkflowStatusId = id;
  }

  appendWorkflowResult(result: PiWorkflowResult): void {
    if (result.command === "reload" && result.outcome === "completed") {
      this.appendWorkflowStatus(result.message);
      return;
    }
    if (result.command === "session" && result.outcome === "completed" && result.presentation?.kind === "session-info") {
      this.#lastWorkflowStatusId = undefined;
      const sessionInfo = createPiShellSessionInfo(result.presentation);
      this.#appendAnchoredWorkflowComponent(width => sessionInfo.render(width), () => sessionInfo.dispose?.());
      return;
    }
    if (result.command === "hotkeys" && result.outcome === "completed") {
      this.#lastWorkflowStatusId = undefined;
      const hotkeys = createPiShellHotkeys();
      this.#appendAnchoredWorkflowComponent(width => hotkeys.render(width), () => hotkeys.dispose?.());
      return;
    }
    if (result.command === "changelog" && result.outcome === "completed") {
      this.#lastWorkflowStatusId = undefined;
      const changelog = createPiShellChangelog(result.detail ?? "No changelog entries found.");
      this.#appendAnchoredWorkflowComponent(width => changelog.render(width), () => changelog.dispose?.());
      return;
    }
    if (result.outcome === "failed") {
      this.#lastWorkflowStatusId = undefined;
      const warning = (result.command === "name" && result.message.startsWith("Usage:"))
        || (result.command === "reload" && result.message.startsWith("Wait for "));
      const prefix = warning ? "Warning" : "Error";
      const color = warning ? "warning" : "error";
      this.#appendAnchoredWorkflowComponent(() => ["", ` ${piTheme().fg(color, `${prefix}: ${result.message}`)}`]);
      return;
    }
    if (result.outcome === "completed" && (result.command === "quit" || result.command === "compact")) return;
    if (result.command === "new" && result.outcome === "completed") {
      this.#lastWorkflowStatusId = undefined;
      this.#appendAnchoredWorkflowComponent(() => ["", ` ${piTheme().fg("accent", result.message)}`]);
      return;
    }
    if (result.command === "name" && result.outcome === "completed") {
      this.#lastWorkflowStatusId = undefined;
      this.#appendAnchoredWorkflowComponent(() => [
        ...(result.detail ? ["", ` ${piTheme().fg("warning", `Warning: ${result.detail}`)}`] : []),
        "",
        ` ${piTheme().fg("dim", result.message)}`,
      ]);
      return;
    }
    if (result.command === "debug" && result.outcome === "completed") {
      this.#lastWorkflowStatusId = undefined;
      this.#appendAnchoredWorkflowComponent(() => [
        "",
        ` ${piTheme().fg("accent", result.message)}`,
        ...(result.detail ? [` ${piTheme().fg("muted", result.detail)}`] : []),
      ]);
      return;
    }
    if (result.command === "arminsayshi" && result.outcome === "completed") {
      this.#lastWorkflowStatusId = undefined;
      const armin = createPiShellArmin(this.#componentRuntime);
      this.#appendAnchoredWorkflowComponent(width => ["", ...armin.render(width)], () => armin.dispose?.());
      return;
    }
    if (result.command === "dementedelves" && result.outcome === "completed") {
      this.#lastWorkflowStatusId = undefined;
      const announcement = createPiShellEarendilAnnouncement();
      this.#appendAnchoredWorkflowComponent(width => ["", ...announcement.render(width)], () => announcement.dispose?.());
      return;
    }
    const message = result.command === "share" && result.detail
      ? `${result.message}\nGist: ${result.detail}`
      : result.message;
    this.appendWorkflowStatus(message);
  }

  appendDaxnuts(): void {
    this.#lastWorkflowStatusId = undefined;
    const daxnuts = createPiShellDaxnuts(this.#componentRuntime);
    this.#appendAnchoredWorkflowComponent(width => ["", ...daxnuts.render(width)], () => daxnuts.dispose?.());
  }

  toggleThinkingVisibility(): void {
    this.#thinkingVisible = !this.#thinkingVisible;
    this.#documentLayouts.clear();
    this.invalidate();
  }

  get toolsExpanded(): boolean {
    return this.#toolsExpanded;
  }

  setToolsExpanded(expanded: boolean): void {
    this.#setToolsExpanded(expanded);
  }

  setExtensionWidget(key: string, component: PiShellComponentPort | null, placement: "aboveEditor" | "belowEditor"): void {
    const previous = this.#extensionWidgets.get(key)?.component;
    if (component === null) this.#extensionWidgets.delete(key);
    else this.#extensionWidgets.set(key, { component, placement });
    if (previous !== undefined && previous !== component) previous.dispose?.();
    this.invalidate();
  }

  setExtensionHeader(component: PiShellComponentPort | null): void {
    if (this.#extensionHeader !== component) this.#extensionHeader?.dispose?.();
    this.#extensionHeader = component;
    this.#documentLayouts.clear();
    this.invalidate();
  }

  setExtensionFooter(component: PiShellComponentPort | null): void {
    if (this.#extensionFooter !== component) this.#extensionFooter?.dispose?.();
    this.#extensionFooter = component;
    this.invalidate();
  }

  setExtensionStatus(key: string, text: string | undefined): void {
    if (text === undefined) this.#extensionStatuses.delete(key);
    else this.#extensionStatuses.set(key, text);
    this.#footer.update(this.#viewWithExtensionStatuses(this.#view));
    this.invalidate();
  }

  setExtensionWorking(message: string | undefined, visible = this.#extensionWorkingVisible): void {
    this.#extensionWorkingMessage = message;
    this.#extensionWorkingVisible = visible;
    this.#status.setWorkingOverride(visible ? message : undefined);
    this.invalidate();
  }

  resetWorkflowPresentation(): void {
    for (const id of this.#workflowStatusAnchors.keys()) {
      this.#transcript.get(id)?.dispose?.();
      this.#transcript.delete(id);
    }
    this.#workflowStatusAnchors.clear();
    this.#workflowStatusMessages.clear();
    this.#transcriptOrder = this.#transcriptOrder.filter(id => !id.startsWith("workflow-status-"));
    this.#lastWorkflowStatusId = undefined;
    this.#documentLayouts.clear();
    this.invalidate();
  }

  resetExtensionUi(): void {
    this.#extensionHeader?.dispose?.();
    this.#extensionFooter?.dispose?.();
    for (const { component } of this.#extensionWidgets.values()) component.dispose?.();
    this.#extensionHeader = null;
    this.#extensionFooter = null;
    this.#extensionWidgets.clear();
    this.#extensionStatuses.clear();
    this.#extensionWorkingMessage = undefined;
    this.#status.setWorkingOverride(undefined);
    this.#footer.update(this.#viewWithExtensionStatuses(this.#view));
    // An extension renderer may have drawn transcript blocks that are now unrendered by it.
    this.#renderedRows.clear();
    this.#documentLayouts.clear();
    this.invalidate();
  }

  addExtensionNotification(message: string, type: "info" | "warning" | "error"): void {
    if (type === "info") {
      this.appendWorkflowStatus(message);
      return;
    }
    this.#lastWorkflowStatusId = undefined;
    const prefix = type === "warning" ? "Warning" : "Error";
    this.#appendAnchoredWorkflowComponent(() => ["", ` ${piTheme().fg(type, `${prefix}: ${message}`)}`]);
  }

  extensionFooterData(): unknown {
    return {
      getGitBranch: () => this.#view.status.footer?.branch ?? null,
      getExtensionStatuses: () => new Map(this.#extensionStatuses),
      getAvailableProviderCount: () => this.#view.status.footer?.availableProviderCount ?? 1,
      onBranchChange: () => () => {},
    };
  }

  usesDefaultInputSurface(): boolean {
    return this.#inputSurface === this.editor;
  }

  setInputSurface(component: PiShellComponentPort | null, disposePrevious = true): void {
    const next = component ?? this.editor;
    if (next === this.#inputSurface) return;
    this.#inputSurface.setFocused?.(false);
    if (disposePrevious && this.#inputSurface !== this.editor) this.#inputSurface.dispose?.();
    this.#inputSurface = next;
    this.#inputSurface.setFocused?.(true);
    this.invalidate();
  }

  handleInput(data: string): void {
    this.#inputSurface.handleInput?.(data);
  }

  invalidate(): void {
    this.header.invalidate();
    this.resources.invalidate();
    for (const component of this.#transcript.values()) component.invalidate();
    this.editor.invalidate();
    if (this.#inputSurface !== this.editor) this.#inputSurface.invalidate();
    this.#invalidateExtensions();
    this.#status.invalidate();
    this.#footer.invalidate();
    this.#queued.invalidate();
  }

  setFocused(focused: boolean): void {
    this.#inputSurface.setFocused?.(focused);
  }

  dispose(): void {
    this.clearViewportPointerState();
    this.#themeUnsubscribe();
    this.header.dispose?.();
    this.resources.dispose?.();
    for (const component of this.#transcript.values()) component.dispose?.();
    this.#transcript.clear();
    this.#renderedRows.clear();
    this.#documentLayouts.clear();
    if (this.#inputSurface !== this.editor) this.#inputSurface.dispose?.();
    this.#extensionHeader?.dispose?.();
    this.#extensionFooter?.dispose?.();
    for (const { component } of this.#extensionWidgets.values()) component.dispose?.();
    this.#extensionWidgets.clear();
    this.editor.dispose?.();
    this.#status.dispose?.();
    this.#footer.dispose?.();
    this.#queued.dispose?.();
  }

  #syncTranscript(blocks: OwnedUiSessionViewModel["transcript"]): void {
    const previousIds = this.#transcriptOrder.filter(id => !id.startsWith("workflow-status-"));
    const transcriptChanged = previousIds.length !== blocks.length || blocks.some((block, index) => {
      const previous = this.#blocksById.get(block.id);
      return previousIds[index] !== block.id || previous?.revision !== block.revision;
    });
    if (transcriptChanged) this.#documentLayouts.clear();
    this.#blocksById.clear();
    for (const block of blocks) this.#blocksById.set(block.id, block);
    const nextIds = new Set(blocks.map(block => block.id));
    for (const [id, component] of this.#transcript) {
      if (id.startsWith("workflow-status-") || nextIds.has(id)) continue;
      component.dispose?.();
      this.#transcript.delete(id);
      this.#renderedRows.delete(id);
    }
    for (const block of blocks) {
      const component = this.#transcript.get(block.id);
      if (component === undefined) {
        const created = createPiShellTranscriptComponent(block, this.#cwd, this.#extensionRenderers, this.#submittedPromptComposer);
        created.setExpanded(this.#toolsExpanded);
        this.#transcript.set(block.id, created);
      } else if (component.revision !== block.revision) {
        component.update(block);
      }
    }
    const statusIds = [...this.#workflowStatusAnchors.keys()];
    const order: string[] = [];
    for (let index = 0; index <= blocks.length; index += 1) {
      for (const statusId of statusIds) {
        if (this.#workflowStatusAnchors.get(statusId) === index) order.push(statusId);
      }
      const block = blocks[index];
      if (block !== undefined) order.push(block.id);
    }
    const placed = new Set(order);
    for (const statusId of statusIds) {
      if (!placed.has(statusId)) order.push(statusId);
    }
    this.#transcriptOrder = order;
  }

  #appendAnchoredWorkflowComponent(render: (width: number) => readonly string[], dispose?: () => void): string {
    this.#workflowTranscriptSequence += 1;
    const id = `workflow-status-${this.#workflowTranscriptSequence}`;
    const component: PiShellTranscriptComponentPort = {
      id,
      revision: 1,
      render,
      handleInput() {},
      invalidate() {},
      update() {},
      setExpanded() {},
      ...(dispose === undefined ? {} : { dispose }),
    };
    this.#transcript.set(id, component);
    this.#workflowStatusAnchors.set(id, this.#view.transcript.length);
    this.#transcriptOrder.push(id);
    this.#documentLayouts.clear();
    this.invalidate();
    return id;
  }

  #renderWidgets(placement: "aboveEditor" | "belowEditor", width: number): readonly string[] {
    const rows = [...this.#extensionWidgets.values()]
      .filter(widget => widget.placement === placement)
      .flatMap(widget => widget.component.render(width));
    return placement === "aboveEditor" ? ["", ...rows] : rows;
  }

  #renderStatus(width: number): readonly string[] {
    return this.#status.render(width);
  }

  #renderFooter(width: number): readonly string[] {
    return (this.#extensionFooter ?? this.#footer).render(width);
  }

  #viewWithExtensionStatuses(view: OwnedUiSessionViewModel): OwnedUiSessionViewModel {
    const footer = view.status.footer;
    const statuses = new Map(footer?.extensionStatuses ?? []);
    for (const [key, text] of this.#extensionStatuses) statuses.set(key, text);
    return {
      ...view,
      status: {
        ...view.status,
        footer: {
          branch: footer?.branch ?? null,
          sessionName: footer?.sessionName ?? null,
          availableProviderCount: footer?.availableProviderCount ?? 1,
          extensionStatuses: [...statuses],
        },
      },
    };
  }

  #invalidateExtensions(): void {
    this.#extensionHeader?.invalidate();
    this.#extensionFooter?.invalidate();
    for (const { component } of this.#extensionWidgets.values()) component.invalidate();
  }

  #setToolsExpanded(expanded: boolean): void {
    this.#toolsExpanded = expanded;
    this.header.setExpanded(expanded);
    this.resources.setExpanded(expanded);
    for (const component of this.#transcript.values()) component.setExpanded(expanded);
    // Expansion changes what a block draws without changing its revision.
    this.#renderedRows.clear();
    this.#documentLayouts.clear();
    this.invalidate();
  }
}

const SELECTION_AUTO_SCROLL_INTERVAL_MS = 30;
const SHIFT_UP_INPUTS = new Set(["\u001b[1;2A"]);
const SHIFT_DOWN_INPUTS = new Set(["\u001b[1;2B"]);
const SCROLLBAR_CELL_RESET = "\u001b[22;23;24;25;27;28;29;39;54;55m";
const TERMINAL_BACKGROUND = /\u001b\[(?:4[0-9]|10[0-7]|48(?:[;:][0-9;:]*)?)m/g;

/** Repaint a source prompt with viewport chrome while preserving text, links, and foreground roles. */
function withoutTerminalBackground(text: string): string {
  return text.replace(TERMINAL_BACKGROUND, "");
}

/** A pinned timestamp is content now, not secondary transcript metadata. */
function pinnedPromptSourceRow(
  block: OwnedUiSessionViewModel["transcript"][number],
  sourceRow: string,
  width: number,
): string {
  if (typeof block.payload !== "object" || block.payload === null) return sourceRow;
  const value = (block.payload as Record<string, unknown>).timestamp;
  if (typeof value !== "number" || !Number.isFinite(value)) return sourceRow;
  const timestamp = formatSubmittedPromptTime(value);
  if (timestamp === null || submittedPromptLayout(width, value).timestamp === null) return sourceRow;
  const rowWidth = displayWidth(sourceRow);
  const timestampWidth = displayWidth(timestamp);
  if (rowWidth < timestampWidth) return sourceRow;
  return overlaySpan(
    sourceRow,
    rowWidth - timestampWidth,
    rowWidth,
    piTheme().fg("userMessageText", timestamp),
  );
}

function layoutPort(
  render: (width: number) => readonly string[],
  invalidate: () => void,
  handleInput?: (data: string) => void,
): PiTuiComponentPort {
  return {
    render,
    invalidate,
    ...(handleInput === undefined ? {} : { handleInput }),
  };
}

export function shellResourceEntries(backend: OwnedUiBackendPort): readonly PiShellResourceEntry[] {
  const resources: PiShellResourceEntry[] = backend.nonVisualResources().map(resource => ({
    section: resource.kind === "skill"
      ? "Skills"
      : resource.kind === "prompt-template"
        ? "Prompts"
        : resource.kind === "theme"
          ? "Themes"
          : "Context",
    label: resource.kind === "prompt-template"
      ? `/${resource.label}`
      : resource.kind === "agent-context" || resource.kind === "system-prompt"
        ? compactResourceLabel(resource.sourcePath ?? resource.label)
        : resource.label,
    sourcePath: resource.sourcePath,
    diagnostic: resource.diagnostic,
  }));
  const extensions = backend.extensionResources().filter(extension => !extension.hidden);
  const loadedExtensions = extensions.filter(extension => extension.diagnostic === null);
  const extensionLabels = compactExtensionLabels(loadedExtensions);
  for (const extension of extensions) {
    const labelIndex = loadedExtensions.indexOf(extension);
    resources.push({
      section: "Extensions",
      label: extensionLabels[labelIndex] ?? compactResourceLabel(extension.sourcePath ?? extension.resolvedPath ?? "extension"),
      sourcePath: extension.sourcePath ?? extension.resolvedPath,
      diagnostic: extension.diagnostic,
    });
  }
  return resources;
}

function compactResourceLabel(path: string): string {
  const segments = compactPathSegments(path);
  const leaf = segments.at(-1) ?? path;
  if ((leaf === "index.ts" || leaf === "index.js") && segments.length > 1) return segments.at(-2) ?? leaf;
  return leaf;
}

/**
 * Pinned from InteractiveMode's compact extension-label helpers at Pi commit
 * 914cf1472e715297caa30db4b9535d534a9eb718. The source metadata crosses an
 * A1-owned boundary first; the owned shell never inspects Pi's private root.
 */
function compactExtensionLabels(extensions: readonly OwnedPiExtensionResourceSummary[]): readonly string[] {
  const localExtensions = extensions
    .filter(extension => !isPackageExtensionSource(extension.sourceInfo))
    .map(extension => {
      const path = extension.sourcePath ?? extension.resolvedPath ?? "extension";
      const segments = compactPathSegments(path);
      if (segments.length > 1 && (segments.at(-1) === "index.ts" || segments.at(-1) === "index.js")) segments.pop();
      return { extension, segments };
    });

  return extensions.map(extension => {
    const resourcePath = extension.sourcePath ?? extension.resolvedPath ?? "extension";
    if (isPackageExtensionSource(extension.sourceInfo)) {
      return compactPackageExtensionLabel(resourcePath, extension.sourceInfo);
    }
    const localIndex = localExtensions.findIndex(item => item.extension === extension);
    const segments = localExtensions[localIndex]?.segments;
    if (!segments || segments.length === 0) return compactResourceLabel(resourcePath);
    for (let count = 1; count <= segments.length; count += 1) {
      const candidate = segments.slice(-count).join("/");
      if (localExtensions.every((item, itemIndex) => itemIndex === localIndex || item.segments.slice(-count).join("/") !== candidate)) {
        return candidate;
      }
    }
    return segments.join("/");
  });
}

function compactPackageExtensionLabel(resourcePath: string, sourceInfo: OwnedPiExtensionSourceSummary): string {
  const sourceLabel = compactPackageSourceLabel(sourceInfo.source);
  if (!sourceLabel) return compactResourceLabel(resourcePath);
  const shortPath = shortPackagePath(resourcePath, sourceInfo).replaceAll("\\", "/");
  const packagePath = shortPath.startsWith("extensions/") ? shortPath.slice("extensions/".length) : shortPath;
  const slash = packagePath.lastIndexOf("/");
  const fileName = slash < 0 ? packagePath : packagePath.slice(slash + 1);
  const directory = slash < 0 ? "" : packagePath.slice(0, slash);
  const extension = fileName.lastIndexOf(".");
  const name = extension <= 0 ? fileName : fileName.slice(0, extension);
  if (name === "index") return !directory || directory === "." ? sourceLabel : `${sourceLabel}:${directory}`;
  return `${sourceLabel}:${packagePath}`;
}

function compactPackageSourceLabel(source: string): string {
  if (source.startsWith("npm:")) return source.slice("npm:".length) || source;
  if (!source.startsWith("git:")) return source;
  const gitSource = source.slice("git:".length).trim();
  let repositoryPath: string | undefined;
  const scpLike = gitSource.match(/^git@[^:]+:(.+)$/);
  if (scpLike?.[1]) {
    repositoryPath = scpLike[1];
  } else if (/^[a-z]+:\/\//i.test(gitSource)) {
    try {
      repositoryPath = new URL(gitSource).pathname.replace(/^\/+/, "");
    } catch {
      return source;
    }
  } else {
    const slash = gitSource.indexOf("/");
    if (slash >= 0) repositoryPath = gitSource.slice(slash + 1);
  }
  if (!repositoryPath) return source;
  const ref = repositoryPath.indexOf("@");
  const withoutRef = ref < 0 ? repositoryPath : repositoryPath.slice(0, ref);
  return withoutRef.replace(/\.git$/, "") || source;
}

function shortPackagePath(resourcePath: string, sourceInfo: OwnedPiExtensionSourceSummary): string {
  const fullPath = normalizeResourcePath(resourcePath);
  const baseDir = sourceInfo.baseDir === null ? undefined : normalizeResourcePath(sourceInfo.baseDir).replace(/\/$/, "");
  if (baseDir) {
    const npmRoot = baseDir.match(/^(.*\/node_modules)\/(@?[^/]+(?:\/[^/]+)?)$/);
    if (npmRoot?.[1] && fullPath.startsWith(`${npmRoot[1]}/`)) return relativeResourcePath(baseDir, fullPath);
    if (fullPath === baseDir) return ".";
    if (fullPath.startsWith(`${baseDir}/`)) return fullPath.slice(baseDir.length + 1);
  }
  const npmMatch = fullPath.match(/node_modules\/(@?[^/]+(?:\/[^/]+)?)\/(.*)/);
  if (npmMatch?.[2] && sourceInfo.source.startsWith("npm:")) return npmMatch[2];
  const gitMatch = fullPath.match(/git\/[^/]+\/[^/]+\/(.*)/);
  if (gitMatch?.[1] && sourceInfo.source.startsWith("git:")) return gitMatch[1];
  return resourcePath;
}

function relativeResourcePath(from: string, to: string): string {
  const fromSegments = from.split("/").filter(Boolean);
  const toSegments = to.split("/").filter(Boolean);
  let common = 0;
  while (common < fromSegments.length && common < toSegments.length
    && fromSegments[common]?.toLowerCase() === toSegments[common]?.toLowerCase()) common += 1;
  return [...fromSegments.slice(common).map(() => ".."), ...toSegments.slice(common)].join("/") || ".";
}

function compactPathSegments(path: string): string[] {
  return normalizeResourcePath(path).split("/").filter(segment => segment.length > 0 && segment !== "~");
}

function normalizeResourcePath(path: string): string {
  return path.replaceAll("\\", "/");
}

function isPackageExtensionSource(sourceInfo: OwnedPiExtensionSourceSummary | null): sourceInfo is OwnedPiExtensionSourceSummary {
  const source = sourceInfo?.source ?? "";
  return source.startsWith("npm:") || source.startsWith("git:");
}
