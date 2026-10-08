import { CancellableLoader, Container, Spacer, Text, type Component, type TUI } from "@earendil-works/pi-tui";
import { DynamicBorder } from "../startup-public.js";
import { DIALOG_CLOSE_SHORTCUT_HINT, paintPiBorder, piTheme, renderPiModalShortcutHints } from "./theme.js";

export const PI_MODAL_CONTENT_PADDING_X = 1;

/** Adds the standard navigation/select/close footer before a dependency component's bottom rule. */
export function addPiModalSelectFooter(container: Container): void {
  container.children.splice(container.children.length - 1, 0, new Text(renderPiModalShortcutHints([
    { key: "↑↓", action: "navigate" }, { key: "enter", action: "select" }, DIALOG_CLOSE_SHORTCUT_HINT,
  ]), 0, 0));
}

/** Owned cancellable operation frame with the canonical dialog close guidance. */
export class PiCancellableOperationFrame extends Container {
  readonly #loader: CancellableLoader;
  constructor(tui: TUI, message: string) {
    super();
    const theme = piTheme();
    this.#loader = new CancellableLoader(tui, text => theme.fg("accent", text), text => theme.fg("muted", text), message);
    this.addChild(new DynamicBorder(paintPiBorder));
    this.addChild(this.#loader);
    this.addChild(new Spacer(1));
    this.addChild(new Text(renderPiModalShortcutHints([DIALOG_CLOSE_SHORTCUT_HINT]), 0, 0));
    this.addChild(new Spacer(1));
    this.addChild(new DynamicBorder(paintPiBorder));
    adoptPiModalFrame(this, { topIndex: 0, bottomIndex: this.children.length - 1 });
  }
  get signal(): AbortSignal { return this.#loader.signal; }
  handleInput(data: string): void { this.#loader.handleInput(data); }
  dispose(): void { this.#loader.dispose(); }
}

/** The semantic top rule/title pair used while a modal assembles its frame. */
export class PiModalHeader implements Component {
  readonly rule: Component;
  readonly title: Component;

  constructor(rule: Component, title: Component) {
    this.rule = rule;
    this.title = title;
  }

  invalidate(): void {
    this.rule.invalidate();
    this.title.invalidate();
  }

  render(width: number): string[] {
    return [...this.rule.render(width), ...this.title.render(width)];
  }
}

/**
 * Complete framed-modal chrome. Rules remain frame-wide; every semantic content component renders
 * in the same one-cell-smaller rectangle and receives the same left inset.
 */
export class PiModalFrame implements Component {
  readonly #topRule: Component;
  readonly #content: readonly Component[];
  readonly #bottomRule: Component;
  readonly #fullWidthContent: ReadonlySet<Component>;
  readonly #preInsetContent: ReadonlySet<Component>;

  constructor(
    topRule: Component,
    content: readonly Component[],
    bottomRule: Component,
    fullWidthContent: readonly Component[] = [],
    preInsetContent: readonly Component[] = [],
  ) {
    this.#topRule = topRule;
    this.#content = content;
    this.#bottomRule = bottomRule;
    this.#fullWidthContent = new Set(fullWidthContent);
    this.#preInsetContent = new Set(preInsetContent);
  }

  invalidate(): void {
    this.#topRule.invalidate();
    for (const component of this.#content) component.invalidate();
    this.#bottomRule.invalidate();
  }

  render(width: number): string[] {
    const padding = Math.min(PI_MODAL_CONTENT_PADDING_X, Math.max(0, width));
    const contentWidth = Math.max(0, width - padding);
    const rows = [...this.#topRule.render(width)];
    for (const component of this.#content) {
      if (this.#fullWidthContent.has(component) || this.#preInsetContent.has(component)) {
        rows.push(...component.render(width));
      } else if (component instanceof Spacer) {
        rows.push(...component.render(contentWidth));
      } else {
        rows.push(...component.render(contentWidth).map(row => `${" ".repeat(padding)}${row}`));
      }
    }
    rows.push(...this.#bottomRule.render(width));
    return rows;
  }
}

/** Add compact titled-modal chrome while a component assembles its semantic body. */
export function addPiModalHeader(container: Container, rule: Component, title: Component): PiModalHeader {
  const header = new PiModalHeader(rule, title);
  container.addChild(header);
  return header;
}

export interface PiModalFrameAdoption {
  readonly topIndex: number;
  readonly bottomIndex: number;
  readonly header?: PiModalHeader;
  readonly fullWidthContent?: readonly Component[];
  /** Public pinned children that already own the same one-cell outer inset. */
  readonly preInsetContent?: readonly Component[];
}

/**
 * Replace explicitly identified structural modal children with the shared padded frame. Callers
 * identify semantic rules/components; rendered text is never inspected or rewritten.
 */
export function adoptPiModalFrame(container: Container, adoption: PiModalFrameAdoption): PiModalFrame {
  const { topIndex, bottomIndex, header, fullWidthContent = [], preInsetContent = [] } = adoption;
  if (topIndex < 0 || bottomIndex <= topIndex || bottomIndex >= container.children.length) {
    throw new TypeError("invalid modal frame child positions");
  }
  const top = container.children[topIndex]!;
  const bottom = container.children[bottomIndex]!;
  const contentStart = topIndex + 1;
  let topRule = top;
  const content: Component[] = [];
  if (header !== undefined) {
    if (top !== header) throw new TypeError("modal header is not at the declared top position");
    topRule = header.rule;
    content.push(header.title);
  }
  content.push(...container.children.slice(contentStart, bottomIndex));
  const frame = new PiModalFrame(topRule, content, bottom, fullWidthContent, preInsetContent);
  container.children.splice(topIndex, bottomIndex - topIndex + 1, frame);
  return frame;
}

/**
 * Adopt a public component's semantic rule/title children at the bare-A1 boundary. Only an optional
 * structural Spacer between those explicitly identified children is accepted; rendered text is
 * never inspected or rewritten. The pinned comparison profile does not call this adapter.
 */
export function adoptPiModalHeader(container: Container, ruleIndex: number, titleIndex: number): PiModalHeader {
  if (ruleIndex < 0 || titleIndex <= ruleIndex || titleIndex >= container.children.length) {
    throw new TypeError("invalid modal rule/title child positions");
  }
  const between = container.children.slice(ruleIndex + 1, titleIndex);
  if (between.length > 1 || between.some(child => !(child instanceof Spacer))) {
    throw new TypeError("modal rule and title are not separated by an optional single Spacer");
  }
  const rule = container.children[ruleIndex]!;
  const title = container.children[titleIndex]!;
  const header = new PiModalHeader(rule, title);
  container.children.splice(ruleIndex, titleIndex - ruleIndex + 1, header);
  return header;
}
