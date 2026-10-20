import { acceptsTranscriptUpdate } from "../../contracts/owned-ui/index.js";
import type { OwnedUiSessionViewModel, OwnedUiViewportSettings } from "../../contracts/owned-ui/index.js";
import { formatSubmittedPromptTime, submittedPromptLayout } from "../../ui/components/submitted-prompt.js";
import { nativeHyperlinkStyle, overlaySpan } from "../../ui/components/spans.js";
import { displayWidth } from "../../ui/components/text.js";
import type { TranscriptPromptAnchor } from "../../ui/components/transcript-viewport.js";
import {
  createPiShellChangelog,
  createPiShellCollapsedChangelog,
  renderPiShellPackageUpdateNotice,
  renderPiShellReleaseUpdateNotice,
} from "../../integrations/pi/components/shell-presenters-info.js";
import {
  isPiPromptStyleCompaction,
  paintPiSubmittedPromptTimestamp,
  renderPiShellStartupDiagnostic,
  renderPiShellTranscriptBlock,
} from "../../integrations/pi/components/shell-presenters-transcript.js";
import { piTheme } from "../../integrations/pi/components/upstream/theme/theme.js";
import type { PiShellTranscriptComponentPort } from "../../integrations/pi/components/shell-shared-facade.js";

type TranscriptBlock = OwnedUiSessionViewModel["transcript"][number];

export interface TranscriptDocumentLayout {
  readonly rows: readonly string[];
  readonly promptAnchors: readonly TranscriptPromptAnchor[];
  readonly liveTailStartRow: number | undefined;
}

/**
 * Why the document's caches must drop. Layout-only reasons keep each block's rendered rows; the
 * others also drop every block's rows because what a block draws has changed without its revision.
 */
export type TranscriptInvalidation =
  | "editor-padding"
  | "diagnostics"
  | "workflow-status"
  | "extension-header"
  | "viewport-config"
  | "extension-renderers"
  | "block-presentation"
  | "tools-expanded"
  | "repaint";

const LAYOUT_ONLY: ReadonlySet<TranscriptInvalidation> = new Set(["editor-padding", "diagnostics", "workflow-status", "extension-header"]);
const WORKFLOW_STATUS_PREFIX = "workflow-status-";

/** What the document reads from the shell around it on every uncached layout. */
export interface TranscriptDocumentChrome {
  diagnostics(): OwnedUiSessionViewModel["diagnostics"];
  /** The extension header's rows when one is set, else the built-in header's rows for this layout. */
  headerRows(width: number): readonly string[];
  /** The loaded-resources listing the pinned layout shows above the transcript. */
  resourceRows(width: number): readonly string[];
  /** An extension header may animate, so a document under one is never cached. */
  hasExtensionHeader(): boolean;
  thinkingVisible(): boolean;
  timeFormat(): OwnedUiViewportSettings["timeFormat"];
}

export interface TranscriptDocumentOptions {
  readonly customViewport: boolean;
  readonly cwd: string;
  /** Creates the component for a newly seen block; its change callback should call `blockChanged`. */
  mount(block: TranscriptBlock): PiShellTranscriptComponentPort;
  readonly chrome: TranscriptDocumentChrome;
}

/**
 * The only owner of the transcript's blocks, their order (including anchored workflow output), the
 * per-block rendered rows, and the per-width document layouts. Every cache drop names its reason.
 */
export class TranscriptDocument {
  readonly #options: TranscriptDocumentOptions;
  readonly #components = new Map<string, PiShellTranscriptComponentPort>();
  readonly #blocks = new Map<string, TranscriptBlock>();
  readonly #anchors = new Map<string, number>();
  #order: string[] = [];
  readonly #renderedRows = new Map<string, Map<number, { readonly revision: number; readonly presentationRevision: number; readonly rows: readonly string[] }>>();
  // Performance: document layouts are shared by wheel, rail, jump, and selection frames.
  readonly #layouts = new Map<number, TranscriptDocumentLayout>();
  #renders = 0;

  constructor(options: TranscriptDocumentOptions) {
    this.#options = options;
  }

  /** Block component renders since construction, for rendering evidence. */
  get renderCount(): number {
    return this.#renders;
  }

  get lastId(): string | undefined {
    return this.#order.at(-1);
  }

  component(id: string): PiShellTranscriptComponentPort | undefined {
    return this.#components.get(id);
  }

  components(): IterableIterator<PiShellTranscriptComponentPort> {
    return this.#components.values();
  }

  anchorOf(id: string): number | undefined {
    return this.#anchors.get(id);
  }

