/**
 * Adapted from @earendil-works/pi-coding-agent 0.84.2
 * packages/coding-agent/src/modes/interactive/external-editor.ts (MIT).
 * Modification: retained as an owned adjacent source unit for the owned ExtensionEditor port.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function editInExternalEditor(options: { readonly command: string; readonly content: string }): Promise<
  { readonly status: "complete"; readonly content: string } | { readonly status: "failed" }
> {
  const directory = mkdtempSync(join(tmpdir(), "pi-editor-"));
  const filePath = join(directory, "prompt.md");
  try {
    writeFileSync(filePath, options.content, "utf-8");
    const [editor, ...editorArgs] = options.command.split(" ");
    if (!editor) return { status: "failed" };
    process.stdout.write(`Launching external editor: ${options.command}\nPi will resume when the editor exits.\n`);
    const exitCode = await new Promise<number | null>(resolve => {
      const child = spawn(editor, [...editorArgs, filePath], {
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      child.on("error", () => resolve(null));
      child.on("close", code => resolve(code));
    });
    if (exitCode !== 0) return { status: "failed" };
    return { status: "complete", content: readFileSync(filePath, "utf-8").replace(/\n$/, "") };
  } finally {
    try {
      rmSync(directory, { recursive: true, force: true });
    } catch {
      // Cleanup is best effort.
    }
  }
}
