/**
 * Provenance: @earendil-works/pi-coding-agent 1.5.2 (MIT), commit b4afdddf44e059c67ccf5097e5317d913521b470,
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
  { readonly status: "complete"; readonly content: string } | { readonly status: "failed"; readonly message: string }
> {
  const directory = mkdtempSync(join(tmpdir(), "pi-editor-"));
  const filePath = join(directory, "prompt.md");
  try {
    writeFileSync(filePath, options.content, "utf-8");
    const [editor, ...editorArgs] = options.command.split(" ");
    if (!editor) return { status: "failed", message: "No external editor command is configured" };
    process.stdout.write(`Launching external editor: ${options.command}\nPi will resume when the editor exits.\n`);
    const exit = await new Promise<number | NodeJS.Signals | null>(resolve => {
      const child = spawn(editor, [...editorArgs, filePath], {
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      child.on("error", () => resolve(null));
      child.on("close", (code, signal) => resolve(code ?? signal));
    });
    if (exit === null) {
      return { status: "failed", message: `Failed to launch external editor: ${options.command}` };
    }
    if (exit !== 0) {
      return {
        status: "failed",
        message: `External editor exited with ${typeof exit === "number" ? `code ${exit}` : exit}; prompt unchanged`,
      };
    }
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
