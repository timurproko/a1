import { describe, expect, it, vi } from "vitest";
import type { OwnedUiSessionViewModel } from "../../../src/contracts/owned-ui/index.js";
import type { PiShellTranscriptComponentPort } from "../../../src/integrations/pi/components/shell-shared-facade.js";
import {
  parseReleaseUpdateDiagnostic,
  TranscriptDocument,
  type TranscriptInvalidation,
} from "../../../src/app/session-shell/transcript-document.js";

type Block = OwnedUiSessionViewModel["transcript"][number];

function block(id: string, overrides: Partial<Block> = {}): Block {
  return { id, kind: "assistant", status: "finalized", revision: 1, title: null, text: id, payload: {}, ...overrides } as Block;
}

function fakeComponent(id: string, rows: (width: number) => readonly string[] = width => [`${id}@${width}`]) {
  const component = {
    id,
    revision: 1,
    render: vi.fn(rows),
    handleInput() {},
    invalidate: vi.fn(),
    update: vi.fn((next: Block) => { component.revision = next.revision; }),
    setExpanded() {},
    setOutputPad() {},
    setHideThinkingBlock() {},
    setMermaidRenderingMode() {},
    setImagePresentation() {},
    dispose: vi.fn(),
  };
  return component;
}

function harness(options: {
  customViewport?: boolean;
  diagnostics?: OwnedUiSessionViewModel["diagnostics"];
  extensionHeader?: () => boolean;
  thinkingVisible?: () => boolean;
} = {}) {
  const mounted = new Map<string, ReturnType<typeof fakeComponent>>();
  const document = new TranscriptDocument({
    customViewport: options.customViewport ?? false,
    cwd: "/w",
    mount: next => {
      const component = fakeComponent(next.id);
      component.revision = next.revision;
      mounted.set(next.id, component);
      return component as unknown as PiShellTranscriptComponentPort;
    },
    chrome: {
      diagnostics: () => options.diagnostics ?? [],
      headerRows: () => ["header"],
      resourceRows: () => ["resources", ""],
      hasExtensionHeader: options.extensionHeader ?? (() => false),
      thinkingVisible: options.thinkingVisible ?? (() => true),
      timeFormat: () => undefined,
    },
  });
  return { document, mounted };
}

