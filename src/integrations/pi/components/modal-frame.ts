import {
  Container,
  Input,
  Spacer,
  Text,
  sliceByColumn,
  stripTerminalSequences,
  visibleWidth,
  type Component,
  type Focusable,
  type TuiMouseEvent,
  type TuiMouseEventResult,
} from "@earendil-works/pi-tui";
import type { OwnedUiShellComponentPort } from "../../../contracts/owned-ui/index.js";
import { DIALOG_CONTENT_PADDING_X, dialogFrameGeometry, insetDialogContent } from "../../../contracts/presentation/index.js";
import { DIALOG_CLOSE_SHORTCUT_HINT, piTheme, renderPiModalShortcutHints, renderPiModalListRow } from "./theme.js";

export const PI_MODAL_CONTENT_PADDING_X = DIALOG_CONTENT_PADDING_X;

/** Applies standard primary/metadata roles without changing a pinned row's text or clipping. */
export function renderPiModalSelectedPrimary(row: string, width: number, labels: readonly string[]): string {
  const plain = stripTerminalSequences(row).trimEnd();
  if (!plain.startsWith(" → ")) return row;
  const primary = labels.filter(label => plain.slice(3).startsWith(label))
    .sort((left, right) => visibleWidth(right) - visibleWidth(left))[0];
  const length = primary === undefined ? Math.max(0, visibleWidth(plain) - 3) : visibleWidth(primary);
  const label = stripTerminalSequences(sliceByColumn(row, 3, length));
  const suffix = sliceByColumn(row, 3 + length, Math.max(0, visibleWidth(plain) - 3 - length));
  const theme = piTheme();
  return ` ${renderPiModalListRow(`${theme.fg("accent", "→ ")}${theme.fg("text", label)}${theme.fg("muted", stripTerminalSequences(suffix))}`, Math.max(0, width - 1), true)}`;
}

/** Standardizes internal legacy model/message choices without changing their controller or metadata. */
export function standardInternalChoicePort(port: OwnedUiShellComponentPort, metadata = false): OwnedUiShellComponentPort {
  return { ...port, render: width => port.render(width).map(row => {
    const match = /^(\s*)[→›] (.*)$/u.exec(stripTerminalSequences(row).trimEnd());
    if (match === null) return row;
    const indent = visibleWidth(match[1]!);
    const marker = metadata ? sliceByColumn(row, indent + 2, 2) : "";
    const label = metadata ? match[2]!.slice(2).split(/ \[| \(/u, 1)[0]! : match[2]!;
    const suffixStart = indent + 2 + (metadata ? 2 : 0) + visibleWidth(label);
    const suffix = metadata ? sliceByColumn(row, suffixStart, Math.max(0, visibleWidth(row) - suffixStart)).trimEnd() : "";
    const theme = piTheme();
    return `${match[1]}${renderPiModalListRow(`${theme.fg("accent", "→ ")}${marker}${theme.fg("text", label)}${suffix}`, Math.max(0, width - indent), true)}`;
  }) };
}

/** Paints the standard Pi Input prompt as a live-themed dialog-search marker. */
export function renderPiModalSearchInput(input: Input, width: number): string[] {
  return input.render(width).map(row => {
    if (row.length === 0) return row;
    if (!row.startsWith(">")) throw new TypeError("modal search input does not use the standard prompt");
    return `${piTheme().fg("accent", ">")}${row.slice(1)}`;
  });
}

/** Keeps Pi Input behavior and geometry while owning only its standard dialog-search presentation. */
class PiModalSearchInput implements Component, Focusable {
  readonly #input: Input;

  constructor(input: Input) {
    this.#input = input;
  }

  get focused(): boolean { return this.#input.focused; }
  set focused(value: boolean) { this.#input.focused = value; }
  invalidate(): void { this.#input.invalidate(); }
  render(width: number): string[] { return renderPiModalSearchInput(this.#input, width); }
  handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined { return this.#input.handleMouse(event); }
}

/** Replaces one explicitly identified direct Input child with the standard search presentation. */
export function adoptPiModalSearchInput(container: Container, input: Component): Component & Focusable {
  if (!(input instanceof Input)) throw new TypeError("modal search component is not an Input");
  const index = container.children.indexOf(input);
  if (index === -1) throw new TypeError("modal search Input is not a direct child");
  const presentation = new PiModalSearchInput(input);
  container.children.splice(index, 1, presentation);
  return presentation;
}

/** Adds one standard dialog-search presentation while callers retain the Input controller. */
export function addPiModalSearchInput(container: Container, input: Input): Component & Focusable {
  const presentation = new PiModalSearchInput(input);
  container.addChild(presentation);
  return presentation;
}

/** Adds the standard navigation/select/close footer before a dependency component's bottom rule. */
export function addPiModalSelectFooter(container: Container): void {
  container.children.splice(container.children.length - 1, 0, new Text(renderPiModalShortcutHints([
    { key: "↑↓", action: "navigate" }, { key: "enter", action: "select" }, DIALOG_CLOSE_SHORTCUT_HINT,
  ]), 0, 0));
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
    const geometry = dialogFrameGeometry(width);
    const rows = [...this.#topRule.render(geometry.frameWidth)];
    for (const component of this.#content) {
      if (this.#fullWidthContent.has(component) || this.#preInsetContent.has(component)) {
        rows.push(...component.render(geometry.frameWidth));
      } else if (component instanceof Spacer) {
        rows.push(...component.render(geometry.contentWidth));
      } else {
        rows.push(...component.render(geometry.contentWidth).map(row => insetDialogContent(row, geometry)));
      }
    }
    rows.push(...this.#bottomRule.render(geometry.frameWidth));
    return rows;
  }
}

/** Add compact titled-modal chrome while a component assembles its semantic body. */
export function addPiModalHeader(container: Container, rule: Component, title: Component): PiModalHeader {
  const header = new PiModalHeader(rule, title);
  container.addChild(header);
  return header;
}

interface PiModalFrameAdoption {
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
