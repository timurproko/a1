import { describe, expect, it } from "vitest";
import { syncInventories } from "../../scripts/pi/sync-pi-inventories-core.mjs";

const commit = "914cf1472e715297caa30db4b9535d534a9eb718";
const lockPackages = {
  "@earendil-works/pi-coding-agent": { version: "0.84.2", integrity: "sha512-coding" },
  "@earendil-works/pi-tui": { version: "0.84.2", integrity: "sha512-tui" },
};

const interactive = [
  "class InteractiveMode {",
  "  constructor() {",
  "    this.documentContainer.addChild(this.headerContainer);",
  "  }",
  "  private async handleEvent(event) {",
  "    switch (event.type) {",
  '      case "agent_start":',
  '      case "message_end":',
  "    }",
  "  }",
  "  /** Extract text content */",
  "  private showSettingsSelector() {",
  "    onAutoCompactChange: () => {},",
  "  }",
  "  private async handleModelCommand() {}",
  "}",
].join("\n");

function inventories() {
  return {
    modal: {
      pinned: { version: "0.84.2", commit },
      sources: { interactive: "dist/interactive-mode.js", login: "dist/login.js" },
      nodes: [
        { id: "editor.root", source: "interactive", sourceAnchors: ["this.editorContainer.addChild(this.editor)"], status: "implemented" },
        { id: "auth.login", source: "login", sourceAnchors: ["new LoginDialog("], status: "implemented" },
      ],
      edges: [{ id: "editor.root->auth.login", source: "interactive", sourceAnchors: ["showLoginDialog()"] }],
      components: ["login-dialog.js"],
    },
    presenters: {
      pinned: { version: "0.84.2", commit, packageArtifact: "dist/interactive-mode.js" },
      presenters: [{ id: "document.header", sourceAnchors: ["this.documentContainer.addChild(this.headerContainer)"], implementationStatus: "requires-revalidation" }],
      commands: [{ name: "model", presenters: ["document.header"], sourceAnchors: ["handleModelCommand"] }],
      hiddenCommands: [{ name: "debug", presenters: ["document.header"], sourceAnchors: ["debugLog"] }],
    },
    behaviors: {
      upstream: { commit, license: "MIT", packages: [{ name: "@earendil-works/pi-coding-agent", version: "0.0.0", integrity: "old" }, { name: "@earendil-works/pi-tui", version: "0.0.0", integrity: "old" }] },
      sourceProvenance: [{ id: "interactive", package: "@earendil-works/pi-coding-agent", path: "packages/coding-agent/src/modes/interactive/interactive-mode.ts", sourceMap: "modes/interactive/interactive-mode.js.map", lines: 1, sha256: "stale" }],
      behaviorInventory: [
        { id: "startup.tree", provenance: { source: "interactive", lines: [2, 4], symbol: "constructor", anchors: ["this.documentContainer.addChild(this.headerContainer)"] } },
        { id: "events.handle", provenance: { source: "interactive", lines: [5, 10], symbol: "handleEvent", anchors: ['case "agent_start"'] } },
      ],
      manifests: { advertisedBuiltInCommands: [], tuiKeybindings: [], appKeybindings: [], sessionEvents: [], settingsCallbacks: [], statefulComponents: ["Loader"] },
    },
  };
}

function sync(overrides: Record<string, unknown> = {}) {
  const input = {
    inventories: inventories(),
    modalSources: {
      interactive: "  this.editorContainer.addChild(this.editor);\n  showLoginDialog();\n",
      login: "export class LoginDialog {}\nconst dialog = new LoginDialog();\n",
    },
    presenterSource: "this.documentContainer.addChild(this.headerContainer);\nhandleModelCommand();\ndebugLog();\n",
    behaviorSources: new Map([["interactive", interactive], ["commands", '{ name: "help" }\n{ name: "model" }\n'], ["keybindings", 'export const KEYBINDINGS = {\n  "a": 1,\n};\nconst KEYBINDING_NAME_MIGRATIONS = {};'], ["tui-keybindings", 'export const TUI_KEYBINDINGS = {\n  "b": 1,\n};\nexport interface KeybindingConflict {}']]),
    componentFiles: ["login-dialog.js"],
    version: "0.84.2",
    commit,
    lockPackages,
    ...overrides,
  };
  return syncInventories(input as never);
}

