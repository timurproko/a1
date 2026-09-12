import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AutocompleteProvider } from "#pi-tui";
import {
  KeybindingsManager,
  applyPiTheme,
  createPiShellEditor,
} from "../../../../src/integrations/pi/components/index.js";
import { createPinnedEditorHarness } from "./pinned-editor-upstream-fixture.js";

function tuiOptions() {
  return { getColumns: () => 48, getRows: () => 16, requestRender() {} };
}

describe("pinned editor and input parity", () => {
  it("keeps comparison autocomplete below the input and byte-identical to an independently run pinned editor", async () => {
    const agentDir = await mkdtemp(join(tmpdir(), "comparison-autocomplete-"));
    try {
      const upstream = await createPinnedEditorHarness(agentDir);
      const actual = createPiShellEditor({ ...tuiOptions(), keybindingProfile: "pi", agentDir, onSubmit() {} });
      const provider: AutocompleteProvider = {
        getSuggestions: async () => ({ prefix: "/", items: Array.from({ length: 9 }, (_, index) => ({
          value: `/command-${index}`, label: `command-${index}`, description: `Description ${index}`,
        })) }),
        applyCompletion: (_lines, _line, _col, item) => ({ lines: [item.value], cursorLine: 0, cursorCol: item.value.length }),
      };
      actual.addAutocompleteProvider(() => provider);
      upstream.editor.setAutocompleteProvider(provider);
      actual.setFocused?.(true); upstream.editor.focused = true;
      expect(actual.bodyGeometry).toBeUndefined();
      for (const finish of ["\t", "\r", "\u001b"]) {
        actual.setText(""); upstream.editor.setText("");
        actual.handleInput?.("/"); upstream.editor.handleInput("/");
        await expect.poll(() => upstream.editor.isShowingAutocomplete()).toBe(true);
        await expect.poll(() => actual.render(48).length).toBeGreaterThan(3);
        for (const input of ["\u001b[B", "\u001b[A", "\u001b[A", finish]) {
          expect(actual.render(48)).toEqual(upstream.editor.render(48));
          expect(actual.render(48)[3]).toContain("command-");
          actual.handleInput?.(input); upstream.editor.handleInput(input);
        }
        expect(actual.render(48)).toEqual(upstream.editor.render(48));
        expect(actual.getText()).toEqual(upstream.editor.getExpandedText());
      }
    } finally { await rm(agentDir, { recursive: true, force: true }); }
  });

  it("matches configured keybindings, editing, Unicode, paste, autocomplete, app actions, queues, clipboard hooks, and cancellation", async () => {
    const agentDir = await mkdtemp(join(tmpdir(), "a1-pi-editor-"));
    await mkdir(agentDir, { recursive: true });
    await writeFile(join(agentDir, "keybindings.json"), JSON.stringify({ "app.model.cycleForward": ["ctrl+y"] }));
    try {
      applyPiTheme("dark");
      const upstream = await createPinnedEditorHarness(agentDir);
      const logs: string[] = [];
      const actual = createPiShellEditor({
        ...tuiOptions(),
        cwd: "D:/work",
        agentDir,
        autocompleteCommands: [
          { name: "deploy", description: "Prompt template" },
          { name: "skill:review", description: "Skill" },
          { name: "artifact", description: "Extension command" },
        ],
        onSubmit: text => logs.push(`submit:${text}`),
        onInterrupt: () => logs.push("interrupt"),
        onClear: () => logs.push("clear"),
        onExit: () => logs.push("exit"),
        onModelCycle: direction => logs.push(`model-${direction}`),
        onFollowUp: () => logs.push("follow-up"),
        onMessageCopy: () => logs.push("copy"),
        onExternalEditor: () => logs.push("external"),
        onPasteImage: () => logs.push("paste-image"),
        onExtensionShortcut: data => data === "\u000b" ? (logs.push("extension"), true) : false,
      });
      actual.setFocused?.(true);
      upstream.editor.focused = true;
      const compare = (label: string) => {
        expect(actual.getText(), `${label} text`).toBe(upstream.editor.getExpandedText());
        expect(actual.render(48), `${label} frame`).toEqual(upstream.editor.render(48));
        expect(logs, `${label} actions`).toEqual(upstream.logs);
      };
      const input = (data: string) => {
        actual.handleInput?.(data);
        upstream.editor.handleInput(data);
      };

      for (const character of "A😀B") input(character);
      input("\u001b[D");
      input("λ");
      input("\u001b[200~line 1\n日本語\u001b[201~");
      compare("unicode editing and bracketed paste");

      const windowsPath = "D:/Git/a1/.worktrees/prevent-windows-nul-artifacts-impl";
      actual.setText(windowsPath);
      upstream.editor.setText(windowsPath);
      input("\u001b[1;5D");
      input("|");
      compare("comparison-profile path word boundaries");

      actual.setText("");
      upstream.editor.setText("");
      input("/m");
      input("o");
      compare("slash autocomplete");
      input("\t");
      compare("autocomplete selection");
      actual.setText("");
      upstream.editor.setText("");
      input("/mo");
      input("\u001b");
      compare("autocomplete cancellation");
      for (const resource of ["/deploy", "/skill:r", "/artifact"]) {
        actual.setText("");
        upstream.editor.setText("");
        input(resource);
        compare(`${resource} resource autocomplete`);
        input("\u001b");
      }
      input("\u001b");
      input("\u0019");
      input("\u001b\r");
      input("\u0007");
      input("\u000b");
      input(process.platform === "win32" ? "\u001bv" : "\u0016");
      input("\u0018");
      input("\u0003");
      compare("application keybindings");

      actual.setThinkingLevel("high");
      upstream.enableControllerColors("high");
      actual.setText("");
      upstream.editor.setText("");
      compare("thinking-level editor border");
      actual.setText("!pwd");
      upstream.editor.setText("!pwd");
      compare("bash-mode editor border");
      actual.setText("plain prompt");
      upstream.editor.setText("plain prompt");
      compare("restored thinking editor border");

      actual.setText("");
      upstream.editor.setText("");
      input("\u0004");
      compare("empty editor exit");

      const ownedBindings = KeybindingsManager.create(agentDir);
      expect(ownedBindings.getEffectiveConfig()).toEqual(upstream.keybindings.getEffectiveConfig());
      expect(ownedBindings.getConflicts()).toEqual(upstream.keybindings.getConflicts());
    } finally {
      await rm(agentDir, { recursive: true, force: true });
    }
  });
});
