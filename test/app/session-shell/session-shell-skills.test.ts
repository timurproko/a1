import { memoryHistory } from "./prompt-history-fixture.js";
import { stripTerminalSequences, type AutocompleteProvider } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
// Performance: this integration file exercises real cold emitted entries; dedicated tests retain source-loader coverage.
vi.mock("../../../src/app/session-shell/paste-executor.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../src/app/session-shell/paste-executor.js")>();
  const { coldPasteHelper } = await import("../../support/cold-clipboard-entries.js");
  return { ...actual, startPasteExecutor: (...args: Parameters<typeof actual.startPasteExecutor>) =>
    actual.startPasteExecutor(args[0], args[1], args[2], coldPasteHelper(args[3])) };
});
vi.mock("node:worker_threads", async importOriginal => {
  const actual = await importOriginal<typeof import("node:worker_threads")>();
  const { coldClipboardWorker } = await import("../../support/cold-clipboard-entries.js");
  return { ...actual, Worker: class extends actual.Worker {
    constructor(entry: string | URL, options?: import("node:worker_threads").WorkerOptions) {
      const selected = coldClipboardWorker(entry, options);
      super(selected.entry, selected.options);
    }
  } };
});
import { fixture, type Runtime } from "./session-shell-fixture.js";
import type { OwnedUiShellSkillsOptions } from "../../../src/app/session-shell/index.js";

const SKILLS = [
  { name: "framer", description: "Design, edit,\n and publish Framer sites" },
  { name: "code-review", description: "Review the current diff" },
];

const settle = async () => { for (let i = 0; i < 4; i++) await new Promise<void>(resolve => setImmediate(resolve)); };

function withSkills(engine: Runtime, skills: readonly { name: string; description: string }[] = SKILLS, enabled = true): void {
  (engine.services.resourceLoader as { getSkills: () => unknown }).getSkills = () => ({ skills: skills.map(skill => ({ ...skill, filePath: `D:/skills/${skill.name}/SKILL.md` })), diagnostics: [] });
  (engine.services.settingsManager as { getEnableSkillCommands?: () => boolean }).getEnableSkillCommands = () => enabled;
}

/** A settings double: the presentation value plus the change notification the composition wires. */
function skillsOptions(initial: "collapse" | "expand" = "collapse") {
  let presentation = initial;
  const listeners = new Set<() => void>();
  const options: OwnedUiShellSkillsOptions = {
    presentation: () => presentation,
    onChange: listener => { listeners.add(listener); return () => listeners.delete(listener); },
  };
  return { options, set(next: "collapse" | "expand") { presentation = next; for (const listener of listeners) listener(); }, listeners };
}

async function skillsFixture(initial: "collapse" | "expand" = "collapse", configure: (engine: Runtime) => void = engine => withSkills(engine)) {
  const history = memoryHistory();
  const skills = skillsOptions(initial);
  const value = await fixture([], [], true, undefined, undefined, undefined, undefined, undefined,
    { store: history.store, limit: 100 }, configure, undefined, undefined, undefined, undefined, undefined, skills.options);
  const frame = () => stripTerminalSequences(value.shell.root.render(100).join("\n"));
  const menu = async (typed: string) => {
    value.shell.root.editor.setText("");
    value.shell.root.editor.handleInput?.(typed);
    await settle();
    const text = stripTerminalSequences(value.shell.root.editor.render(100).join("\n"));
    value.shell.root.editor.handleInput?.("\u001b");
    value.shell.root.editor.setText("");
    return text;
  };
  return { ...value, history, skills, frame, menu };
}

