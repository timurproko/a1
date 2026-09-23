/**
 * Provenance: @earendil-works/pi-coding-agent 0.87.1 (MIT), commit f07218c4d4bbc12bef056a7058c3dd49dfe41abe,
 * packages/coding-agent/src/modes/interactive/external-editor.ts.
 * Modifications: Mechanical port: retain temporary prompt file, asynchronous inherited-stdio editor
 * process, completion readback, and best-effort cleanup behind the owned extension-editor component.
 * Deviations: none.
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
    // Rationale: upstream strips the BOM through a private util the package does not export; the check lives here.
    const edited = readFileSync(filePath, "utf-8");
    return { status: "complete", content: (edited.startsWith("﻿") ? edited.slice(1) : edited).replace(/\n$/, "") };
  } finally {
    try {
      rmSync(directory, { recursive: true, force: true });
    } catch {
      // Cleanup is best effort.
    }
  }
}