describe("sync-pi-inventories core", () => {
  it("leaves matching anchors and contained ranges alone, refreshes hashes and manifests, and reports nothing blocking", () => {
    const { inventories: next, report, blocking, changed } = sync();
    expect(blocking).toEqual([]);
    expect(report.modal).toEqual({ reanchored: [], orphaned: [], unmappedComponents: [] });
    expect(report.presenters).toEqual({ reanchored: [], orphaned: [] });
    expect(report.behaviors.orphaned).toEqual([]);
    expect(report.behaviors.moved).toEqual([]);
    expect(next.behaviors.sourceProvenance[0]).toMatchObject({ lines: 16, sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect(next.behaviors.upstream.packages.map((pkg: { integrity: string }) => pkg.integrity)).toEqual(["sha512-coding", "sha512-tui"]);
    expect(next.behaviors.manifests).toMatchObject({
      advertisedBuiltInCommands: ["help", "model"], tuiKeybindings: ["b"], appKeybindings: ["a"],
      sessionEvents: ["agent_start", "message_end"], settingsCallbacks: ["onAutoCompactChange"], statefulComponents: ["Loader"],
    });
    expect(report.behaviors.manifests.sort()).toEqual(["advertisedBuiltInCommands", "appKeybindings", "sessionEvents", "settingsCallbacks", "tuiKeybindings"]);
    expect(changed).toBe(true);
  });

  it("re-anchors a whitespace-shifted snippet, orphans a vanished one, and reports a new component as unmapped", () => {
    const { inventories: next, report, blocking } = sync({
      modalSources: {
        interactive: "  this.editorContainer.addChild( this.editor );\n",
        login: "export class LoginDialog {}\nconst dialog = new LoginDialog();\n",
      },
      componentFiles: ["login-dialog.js", "wizard.js"],
    });
    expect(next.modal.nodes[0].sourceAnchors).toEqual(["this.editorContainer.addChild( this.editor );"]);
    expect(next.modal.nodes[0].status).toBe("implemented");
    expect(next.modal.edges[0].status).toBe("orphaned");
    expect(report.modal).toEqual({ reanchored: ["editor.root"], orphaned: ["editor.root->auth.login"], unmappedComponents: ["wizard.js"] });
    expect(next.modal.components).toEqual(["login-dialog.js"]);
    expect(blocking).toEqual(["modal editor.root->auth.login: orphaned", "modal component wizard.js: unmapped"]);
  });

  it("moves a behavior's line range to its symbol span when the anchors left the range, and orphans a behavior with no anchor", () => {
    const shifted = `${"// header\n".repeat(8)}${interactive}`;
    const { inventories: next, report } = sync({
      behaviorSources: new Map([["interactive", shifted], ["commands", ""], ["keybindings", ""], ["tui-keybindings", ""]]),
      inventories: (() => {
        const value = inventories();
        value.behaviors.behaviorInventory.push({ id: "gone", provenance: { source: "interactive", lines: [1, 2], symbol: "nothing", anchors: ["no such anchor"] } });
        return value;
      })(),
    });
    expect(next.behaviors.behaviorInventory[0].provenance.lines).toEqual([10, 12]);
    expect(next.behaviors.behaviorInventory[1].provenance.lines).toEqual([13, 18]);
    expect(next.behaviors.behaviorInventory[2].status).toBe("orphaned");
    expect(report.behaviors.moved).toEqual(["startup.tree: [2, 4] -> [10, 12]", "events.handle: [5, 10] -> [13, 18]"]);
    expect(report.behaviors.orphaned).toEqual(["gone"]);
  });

  it("clears an earlier orphan mark once the anchor matches again and records the new pinned identity", () => {
    const value = inventories();
    (value.presenters.presenters[0] as { status?: string }).status = "orphaned";
    const { inventories: next, report } = sync({ inventories: value, version: "0.85.0", commit: "a".repeat(40) });
    expect(next.presenters.presenters[0].status).toBeUndefined();
    expect(report.presenters.orphaned).toEqual([]);
    expect(next.modal.pinned).toEqual({ version: "0.85.0", commit: "a".repeat(40) });
    expect(next.presenters.pinned).toMatchObject({ version: "0.85.0", commit: "a".repeat(40) });
    expect(next.behaviors.upstream.commit).toBe("a".repeat(40));
  });
});