describe("OwnedUiSessionShell skills command", () => {
  it("applies a named skill directly through the prompt path and remembers the typed form", async () => {
    const { shell, engine, history } = await skillsFixture();
    try {
      await shell.submit("/skills framer fix the tests");
      await shell.submit("/skills skill:code-review");
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([
        "prompt:/skill:framer fix the tests",
        "prompt:/skill:code-review",
      ]);
      expect(history.submitted.map(item => [item.kind, item.text])).toEqual([
        ["slash", "/skills framer fix the tests"], ["slash", "/skills skill:code-review"],
      ]);
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
    } finally { await shell.dispose(); }
  });

  it("reports an unknown skill as a command outcome without opening the dialog or submitting", async () => {
    const { shell, engine, history, frame } = await skillsFixture();
    try {
      const result = await shell.submit("/skills review");
      expect(result).toMatchObject({ outcome: "failed", diagnostic: "Unknown skill: review" });
      expect(frame()).toContain("Unknown skill: review");
      expect(engine.session.calls.some(call => call.startsWith("prompt:"))).toBe(false);
      expect(history.submitted).toEqual([]);
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
      expect(frame()).not.toContain("↑↓ navigate");
    } finally { await shell.dispose(); }
  });

  it("opens the Skills dialog from bare /skills, applies with Enter, and cancels with Escape", async () => {
    const { shell, engine, history, terminal, frame } = await skillsFixture();
    try {
      shell.root.editor.setText("draft text");
      await shell.submit("/skills");
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      let shown = frame();
      expect(shown).toContain("Skills");
      expect(shown).toContain("→ skill:framer");
      expect(shown).toContain("  skill:code-review");
      expect(shown).toContain("Design, edit, and publish Framer sites");
      expect(shown).toContain("↑↓ navigate  enter select  escape/ctrl+c cancel");
      terminal.input("\u001b");
      await settle();
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
      expect(shell.root.editor.getText()).toBe("draft text");
      expect(engine.session.calls.some(call => call.startsWith("prompt:"))).toBe(false);
      expect(history.submitted).toEqual([]);

      shell.root.editor.setText("");
      await shell.submit("/skills");
      terminal.input("revi");
      terminal.input("\r");
      await vi.waitFor(() => expect(engine.session.calls).toContain("prompt:/skill:code-review"));
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
      // Invariant: the dialog query is never appended as arguments.
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual(["prompt:/skill:code-review"]);
      expect(history.submitted.map(item => item.text)).toEqual(["/skill:code-review"]);
      shown = frame();
      expect(shown).not.toContain("↑↓ navigate");
      terminal.resize(60, 20);
      shell.runtime.renderNow();
      await shell.submit("/skills");
      expect(stripTerminalSequences(shell.root.render(60).join("\n"))).toContain("→ skill:framer");
      terminal.input("\u001b");
      await settle();
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
    } finally { await shell.dispose(); }
  });

  it("renders No skills yet when no skill is discovered", async () => {
    const { shell, terminal, frame } = await skillsFixture("collapse", engine => withSkills(engine, []));
    try {
      await shell.submit("/skills");
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      expect(frame()).toContain("No skills yet");
      terminal.input("\r");
      await settle();
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      terminal.input("\u001b");
      await settle();
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
    } finally { await shell.dispose(); }
  });

  it("rewrites a tunneled submission for the engine while history keeps the typed form", async () => {
    const { shell, engine, history, terminal } = await skillsFixture();
    try {
      await shell.submit("/skills:framer redesign the hero");
      await shell.submit("/skills:code-review");
      await shell.submit("/skills:framer   spaced");
      await shell.submit("/skills:unknown-skill go");
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([
        "prompt:/skill:framer redesign the hero",
        "prompt:/skill:code-review",
        "prompt:/skill:framer   spaced",
        "prompt:/skill:unknown-skill go",
      ]);
      expect(history.submitted.map(item => [item.kind, item.text])).toEqual([
        ["slash", "/skills:framer redesign the hero"],
        ["slash", "/skills:code-review"],
        ["slash", "/skills:framer   spaced"],
        ["slash", "/skills:unknown-skill go"],
      ]);
      terminal.input("\u001b[A");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("/skills:unknown-skill go"));
      terminal.input("\u001b[A");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("/skills:framer   spaced"));
    } finally { await shell.dispose(); }
  });

  it("collapses the installed menu and refreshes it live when the presentation changes", async () => {
    const { shell, skills, menu } = await skillsFixture();
    try {
      let shown = await menu("/s");
      expect(shown.indexOf("settings")).toBeLessThan(shown.indexOf("skills"));
      expect(shown.indexOf("skills")).toBeLessThan(shown.indexOf("session"));
      shown = await menu("/skill");
      expect(shown).toContain("skills");
      expect(shown).toContain("Browse, search, and apply a skill");
      expect(shown).not.toContain("skill:framer");
      shown = await menu("/skills:");
      expect(shown).toContain("skills:framer");
      expect(shown).toContain("skills:code-review");
      shown = await menu("/skills fr");
      expect(shown).toContain("framer");
      expect(shown).not.toContain("code-review");

      skills.set("expand");
      // Compatibility: the pinned engine matches a `skill:` command on its bare name unless the typed
      // query already carries the prefix, so the per-skill rows answer `/skill:` rather than `/skill`.
      shown = await menu("/skill:");
      expect(shown).toContain("skill:framer");
      expect(shown).toContain("skill:code-review");
      expect(shown).not.toMatch(/\bskills\b/u);
      shown = await menu("/skills:");
      expect(shown).not.toContain("skills:framer");

      skills.set("collapse");
      shown = await menu("/skill");
      expect(shown).toContain("skills");
      expect(shown).not.toContain("skill:framer");

      // Invariant: an unrelated settings change keeps an extension provider wrapper installed over the tunnel.
      shell.root.editor.addAutocompleteProvider((inner: AutocompleteProvider): AutocompleteProvider => ({
        ...inner,
        getSuggestions: async (lines, cursorLine, cursorCol, options) => {
          const suggestions = await inner.getSuggestions(lines, cursorLine, cursorCol, options);
          return suggestions === null ? null : { ...suggestions, items: [...suggestions.items, { value: "wrapped", label: "wrapped" }] };
        },
        applyCompletion: (lines, cursorLine, cursorCol, item, prefix) => inner.applyCompletion(lines, cursorLine, cursorCol, item, prefix),
      }));
      skills.set("collapse");
      shown = await menu("/skills:fra");
      expect(shown).toContain("skills:framer");
      expect(shown).toContain("wrapped");
      skills.set("expand");
      shown = await menu("/skill:");
      expect(shown).toContain("skill:framer");
      expect(shown).not.toContain("wrapped");
    } finally { await shell.dispose(); }
    expect(skills.listeners.size).toBe(0);
  });

  it("leaves /skills and /skills: to the engine while expanded", async () => {
    const { shell, engine, history } = await skillsFixture("expand");
    try {
      await shell.submit("/skills framer fix");
      await shell.submit("/skills:framer go");
      await shell.submit("/skills");
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([
        "prompt:/skills framer fix", "prompt:/skills:framer go", "prompt:/skills",
      ]);
      expect(history.submitted.map(item => item.text)).toEqual(["/skills framer fix", "/skills:framer go", "/skills"]);
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
    } finally { await shell.dispose(); }
  });

  it("offers neither the skills command nor the tunnel when the engine does not register skill commands", async () => {
    const { shell, engine, menu } = await skillsFixture("collapse", engine => withSkills(engine, SKILLS, false));
    try {
      const shown = await menu("/skill");
      expect(shown).not.toMatch(/\bskills\b/u);
      expect(shown).not.toContain("skill:framer");
      expect(await menu("/skills:")).not.toContain("skills:framer");
      await shell.submit("/skills framer");
      await shell.submit("/skills:framer");
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual(["prompt:/skills framer", "prompt:/skills:framer"]);
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
    } finally { await shell.dispose(); }
  });

  it("keeps the pinned per-skill list in the comparison profile", async () => {
    const skills = skillsOptions("collapse");
    const { shell, engine } = await fixture([], [], false, undefined, undefined, undefined, undefined, undefined,
      undefined, engine => withSkills(engine), undefined, undefined, undefined, undefined, undefined, skills.options);
    try {
      shell.root.editor.handleInput?.("/skill:");
      await settle();
      const shown = stripTerminalSequences(shell.root.editor.render(100).join("\n"));
      expect(shown).toContain("skill:framer");
      expect(shown).not.toMatch(/\bskills\b/u);
      shell.root.editor.handleInput?.("\u001b");
      shell.root.editor.setText("");
      await shell.submit("/skills framer");
      await shell.submit("/skills:framer");
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual(["prompt:/skills framer", "prompt:/skills:framer"]);
      expect(skills.listeners.size).toBe(0);
    } finally { await shell.dispose(); }
  });
});
