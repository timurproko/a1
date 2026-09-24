import { Container, Spacer, Text } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import {
  addPiModalHeader,
  adoptPiModalFrame,
  adoptPiModalHeader,
  PiModalFrame,
  PiModalHeader,
} from "../../../../src/integrations/pi/components/modal-frame.js";

const row = (text: string): Text => new Text(text, 0, 0);
const plain = (rows: readonly string[]): string[] => rows.map(value => value.trimEnd());

describe("shared bare-A1 modal header", () => {
  it("renders the title immediately after the top rule and leaves body spacing below it", () => {
    const frame = new Container();
    addPiModalHeader(frame, row("rule"), row("title"));
    frame.addChild(new Spacer(1));
    frame.addChild(row("body"));

    expect(plain(frame.render(40))).toEqual(["rule", "title", "", "body"]);
  });

  it("applies one global content cell while leaving frame and separator rules full width", () => {
    const modal = new Container();
    const header = addPiModalHeader(modal, row("top-rule"), row("title"));
    modal.addChild(new Spacer(1));
    modal.addChild(row("body"));
    const separator = row("separator");
    modal.addChild(separator);
    modal.addChild(row("footer"));
    modal.addChild(row("bottom-rule"));

    adoptPiModalFrame(modal, {
      topIndex: 0,
      bottomIndex: modal.children.length - 1,
      header,
      fullWidthContent: [separator],
    });

    expect(modal.children[0]).toBeInstanceOf(PiModalFrame);
    expect(plain(modal.render(12))).toEqual([
      "top-rule", " title", "", " body", "separator", " footer", "bottom-rule",
    ]);
  });

  it("renders children against the reduced width and retains declared public pre-insets", () => {
    const widths: number[] = [];
    const dynamic = { invalidate() {}, render: (width: number) => { widths.push(width); return ["dynamic"]; } };
    const preInset = row(" inset");
    const frame = new PiModalFrame(row("top"), [dynamic, preInset], row("bottom"), [], [preInset]);

    expect(plain(frame.render(12))).toEqual(["top", " dynamic", " inset", "bottom"]);
    expect(widths).toEqual([11]);
  });

  it("keeps styled or wrapped title output adjacent at narrow widths", () => {
    const title = { invalidate() {}, render: () => ["title one", "title two"] };
    const header = new PiModalHeader(row("rule"), title);

    expect(plain(header.render(12))).toEqual(["rule", "title one", "title two"]);
  });

  it("structurally adopts public modal chrome without rewriting rendered rows", () => {
    const frame = new Container();
    frame.addChild(row("rule"));
    frame.addChild(new Spacer(1));
    frame.addChild(row("title"));
    frame.addChild(new Spacer(1));
    frame.addChild(row("body"));

    adoptPiModalHeader(frame, 0, 2);

    expect(frame.children[0]).toBeInstanceOf(PiModalHeader);
    expect(plain(frame.render(40))).toEqual(["rule", "title", "", "body"]);
  });

  it("rejects ambiguous child ranges instead of inferring a title from output", () => {
    const frame = new Container();
    frame.addChild(row("rule"));
    frame.addChild(row("not a spacer"));
    frame.addChild(row("title"));

    expect(() => adoptPiModalHeader(frame, 0, 2)).toThrow(/optional single Spacer/u);
    expect(() => adoptPiModalHeader(frame, 2, 0)).toThrow(/positions/u);
  });
});
