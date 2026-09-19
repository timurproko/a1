import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripTerminalSequences, type AutocompleteProvider } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { promptInputPresentation } from "../../../support/prompt-input-presentation.js";
import { createPiShellEditor, loadHistoryEditor, type PiShellAutocompleteCommand, type PiShellEditorOptions } from "../../../../src/integrations/pi/components/index.js";
import {
  collapseSkillCommands,
  createSkillsTunnelProvider,
  findSkillByArgument,
  rewriteSkillsTunnelSubmission,
  skillMatchesQuery,
  skillPrompt,
  skillsFromCommands,
  skillsTunnelQuery,
} from "../../../../src/integrations/pi/components/skills-command.js";
import { piTheme } from "../../../../src/integrations/pi/components/theme.js";

const settle = async () => { for (let i = 0; i < 4; i++) await new Promise<void>(resolve => setImmediate(resolve)); };
// Compatibility: the owned input profile binds undo to Ctrl+Z.
const UNDO = "\u001a";
const ESC = "\u001b";
const ENTER = "\r";
const TAB = "\t";
const DOWN = "\u001b[B";

const COMMANDS: readonly PiShellAutocompleteCommand[] = [
  { name: "model", description: "Select model (opens selector UI)", argumentHint: "<provider/model>" },
  { name: "plan", description: "Prompt template" },
  { name: "skill:framer", description: "Design, edit,\n  and publish  Framer sites" },
  { name: "skill:code-review", description: "Review the current diff" },
  { name: "skill:frontend-design", description: "" },
  { name: "mcp", description: "Extension command" },
];

async function fixture(history: boolean, extra: Partial<PiShellEditorOptions> = {}) {
  const root = await mkdtemp(join(tmpdir(), "skills-tunnel-"));
  const submitted: string[] = [];
  const editor = createPiShellEditor({
    keybindingProfile: "a1", persistentHistory: history,
    ...(history ? { historyEditor: await loadHistoryEditor() } : {}),
    agentDir: root, cwd: root, getColumns: () => 80, getRows: () => 24,
    requestRender() {}, onSubmit: text => submitted.push(text),
    promptPresentation: promptInputPresentation(),
    ...extra,
  });
  editor.setFocused?.(true);
  return { editor, submitted, dispose: async () => { editor.setAutocompleteCommands([]); await rm(root, { recursive: true, force: true }); } };
}

function menuText(editor: ReturnType<typeof createPiShellEditor>): string[] {
  const rows = editor.render(80);
  const body = editor.bodyGeometry!();
  return rows.slice(0, body.rowOffset).map(row => stripTerminalSequences(row).trimEnd());
}