  /**
   * Applies one block: its component is created or updated in place and the order grows
   * only when the block is new. A streamed chunk costs one component update rather than a
   * walk of the whole transcript.
   */
  apply(block: TranscriptBlock): void {
    const current = this.#blocks.get(block.id);
    // Invariant: a full-view/final presentation may preempt queued partials. Never revive an older revision.
    if (current !== undefined && !acceptsTranscriptUpdate(current, block)) return;
    this.#blocks.set(block.id, block);
    const component = this.#components.get(block.id);
    if (component === undefined) {
      this.#components.set(block.id, this.#options.mount(block));
      this.#order.push(block.id);
    } else if (component.revision !== block.revision) {
      component.update(block);
    }
    // Performance: one chunk touches one block, and the updated component tracks its own dirtiness.
    // Invalidating the whole shell here would re-wrap the entire transcript per chunk.
    this.blockChanged(block.id);
  }

  /** Replaces the whole transcript with the view's blocks, keeping anchored workflow output in place. */
  sync(blocks: OwnedUiSessionViewModel["transcript"]): void {
    const previousIds = this.#order.filter(id => !id.startsWith(WORKFLOW_STATUS_PREFIX));
    const transcriptChanged = previousIds.length !== blocks.length || blocks.some((block, index) => {
      const previous = this.#blocks.get(block.id);
      return previousIds[index] !== block.id || previous?.revision !== block.revision;
    });
    if (transcriptChanged) this.#layouts.clear();
    this.#blocks.clear();
    for (const block of blocks) this.#blocks.set(block.id, block);
    const nextIds = new Set(blocks.map(block => block.id));
    for (const [id, component] of this.#components) {
      if (id.startsWith(WORKFLOW_STATUS_PREFIX) || nextIds.has(id)) continue;
      component.dispose?.();
      this.#components.delete(id);
      this.#renderedRows.delete(id);
    }
    for (const block of blocks) {
      const component = this.#components.get(block.id);
      if (component === undefined) this.#components.set(block.id, this.#options.mount(block));
      else if (component.revision !== block.revision) component.update(block);
    }
    const statusIds = [...this.#anchors.keys()];
    const order: string[] = [];
    for (let index = 0; index <= blocks.length; index += 1) {
      for (const statusId of statusIds) {
        if (this.#anchors.get(statusId) === index) order.push(statusId);
      }
      const block = blocks[index];
      if (block !== undefined) order.push(block.id);
    }
    const placed = new Set(order);
    for (const statusId of statusIds) {
      if (!placed.has(statusId)) order.push(statusId);
    }
    this.#order = order;
  }

  /** Appends workflow output anchored after the transcript's first `anchor` blocks. */
  appendAnchored(id: string, component: PiShellTranscriptComponentPort, anchor: number): void {
    if (!id.startsWith(WORKFLOW_STATUS_PREFIX)) throw new TypeError(`anchored output id must start with ${WORKFLOW_STATUS_PREFIX}`);
    this.#components.set(id, component);
    this.#anchors.set(id, anchor);
    this.#order.push(id);
    this.#layouts.clear();
  }

  /** Disposes every anchored workflow output and drops it from the order. */
  removeAnchored(): void {
    for (const id of this.#anchors.keys()) {
      this.#components.get(id)?.dispose?.();
      this.#components.delete(id);
    }
    this.#anchors.clear();
    this.#order = this.#order.filter(id => !id.startsWith(WORKFLOW_STATUS_PREFIX));
    this.#layouts.clear();
  }

  /** One block's component drew something new: drop its rows and every layout that contains them. */
  blockChanged(id: string): void {
    this.#renderedRows.delete(id);
    this.#layouts.clear();
  }

  invalidate(reason: TranscriptInvalidation): void {
    if (!LAYOUT_ONLY.has(reason)) this.#renderedRows.clear();
    this.#layouts.clear();
    if (reason === "repaint") for (const component of this.#components.values()) component.invalidate();
  }

  /** A new session binding owns new mounts even when it reuses semantic invocation ids. */
  reset(): void {
    for (const component of this.#components.values()) component.dispose?.();
    this.#components.clear();
    this.#blocks.clear();
    this.#order = [];
    this.#renderedRows.clear();
    this.#layouts.clear();
  }

  /** Disposes every component; anchors and blocks are left for a shell that is going away. */
  dispose(): void {
    for (const component of this.#components.values()) component.dispose?.();
    this.#components.clear();
    this.#renderedRows.clear();
    this.#layouts.clear();
  }

  layout(width: number): TranscriptDocumentLayout {
    const { chrome, customViewport } = this.#options;
    // Performance: extension headers may animate independently of transcript revisions, so
    // only the stable built-in document participates in this frame cache.
    const cacheable = !chrome.hasExtensionHeader();
    const cached = cacheable ? this.#layouts.get(width) : undefined;
    if (cached !== undefined) return cached;
    const diagnostics = chrome.diagnostics();
    const thinkingVisible = chrome.thinkingVisible();
    const startupRows = diagnostics
      // Compatibility: the pinned route keeps trust failures with Pi-style startup diagnostics;
      // bare A1 presents them in its prompt-adjacent notice dock instead.
      .filter(diagnostic => diagnostic.code === "engine-startup"
        || !customViewport && diagnostic.code === "project-trust")
      .flatMap(diagnostic => renderPiShellStartupDiagnostic(diagnostic, width));
    const resourceRows = [...chrome.resourceRows(width)];
    if (resourceRows.at(-1) === "") resourceRows.pop();
    const rows: string[] = [
      ...startupRows,
      ...chrome.headerRows(width),
      ...resourceRows,
    ];
    const promptAnchors: TranscriptPromptAnchor[] = [];
    // Rationale: a block that is still streaming re-renders every row it owns, so the frame
    // reports where its rows begin. Damage-aware painting uses that to tell a live block's
    // own reflow apart from a repaint that reaches settled rows.
    let liveTailStartRow: number | undefined;
    for (let index = 0; index < this.#order.length; index += 1) {
      const id = this.#order[index]!;
      const block = this.#blocks.get(id);
      if (!thinkingVisible && block?.kind === "thinking") continue;
      const promptLike = block !== undefined
        && (block.kind === "user" || customViewport && isPiPromptStyleCompaction(block));
      // Invariant: the custom viewport has already removed its rail gutter from this width.
      // Prompt-like and ordinary blocks therefore share one right content edge.
      const blockWidth = width;
      const blockRows = this.#blockRows(id, block, blockWidth);
      if (promptLike) {
        // Compatibility: the first natural prompt gets one breathing row at the document top.
        // Once scrolling advances, the prompt itself reaches row zero and then
        // becomes sticky there, so the spacer is never pinned with it.
        if (customViewport && index === 0) rows.push("");
        else if (index > 0) rows.push("");
      }
      const firstRow = rows.length;
      if (liveTailStartRow === undefined && block !== undefined && block.status !== "finalized") {
        liveTailStartRow = firstRow;
      }
      rows.push(...blockRows);
      if (promptLike && blockRows[0] !== undefined) {
        const source = pinnedPromptSource(block, blockRows[0], blockWidth, chrome.timeFormat());
        promptAnchors.push({
          id: block.id,
          firstRow,
          lastRow: Math.max(firstRow, rows.length - 1),
          sourceRow: source.row,
          copySuffixWidth: source.copySuffixWidth,
          prominentSourceRow: blockRows[0],
        });
      }
    }
    rows.push(...this.#noticeRows(diagnostics, width));
    const layout = { rows: Object.freeze(rows), promptAnchors: Object.freeze(promptAnchors), liveTailStartRow };
    if (cacheable) {
      this.#layouts.set(width, layout);
      // Performance: the custom viewport commonly probes full width and reserved-rail width.
      while (this.#layouts.size > 2) this.#layouts.delete(this.#layouts.keys().next().value!);
    }
    return layout;
  }

  // Invariant: release, package, and changelog notices, then the last three other diagnostics, close the document.
  #noticeRows(diagnostics: OwnedUiSessionViewModel["diagnostics"], width: number): readonly string[] {
    const { customViewport, cwd } = this.#options;
    const rows: string[] = [];
    // Invariant: the A1 release notice precedes the extension-package notice, matching pinned Pi's order.
    // Bare A1 docks it in the viewport tail instead of the document.
    rows.push(...diagnostics
      .filter(diagnostic => !customViewport && diagnostic.code === "release-update")
      .flatMap(diagnostic => {
        const release = parseReleaseUpdateDiagnostic(diagnostic.message);
        return release === null ? [] : renderPiShellReleaseUpdateNotice(release, width);
      }));
    rows.push(...diagnostics
      .filter(diagnostic => diagnostic.code === "package-updates")
      .flatMap(diagnostic => renderPiShellPackageUpdateNotice(
        diagnostic.message.split("\n").filter(line => line.startsWith("- ")).map(line => line.slice(2)),
        width,
      )));
    rows.push(...diagnostics
      .filter(diagnostic => diagnostic.code === "changelog-collapsed" || diagnostic.code === "changelog-expanded")
      // Rationale: bare A1 translates either startup diagnostic into transient dock chrome;
      // the pinned layout retains Pi's collapsed hint or expanded document.
      .flatMap(diagnostic => customViewport
        ? []
        : diagnostic.code === "changelog-collapsed"
          ? createPiShellCollapsedChangelog().render(width)
          : createPiShellChangelog(diagnostic.message).render(width)));
    rows.push(...diagnostics
      .filter(diagnostic => diagnostic.code !== "engine-startup" && diagnostic.code !== "project-trust"
        && diagnostic.code !== "release-update"
        && diagnostic.code !== "package-updates" && diagnostic.code !== "changelog-collapsed"
        && diagnostic.code !== "changelog-expanded")
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
        }, width, cwd)));
    return rows;
  }

  /** The transcript as plain rows for the parent terminal after a fullscreen leave. */
  exitTranscript(width: number): string {
    const thinkingVisible = this.#options.chrome.thinkingVisible();
    const rows: string[] = [];
    for (const id of this.#order) {
      const block = this.#blocks.get(id);
      if (block === undefined || (!thinkingVisible && block.kind === "thinking")) continue;
      if (rows.length > 0 && (block.kind === "user" || this.#options.customViewport && isPiPromptStyleCompaction(block))) rows.push("");
      rows.push(...this.#blockRows(id, block, width).map(sanitizeExitTranscriptRow));
    }
    while (rows.at(-1) === "") rows.pop();
    return rows.join("\n");
  }

  // Performance: finalized blocks cache by revision and width; live blocks always render.
  #blockRows(id: string, block: TranscriptBlock | undefined, width: number): readonly string[] {
    const component = this.#components.get(id);
    if (component === undefined) return [];
    const render = (): readonly string[] => {
      this.#renders += 1;
      const rows = component.render(width);
      if (!this.#options.customViewport || block?.kind === "user") return rows;
      return rows.map(row => nativeHyperlinkStyle(row, nativeTranscriptLinkColor));
    };
    if (block === undefined || block.status !== "finalized") return render();

    let byWidth = this.#renderedRows.get(id);
    const cached = byWidth?.get(width);
    const presentationRevision = component.presentationRevision ?? 0;
    if (cached?.revision === block.revision && cached.presentationRevision === presentationRevision) return cached.rows;
    const rows = render();
    if (byWidth === undefined) {
      byWidth = new Map();
      this.#renderedRows.set(id, byWidth);
    }
    byWidth.set(width, { revision: block.revision, presentationRevision, rows });
    // Invariant: bare A1 probes full width before reserving the overflowing rail column;
    // retain both widths without turning resize history into an unbounded cache.
    while (byWidth.size > 2) byWidth.delete(byWidth.keys().next().value!);
    return rows;
  }
}

/** The release, command, and optional changelog carried by the adapter's `release-update` diagnostic. */
export function parseReleaseUpdateDiagnostic(message: string): { version: string; command: string; changelogUrl: string | null } | null {
  const [instruction, changelog] = message.split("\n");
  const match = /^New version (\S+) is available\. Run (.+)$/.exec(instruction ?? "");
  if (match === null) return null;
  const url = changelog === undefined ? null : /^Changelog: (\S+)$/.exec(changelog)?.[1] ?? null;
  return { version: match[1]!, command: match[2]!, changelogUrl: url };
}

const KITTY_IMAGE_CONTROL = /\u001b_G[\s\S]*?\u001b\\/g;
const ITERM_IMAGE_CONTROL = /\u001b]1337;File=[^\u0007]*(?:\u0007|\u001b\\)/g;

/** Keep semantic SGR/OSC styling while excluding non-replayable image payloads. */
function sanitizeExitTranscriptRow(row: string): string {
  return row.replace(KITTY_IMAGE_CONTROL, "").replace(ITERM_IMAGE_CONTROL, "");
}

/** Web URLs use link blue; file targets retain A1's cyan interactive accent. */
export function nativeTranscriptLinkColor(text: string, target: string): string {
  return piTheme().fg(/^file:/iu.test(target) ? "accent" : "mdLink", text);
}

/** Preserve the stable metadata-grey foreground for every pinned timestamp state. */
function pinnedPromptSource(
  block: TranscriptBlock,
  sourceRow: string,
  width: number,
  timeFormat: OwnedUiViewportSettings["timeFormat"],
): { readonly row: string; readonly copySuffixWidth: number } {
  const unchanged = { row: sourceRow, copySuffixWidth: 0 };
  if (typeof block.payload !== "object" || block.payload === null) return unchanged;
  const value = (block.payload as Record<string, unknown>).timestamp;
  if (typeof value !== "number" || !Number.isFinite(value)) return unchanged;
  const format = timeFormat ?? "8:00 PM";
  const timestamp = formatSubmittedPromptTime(value, format);
  if (timestamp === null || submittedPromptLayout(width, value, format).timestamp === null) return unchanged;
  const rowWidth = displayWidth(sourceRow);
  const timestampWidth = displayWidth(timestamp);
  if (rowWidth < timestampWidth) return unchanged;
  return {
    row: overlaySpan(sourceRow, rowWidth - timestampWidth, rowWidth, paintPiSubmittedPromptTimestamp(timestamp)),
    copySuffixWidth: timestampWidth,
  };
}
