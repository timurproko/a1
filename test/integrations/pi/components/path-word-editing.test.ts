import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPiShellEditor, type PiShellEditorPort } from "../../../../src/integrations/pi/components/index.js";

const CTRL_HOME = "\u001b[1;5H";
const CTRL_LEFT = "\u001b[1;5D";
const CTRL_RIGHT = "\u001b[1;5C";
const CTRL_BACKSPACE = "\b";
const CTRL_DELETE = "\u001b[3;5~";
const LEFT = "\u001b[D";
const BACKSPACE = "\u007f";
const UNDO = "\u001a";
const YANK = "\u0012";
const CUSTOM_WORD_LEFT = "\u0011";
const WINDOWS_PATH = "D:/Git/a1/.worktrees/prevent-windows-nul-artifacts-impl";
const roots: string[] = [];

afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

function editor(profile: "a1" | "pi" = "a1", agentDir?: string, onChange?: (text: string) => void): PiShellEditorPort {
  return createPiShellEditor({
    keybindingProfile: profile,
    getColumns: () => 120,
    getRows: () => 24,
    requestRender() {},
    onSubmit() {},
    ...(agentDir === undefined ? {} : { agentDir }),
    ...(onChange === undefined ? {} : { onChange }),
  });
}

function input(editor: PiShellEditorPort, data: string): void {
  editor.handleInput?.(data);
}

function moveRight(editor: PiShellEditorPort, count: number): void {
  for (let index = 0; index < count; index += 1) input(editor, "\u001b[C");
}

describe("bare-A1 path word editing", () => {
  it.each([
    WINDOWS_PATH,
    "D:\\Git\\a1\\source-file.ts",
    "\\\\server\\share\\folder\\file.ts",
    "/usr/local/bin/tool",
    "./src/file.ts",
    "../src/file.ts",
    "~/src/file.ts",
    '"D:/Project Files/source/file.ts"',
    "D:/项目/файл-name.ts",
  ])("moves across %s as one word", path => {
    const backward = editor();
    backward.setText(path);
    input(backward, CTRL_LEFT);
    input(backward, "|");
    expect(backward.getText()).toBe(`|${path}`);

    const forward = editor();
    forward.setText(path);
    input(forward, CTRL_HOME);
    input(forward, CTRL_RIGHT);
    input(forward, "|");
    expect(forward.getText()).toBe(`${path}|`);
  });

  it("uses the corresponding path boundary when movement starts inside the path", () => {
    const caret = WINDOWS_PATH.indexOf("windows") + 3;
    const backward = editor();
    backward.setText(WINDOWS_PATH);
    input(backward, CTRL_HOME);
    moveRight(backward, caret);
    input(backward, CTRL_LEFT);
    input(backward, "|");
    expect(backward.getText()).toBe(`|${WINDOWS_PATH}`);

    const forward = editor();
    forward.setText(WINDOWS_PATH);
    input(forward, CTRL_HOME);
    moveRight(forward, caret);
    input(forward, CTRL_RIGHT);
    input(forward, "|");
    expect(forward.getText()).toBe(`${WINDOWS_PATH}|`);
  });

  it("lands at the path boundary without consuming surrounding prose separators", () => {
    const value = `open ${WINDOWS_PATH} now`;
    const prompt = editor();
    prompt.setText(value);
    input(prompt, CTRL_HOME);
    moveRight(prompt, "open ".length + WINDOWS_PATH.length);

    input(prompt, CTRL_LEFT);
    input(prompt, "|");

    expect(prompt.getText()).toBe(`open |${WINDOWS_PATH} now`);
  });

  it("deletes the whole path from either outer boundary", () => {
    const backward = editor();
    backward.setText(WINDOWS_PATH);
    input(backward, CTRL_BACKSPACE);
    expect(backward.getText()).toBe("");

    const forward = editor();
    forward.setText(WINDOWS_PATH);
    input(forward, CTRL_HOME);
    input(forward, CTRL_DELETE);
    expect(forward.getText()).toBe("");
  });

  it("deletes only the directional portion when the caret is inside the path", () => {
    const caret = WINDOWS_PATH.indexOf("windows") + 3;
    const backward = editor();
    backward.setText(WINDOWS_PATH);
    input(backward, CTRL_HOME);
    moveRight(backward, caret);
    input(backward, CTRL_BACKSPACE);
    expect(backward.getText()).toBe(WINDOWS_PATH.slice(caret));

    const forward = editor();
    forward.setText(WINDOWS_PATH);
    input(forward, CTRL_HOME);
    moveRight(forward, caret);
    input(forward, CTRL_DELETE);
    expect(forward.getText()).toBe(WINDOWS_PATH.slice(0, caret));
  });

  it("keeps separate paths as separate words", () => {
    const value = `D:/first/file.ts ../second/file.ts`;
    const prompt = editor();
    prompt.setText(value);

    input(prompt, CTRL_LEFT);
    input(prompt, CTRL_LEFT);
    input(prompt, "|");

    expect(prompt.getText()).toBe(`|${value}`);
  });

  it("preserves grapheme movement and character deletion inside paths", () => {
    const moved = editor();
    moved.setText(WINDOWS_PATH);
    input(moved, LEFT);
    input(moved, "|");
    expect(moved.getText()).toBe(`${WINDOWS_PATH.slice(0, -1)}|${WINDOWS_PATH.slice(-1)}`);

    const deleted = editor();
    deleted.setText(WINDOWS_PATH);
    input(deleted, BACKSPACE);
    expect(deleted.getText()).toBe(WINDOWS_PATH.slice(0, -1));
  });

  it("preserves native undo, kill-ring yank, and change notification", async () => {
    const agentDir = await mkdtemp(join(tmpdir(), "a1-path-word-bindings-"));
    roots.push(agentDir);
    await writeFile(join(agentDir, "keybindings.json"), JSON.stringify({
      "tui.editor.yank": "ctrl+r",
      "tui.editor.cursorWordLeft": "ctrl+q",
    }));
    const changed = vi.fn();
    const prompt = editor("a1", agentDir, changed);
    prompt.setText(WINDOWS_PATH);

    input(prompt, CTRL_BACKSPACE);
    expect(prompt.getText()).toBe("");
    expect(changed).toHaveBeenLastCalledWith("");
    input(prompt, UNDO);
    expect(prompt.getText()).toBe(WINDOWS_PATH);
    input(prompt, CTRL_BACKSPACE);
    input(prompt, YANK);
    expect(prompt.getText()).toBe(WINDOWS_PATH);
    input(prompt, CUSTOM_WORD_LEFT);
    input(prompt, "|");
    expect(prompt.getText()).toBe(`|${WINDOWS_PATH}`);
  });

  it("preserves pinned punctuation boundaries for non-path prose", () => {
    const prompt = editor();
    prompt.setText("alpha-beta");

    input(prompt, CTRL_LEFT);
    input(prompt, "|");

    expect(prompt.getText()).toBe("alpha-|beta");
  });

  it("leaves path word segmentation disabled in the Pi comparison profile", () => {
    const prompt = editor("pi");
    prompt.setText(WINDOWS_PATH);

    input(prompt, CTRL_LEFT);
    input(prompt, "|");

    expect(prompt.getText()).toBe(`${WINDOWS_PATH.slice(0, -4)}|impl`);
  });
});