describe("skills command helpers", () => {
  it("collapses skill entries into one skills command with skill-name argument completions", () => {
    const collapsed = collapseSkillCommands(COMMANDS);
    expect(collapsed.commands.map(command => command.name)).toEqual(["model", "plan", "skills", "mcp"]);
    expect(collapsed.commands[2]).toMatchObject({ name: "skills", description: "Browse, search, and apply a skill" });
    expect(collapsed.commands[2]!.argumentOptions).toEqual([
      { id: "framer", label: "framer", description: "Design, edit, and publish Framer sites" },
      { id: "code-review", label: "code-review", description: "Review the current diff" },
      { id: "frontend-design", label: "frontend-design" },
    ]);
    expect(collapsed.skills.map(skill => skill.name)).toEqual(["framer", "code-review", "frontend-design"]);
    expect(skillsFromCommands(COMMANDS)).toEqual(collapsed.skills);
  });

  it("leaves a list without skill entries untouched and offers no skills command", () => {
    const plain = COMMANDS.filter(command => !command.name.startsWith("skill:"));
    const collapsed = collapseSkillCommands(plain);
    expect(collapsed.commands).toBe(plain);
    expect(collapsed.skills).toEqual([]);
  });

  it("matches a query against the name or description, ignoring case and a leading skill: or skills:", () => {
    const [framer, review] = skillsFromCommands(COMMANDS);
    expect(skillMatchesQuery(framer!, "")).toBe(true);
    expect(skillMatchesQuery(framer!, "FRA")).toBe(true);
    expect(skillMatchesQuery(framer!, "publish")).toBe(true);
    expect(skillMatchesQuery(framer!, "skill:fram")).toBe(true);
    expect(skillMatchesQuery(framer!, "skills:fram")).toBe(true);
    expect(skillMatchesQuery(framer!, "review")).toBe(false);
    expect(skillMatchesQuery(review!, "diff")).toBe(true);
  });

  it("resolves a skills argument with or without the skill: prefix and builds the engine prompt", () => {
    const skills = skillsFromCommands(COMMANDS);
    expect(findSkillByArgument(skills, "framer")?.name).toBe("framer");
    expect(findSkillByArgument(skills, "skill:code-review")?.name).toBe("code-review");
    expect(findSkillByArgument(skills, "review")).toBeUndefined();
    expect(skillPrompt("framer")).toBe("/skill:framer");
    expect(skillPrompt("framer", "  redesign the hero  ")).toBe("/skill:framer redesign the hero");
  });

  it("rewrites only the tunnel submission form", () => {
    expect(rewriteSkillsTunnelSubmission("/skills:framer redesign the hero")).toBe("/skill:framer redesign the hero");
    expect(rewriteSkillsTunnelSubmission("/skills:framer")).toBe("/skill:framer");
    expect(rewriteSkillsTunnelSubmission("/skills:framer   spaced\nsecond line")).toBe("/skill:framer   spaced\nsecond line");
    expect(rewriteSkillsTunnelSubmission("/skills:unknown-skill go")).toBe("/skill:unknown-skill go");
    for (const text of ["/skills framer", "/skill:framer", "/skills:", "/skills: framer", "skills:framer", "/skills:fra/mer", "hello /skills:framer"]) {
      expect(rewriteSkillsTunnelSubmission(text)).toBe(text);
    }
  });

  it("recognizes the tunnel query only on a single top-level line before the cursor", () => {
    expect(skillsTunnelQuery(["/skills:"], 0, 8)).toBe("");
    expect(skillsTunnelQuery(["/skills:fra"], 0, 11)).toBe("fra");
    expect(skillsTunnelQuery(["/skills:framer rest"], 0, 14)).toBe("framer");
    expect(skillsTunnelQuery(["/skills:framer rest"], 0, 19)).toBeNull();
    expect(skillsTunnelQuery(["/skills"], 0, 7)).toBeNull();
    expect(skillsTunnelQuery(["/skills:", "second"], 0, 8)).toBeNull();
    expect(skillsTunnelQuery(["hello", "/skills:"], 1, 8)).toBeNull();
  });

  it("wraps a provider so only the tunnel form is answered locally and everything else is delegated", async () => {
    const calls: string[] = [];
    const base: AutocompleteProvider = {
      triggerCharacters: ["@"],
      getSuggestions: async lines => { calls.push(`suggest:${lines.join("|")}`); return { prefix: "/", items: [{ value: "model", label: "model" }] }; },
      applyCompletion: (lines, cursorLine, cursorCol, item, prefix) => { calls.push(`apply:${item.value}:${prefix}`); return { lines, cursorLine, cursorCol }; },
      shouldTriggerFileCompletion: () => { calls.push("file"); return false; },
    };
    const provider = createSkillsTunnelProvider(base, skillsFromCommands(COMMANDS));
    const signal = new AbortController().signal;
    expect(provider.triggerCharacters).toEqual(["@"]);
    expect(await provider.getSuggestions(["/skills:"], 0, 8, { signal })).toEqual({
      prefix: "/skills:",
      items: [
        { value: "skills:framer", label: "skills:framer", description: "Design, edit, and publish Framer sites" },
        { value: "skills:code-review", label: "skills:code-review", description: "Review the current diff" },
        { value: "skills:frontend-design", label: "skills:frontend-design" },
      ],
    });
    expect((await provider.getSuggestions(["/skills:fr"], 0, 10, { signal }))?.items.map(item => item.value)).toEqual(["skills:framer", "skills:frontend-design"]);
    expect((await provider.getSuggestions(["/skills:fra"], 0, 11, { signal }))?.items.map(item => item.value)).toEqual(["skills:framer"]);
    expect((await provider.getSuggestions(["/skills:publish"], 0, 15, { signal }))?.items.map(item => item.value)).toEqual(["skills:framer"]);
    expect(await provider.getSuggestions(["/skills:zzz"], 0, 11, { signal })).toBeNull();
    const aborted = new AbortController(); aborted.abort();
    expect(await provider.getSuggestions(["/skills:"], 0, 8, { signal: aborted.signal })).toBeNull();
    expect(calls).toEqual([]);
    expect(await provider.getSuggestions(["/sk"], 0, 3, { signal })).toEqual({ prefix: "/", items: [{ value: "model", label: "model" }] });
    provider.applyCompletion(["/skills:"], 0, 8, { value: "skills:framer", label: "skills:framer" }, "/skills:");
    expect(provider.shouldTriggerFileCompletion!(["x"], 0, 1)).toBe(false);
    expect(calls).toEqual(["suggest:/sk", "apply:skills:framer:/skills:", "file"]);
  });
});