describe("TranscriptDocument", () => {
  it("mounts new blocks in order, updates newer revisions in place, and never revives an older revision", () => {
    const { document, mounted } = harness();
    document.apply(block("a"));
    document.apply(block("b"));
    document.apply(block("a", { revision: 2 }));
    document.apply(block("a", { revision: 1 }));
    expect(mounted.get("a")!.update).toHaveBeenCalledOnce();
    expect(document.layout(20).rows).toEqual(["header", "resources", "a@20", "b@20"]);
  });

  it("caches finalized rows per width, evicts to two widths, and always re-renders live blocks", () => {
    const { document, mounted } = harness();
    document.apply(block("done"));
    document.apply(block("live", { status: "live" }));
    for (const width of [10, 20, 10, 20]) {
      document.layout(width);
      document.invalidate("diagnostics");
    }
    expect(mounted.get("done")!.render).toHaveBeenCalledTimes(2);
    expect(mounted.get("live")!.render).toHaveBeenCalledTimes(4);
    document.layout(30);
    document.invalidate("diagnostics");
    document.layout(10);
    expect(mounted.get("done")!.render).toHaveBeenCalledTimes(4);
    expect(document.renderCount).toBe(10);
  });

  it("reuses a layout per width, keeps at most two, and never caches under an extension header", () => {
    let extension = false;
    const { document } = harness({ extensionHeader: () => extension });
    document.apply(block("a"));
    expect(document.layout(10)).toBe(document.layout(10));
    const first = document.layout(10);
    document.layout(20);
    document.layout(30);
    expect(document.layout(10)).not.toBe(first);
    extension = true;
    expect(document.layout(10)).not.toBe(document.layout(10));
  });

  it("reports where the live tail starts", () => {
    const { document } = harness();
    document.apply(block("a"));
    document.apply(block("b", { status: "live" }));
    document.apply(block("c", { status: "live" }));
    expect(document.layout(10).liveTailStartRow).toBe(3);
  });

  it("drops only layouts for layout reasons, and block rows too for presentation reasons", () => {
    const layoutOnly: TranscriptInvalidation[] = ["editor-padding", "diagnostics", "workflow-status", "extension-header"];
    const rowsToo: TranscriptInvalidation[] = ["viewport-config", "extension-renderers", "block-presentation", "tools-expanded", "repaint"];
    for (const reason of [...layoutOnly, ...rowsToo]) {
      const { document, mounted } = harness();
      document.apply(block("a"));
      const layout = document.layout(10);
      document.invalidate(reason);
      expect(document.layout(10), reason).not.toBe(layout);
      expect(mounted.get("a")!.render, reason).toHaveBeenCalledTimes(layoutOnly.includes(reason) ? 1 : 2);
      expect(mounted.get("a")!.invalidate, reason).toHaveBeenCalledTimes(reason === "repaint" ? 1 : 0);
    }
  });

  it("re-renders only the changed block", () => {
    const { document, mounted } = harness();
    document.apply(block("a"));
    document.apply(block("b"));
    document.layout(10);
    document.blockChanged("b");
    document.layout(10);
    expect(mounted.get("a")!.render).toHaveBeenCalledOnce();
    expect(mounted.get("b")!.render).toHaveBeenCalledTimes(2);
  });

  it("keeps anchored workflow output at its anchor across syncs and removes it on request", () => {
    const { document, mounted } = harness();
    document.sync([block("a"), block("b")]);
    const status = fakeComponent("workflow-status-1");
    document.appendAnchored("workflow-status-1", status as unknown as PiShellTranscriptComponentPort, 1);
    expect(document.lastId).toBe("workflow-status-1");
    expect(document.anchorOf("workflow-status-1")).toBe(1);
    document.sync([block("a"), block("b"), block("c")]);
    expect(document.layout(10).rows).toEqual(["header", "resources", "a@10", "workflow-status-1@10", "b@10", "c@10"]);
    document.sync([block("c")]);
    expect(mounted.get("a")!.dispose).toHaveBeenCalledOnce();
    expect(document.layout(10).rows).toEqual(["header", "resources", "c@10", "workflow-status-1@10"]);
    document.removeAnchored();
    expect(status.dispose).toHaveBeenCalledOnce();
    expect(document.layout(10).rows).toEqual(["header", "resources", "c@10"]);
    expect(() => document.appendAnchored("other", status as unknown as PiShellTranscriptComponentPort, 0)).toThrow(TypeError);
  });

  it("separates prompts, hides thinking when asked, and sanitizes exit rows", () => {
    let thinking = true;
    const { document } = harness({ thinkingVisible: () => thinking });
    document.sync([block("a"), block("t", { kind: "thinking" }), block("u", { kind: "user" })]);
    expect(document.layout(10).rows).toEqual(["header", "resources", "a@10", "t@10", "", "u@10"]);
    thinking = false;
    document.invalidate("block-presentation");
    expect(document.layout(10).rows).toEqual(["header", "resources", "a@10", "", "u@10"]);
    expect(document.exitTranscript(10)).toBe("a@10\n\nu@10");
  });

  it("resets for a new binding and disposes every component", () => {
    const { document, mounted } = harness();
    document.sync([block("a")]);
    document.reset();
    expect(mounted.get("a")!.dispose).toHaveBeenCalledOnce();
    expect(document.layout(10).rows).toEqual(["header", "resources"]);
    document.apply(block("a"));
    document.dispose();
    expect(document.component("a")).toBeUndefined();
  });

  it("keeps installed-update readiness out of the transcript document", () => {
    const diagnostics: OwnedUiSessionViewModel["diagnostics"] = [{
      sequence: 1,
      code: "release-update-installed",
      severity: "info",
      message: "Update 1.2.4 installed; restart to update.",
      recoverable: true,
    }];
    for (const customViewport of [false, true]) {
      const { document } = harness({ customViewport, diagnostics });
      const rows = document.layout(80).rows.join("\n");
      expect(rows).not.toContain("release-update-installed");
      expect(rows).not.toContain("restart to update");
    }
  });

  it("parses the release-update diagnostic", () => {
    expect(parseReleaseUpdateDiagnostic("New version 1.2.3 is available. Run npm i -g a1\nChangelog: https://x/y")).toEqual({
      version: "1.2.3", command: "npm i -g a1", changelogUrl: "https://x/y",
    });
    expect(parseReleaseUpdateDiagnostic("New version 1.2.3 is available. Run a1 update")?.changelogUrl).toBeNull();
    expect(parseReleaseUpdateDiagnostic("something else")).toBeNull();
  });
});
