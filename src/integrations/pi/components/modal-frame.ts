import { Container, Spacer, type Component } from "@earendil-works/pi-tui";

/**
 * The shared top chrome for a titled bare-A1 modal. Keeping the rule and title in one component
 * makes their adjacency structural: modal producers can add body spacing only after this header.
 */
export class PiModalHeader implements Component {
  readonly #rule: Component;
  readonly #title: Component;

  constructor(rule: Component, title: Component) {
    this.#rule = rule;
    this.#title = title;
  }

  invalidate(): void {
    this.#rule.invalidate();
    this.#title.invalidate();
  }

  render(width: number): string[] {
    return [...this.#rule.render(width), ...this.#title.render(width)];
  }
}

/** Add compact titled-modal chrome while leaving every body and footer row to the owner. */
export function addPiModalHeader(container: Container, rule: Component, title: Component): PiModalHeader {
  const header = new PiModalHeader(rule, title);
  container.addChild(header);
  return header;
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