describe.each([false, true])("skills tunnel in the bare-A1 editor (history=%s)", history => {
  it("collapses the menu, lists tunnel rows, and completes the selected skills row with a colon", async () => {
    let presentation: "collapse" | "expand" = "collapse";
    const { editor, submitted, dispose } = await fixture(history, { skillsPresentation: () => presentation });
    try {
      editor.setAutocompleteCommands(COMMANDS);
      // Rationale: the menu window shows five rows, so the narrowed search proves the collapsed entries.
      editor.handleInput?.("/skill");
      await settle();
      let menu = menuText(editor).join("\n");
      expect(menu).toContain("skills");
      expect(menu).toContain("Browse, search, and apply a skill");
      expect(menu).not.toContain("skill:");
      editor.handleInput?.(ESC);
      editor.setText("");
      editor.handleInput?.("/sk");
      await settle();
      menu = menuText(editor).join("\n");
      expect(menu).toContain("skills");
      expect(menu).not.toContain("model");
      editor.handleInput?.(":");
      await settle();
      expect(editor.getText()).toBe("/skills:");
      const rows = menuText(editor);
      expect(rows.join("\n")).toContain("skills:framer");
      expect(rows.join("\n")).toContain("skills:code-review");
      expect(rows.join("\n")).toContain("Design, edit, and publish Framer sites");
      expect(rows[0]!.trimStart()).toMatch(/^→ skills:framer/u);
      editor.handleInput?.(UNDO);
      expect(editor.getText()).toBe("/sk");
      editor.handleInput?.(ESC);
      editor.setText("");

      editor.handleInput?.("/skills:fr");
      await settle();
      expect(menuText(editor).filter(row => row.includes("skills:")).map(row => row.trim().replace(/^→ /u, "").split(/\s{2,}/u)[0]))
        .toEqual(["skills:framer", "skills:frontend-design"]);
      editor.handleInput?.("a");
      await settle();
      expect(menuText(editor).filter(row => row.includes("skills:")).map(row => row.trim().replace(/^→ /u, "").split(/\s{2,}/u)[0]))
        .toEqual(["skills:framer"]);
      // Compatibility: pinned slash-command application: Tab applies the row and keeps editing, Enter applies and submits.
      editor.handleInput?.(TAB);
      expect(editor.getText()).toBe("/skills:framer ");
      expect(menuText(editor)).toEqual([]);
      expect(submitted).toEqual([]);
      editor.setText("");
      editor.handleInput?.("/skills:fra");
      await settle();
      editor.handleInput?.(ENTER);
      expect(submitted).toEqual(["/skills:framer"]);
      editor.setText("");

      editor.handleInput?.("/skills:zzz");
      await settle();
      expect(menuText(editor)).toEqual([]);
      editor.setText("");

      // Rationale: the argument menu of the skills command lists matching names like every other command.
      editor.handleInput?.("/skills fr");
      await settle();
      expect(menuText(editor).join("\n")).toContain("framer");
      expect(menuText(editor).join("\n")).toContain("frontend-design");
      expect(menuText(editor).join("\n")).not.toContain("code-review");
      editor.setText("");
      editor.handleInput?.("/skills zz");
      await settle();
      expect(menuText(editor)).toEqual([]);
      editor.setText("");

      // Invariant: a live switch to expand reinstalls the pinned per-skill entries without a skills command.
      presentation = "expand";
      editor.setAutocompleteCommands(COMMANDS);
      editor.handleInput?.("/skill");
      await settle();
      menu = menuText(editor).join("\n");
      expect(menu).toContain("skill:framer");
      expect(menu).toContain("skill:code-review");
      expect(menu).not.toMatch(/\bskills\b/u);
      editor.handleInput?.(ESC);
      editor.setText("");
      editor.handleInput?.("/skills:");
      await settle();
      expect(editor.getText()).toBe("/skills:");
      expect(menuText(editor)).toEqual([]);
    } finally { await dispose(); }
  });

  it("inserts every other colon as ordinary text", async () => {
    const { editor, dispose } = await fixture(history, { skillsPresentation: () => "collapse" });
    try {
      editor.setAutocompleteCommands(COMMANDS);
      editor.handleInput?.(":");
      expect(editor.getText()).toBe(":");
      editor.setText("");
      editor.handleInput?.("/mo");
      await settle();
      expect(menuText(editor).join("\n")).toContain("model");
      editor.handleInput?.(":");
      expect(editor.getText()).toBe("/mo:");
      editor.handleInput?.(ESC);
      editor.setText("");
      editor.handleInput?.("note /sk");
      await settle();
      editor.handleInput?.(":");
      expect(editor.getText()).toBe("note /sk:");
      editor.setText("");
      // Invariant: a menu whose selected row is another command keeps the colon ordinary, before and after moving the selection.
      editor.handleInput?.("/s");
      await settle();
      expect(menuText(editor)[0]).toMatch(/^\s*→ settings/u);
      editor.handleInput?.(":");
      expect(editor.getText()).toBe("/s:");
      editor.handleInput?.(ESC);
      editor.setText("");
      editor.handleInput?.("/s");
      await settle();
      editor.handleInput?.(DOWN);
      expect(menuText(editor).find(row => row.includes("→"))).not.toMatch(/skills/u);
      editor.handleInput?.(":");
      expect(editor.getText()).toBe("/s:");
    } finally { await dispose(); }
  });

  it("keeps the selected tunnel row's description muted and composes extension wrappers over the tunnel", async () => {
    const { editor, dispose } = await fixture(history, { skillsPresentation: () => "collapse" });
    try {
      editor.setAutocompleteCommands(COMMANDS);
      editor.handleInput?.("/skills:");
      await settle();
      // Rationale: the owned menu paints whitespace cells in reverse video; only the color roles matter here.
      const rows = editor.render(80).map(row => row.replaceAll(/\u001b\[2?7m/gu, ""));
      const accentStart = piTheme().fg("accent", "MARK").split("MARK")[0]!;
      const mutedStart = piTheme().fg("muted", "MARK").split("MARK")[0]!;
      const selected = rows.find(row => stripTerminalSequences(row).trimStart().startsWith("→ skills:framer"))!;
      expect(selected).toBeDefined();
      expect(selected).toContain(`${accentStart}→ skills:framer`);
      // Invariant: the description keeps the muted role: its color start precedes only spacing before the text.
      const description = selected.slice(selected.indexOf("→ skills:framer"));
      expect(description).toContain(mutedStart);
      expect(stripTerminalSequences(description.slice(description.indexOf(mutedStart)))).toMatch(/^\s+Design, edit, and publish Framer sites/u);
      expect(description.slice(description.indexOf(mutedStart))).not.toContain(accentStart);
      const ordinary = rows.find(row => stripTerminalSequences(row).trim().startsWith("skills:code-review"))!;
      expect(stripTerminalSequences(ordinary.slice(ordinary.indexOf(mutedStart)))).toMatch(/^\s+Review the current diff/u);
      editor.handleInput?.(ESC);
      editor.setText("");

      const seen: string[] = [];
      editor.addAutocompleteProvider((inner: AutocompleteProvider): AutocompleteProvider => ({
        ...inner,
        getSuggestions: async (lines, cursorLine, cursorCol, options) => {
          const suggestions = await inner.getSuggestions(lines, cursorLine, cursorCol, options);
          seen.push(`${lines[cursorLine]}=${suggestions?.items.map(item => item.value).join(",") ?? "none"}`);
          return suggestions;
        },
        applyCompletion: (lines, cursorLine, cursorCol, item, prefix) => inner.applyCompletion(lines, cursorLine, cursorCol, item, prefix),
      }));
      editor.handleInput?.("/skills:code");
      await settle();
      expect(seen.at(-1)).toBe("/skills:code=skills:code-review");
      editor.handleInput?.(TAB);
      expect(editor.getText()).toBe("/skills:code-review ");
    } finally { await dispose(); }
  });
});

describe("skills tunnel outside collapse", () => {
  it("installs the pinned per-skill list in the comparison profile and without a presentation", async () => {
    const root = await mkdtemp(join(tmpdir(), "skills-tunnel-pi-"));
    try {
      for (const profile of ["pi", "a1"] as const) {
        const editor = createPiShellEditor({
          keybindingProfile: profile, agentDir: root, cwd: root, getColumns: () => 80, getRows: () => 24,
          requestRender() {}, onSubmit() {},
          ...(profile === "a1" ? { promptPresentation: promptInputPresentation() } : {}),
          // Invariant: the comparison profile receives the same option and must ignore it.
          ...(profile === "pi" ? { skillsPresentation: () => "collapse" as const } : {}),
        });
        editor.setFocused?.(true);
        editor.setAutocompleteCommands(COMMANDS);
        editor.handleInput?.("/skill");
        await settle();
        const text = editor.render(80).map(row => stripTerminalSequences(row)).join("\n");
        expect(text).toContain("skill:framer");
        expect(text).not.toMatch(/\bskills\b/u);
        editor.handleInput?.(ESC);
        editor.setText("");
        editor.handleInput?.("/sk");
        await settle();
        editor.handleInput?.(":");
        expect(editor.getText()).toBe("/sk:");
        editor.setText("");
        editor.handleInput?.("/skills:");
        await settle();
        const after = editor.render(80).map(row => stripTerminalSequences(row)).join("\n");
        expect(after).not.toContain("skills:framer");
        editor.setAutocompleteCommands([]);
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
