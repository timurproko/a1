import { mkdtemp, readFile, rm, truncate, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { startPasteExecutor } from "../../../src/app/session-shell/paste-executor.js";
import { runImageWorker } from "../../../src/app/session-shell/image-preparation-client.js";
import { screenshotPng } from "../../fixtures/image-sources.js";
import { fixture, nextImmediate } from "./session-shell-fixture.js";

describe.each(["source", "emitted"])("single supplied image files (%s helper)", entry => {
  const helper = new URL(`../../../${entry === "source" ? "src" : "dist"}/app/session-shell/paste-helper.${entry === "source" ? "ts" : "js"}`, import.meta.url);

  it("prepares a quoted, spaced image path into exact attachment bytes", async () => {
    const root = await mkdtemp(join(tmpdir(), "supplied-image-"));
    const path = join(root, "screenshot with spaces.PNG"), bytes = screenshotPng(16, 8);
    await writeFile(path, bytes);
    const job = startPasteExecutor({ kind: "text", text: `"${path}"` }, new AbortController().signal, () => {}, helper);
    try {
      await expect(job.result).resolves.toEqual({ kind: "image", data: bytes.toString("base64"), mimeType: "image/png", width: 16, height: 8, transformed: false });
    } finally { job.cancel(); await job.stopped; await rm(root, { recursive: true, force: true }); }
  }, 10_000);

  it.each(["invalid", "mime", "oversized", "pixels"])("rejects %s image content without trusting the filename", async fault => {
    const root = await mkdtemp(join(tmpdir(), "supplied-image-invalid-"));
    const path = join(root, fault === "mime" ? "screenshot.jpg" : "screenshot.png");
    const bytes = screenshotPng(16, 8);
    if (fault === "pixels") bytes.writeUInt32BE(32_769, 16);
    await writeFile(path, fault === "invalid" ? Buffer.from("not an image") : bytes);
    if (fault === "oversized") await truncate(path, 20 * 1024 * 1024 + 1);
    const job = startPasteExecutor({ kind: "text", text: path }, new AbortController().signal, () => {}, helper);
    try {
      const codes = { invalid: "image-conversion", mime: "image-mime", oversized: "image-source-size", pixels: "image-pixels" };
      await expect(job.result).rejects.toMatchObject({ code: codes[fault as keyof typeof codes] });
    } finally { job.cancel(); await job.stopped; await rm(root, { recursive: true, force: true }); }
  }, 10_000);

  it("reports a vanished file without exposing its path or reacquiring the clipboard", async () => {
    const root = await mkdtemp(join(tmpdir(), "supplied-image-vanished-"));
    const path = join(root, "private-name.png");
    await writeFile(path, screenshotPng(16, 8));
    const job = startPasteExecutor({ kind: "text", text: path }, new AbortController().signal,
      phase => { if (phase === "acquired-image") rmSync(path); }, helper);
    try {
      await expect(job.result).rejects.toMatchObject({ code: "paste-screenshot", message: "Couldn’t paste screenshot—try again." });
    } finally { job.cancel(); await job.stopped; await rm(root, { recursive: true, force: true }); }
  }, 10_000);

  it("cancels file preparation before granting conversion and fences helper exit", async () => {
    const root = await mkdtemp(join(tmpdir(), "supplied-image-cancel-"));
    const path = join(root, "screenshot.png");
    await writeFile(path, screenshotPng(16, 8));
    const controller = new AbortController();
    const job = startPasteExecutor({ kind: "text", text: path }, controller.signal,
      phase => { if (phase === "acquired-image") controller.abort(); }, helper);
    try { await expect(job.result).rejects.toMatchObject({ code: "image-canceled" }); }
    finally { job.cancel(); await job.stopped; await rm(root, { recursive: true, force: true }); }
  }, 10_000);

  it("retains multiple image-file references and ordinary text/file paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "supplied-image-list-"));
    const image = join(root, "screenshot.png"), text = join(root, "notes.txt");
    await writeFile(image, screenshotPng(16, 8)); await writeFile(text, "notes");
    try {
      for (const value of [`"${image}" "${image}"`, `"${image}" "${text}"`, text, root]) {
        const job = startPasteExecutor({ kind: "text", text: value }, new AbortController().signal, () => {}, helper);
        try { await expect(job.result).resolves.toMatchObject({ kind: "paths" }); }
        finally { job.cancel(); await job.stopped; }
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 15_000);
});

describe("Herdr supplied screenshots in the production shell", () => {
  beforeEach(() => {
    for (const name of ["SSH_CONNECTION", "SSH_CLIENT", "SSH_TTY", "TMUX", "STY", "WSL_DISTRO_NAME"]) vi.stubEnv(name, "");
    vi.stubEnv("HC_TERMINAL_ID", "markerless-remote");
    vi.stubEnv("TERM_PROGRAM", "ghostty");
  });
  afterEach(() => vi.unstubAllEnvs());

  async function setup() {
    const root = await mkdtemp(join(tmpdir(), "herdr-image-shell-"));
    const path = join(root, "transferred screenshot.png"), trace = join(root, "clipboard-operations");
    const helper = join(root, "helper.mjs"), bytes = screenshotPng(16, 8);
    await writeFile(path, bytes);
    const wrapper = new URL("./clipboard-built-fixture-base.mjs", import.meta.url).href;
    await writeFile(helper, `import {runBuiltClipboardFixture} from ${JSON.stringify(wrapper)}; await runBuiltClipboardFixture('paste-helper','image-denied',${JSON.stringify(trace)});`);
    try {
      const value = await fixture([], [], true, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
        { helper: pathToFileURL(helper) });
      return { ...value, root, path, trace, bytes };
    } catch (error) { await rm(root, { recursive: true, force: true }); throw error; }
  }

  it("attaches a transferred screenshot once, keeps later typing, and preserves undo/history", async () => {
    const { shell, terminal, engine, root, path, trace, bytes } = await setup();
    try {
      terminal.input(`\u001b[200~"${path}"\u001b[201~`);
      terminal.input(" after");
      await vi.waitFor(() => expect(shell.root.promptChips.prepareSubmission(shell.root.editor.getText()).images).toHaveLength(1));
      const draft = shell.root.editor.getText();
      expect(draft).toMatch(/^\[📷 screenshot-[a-f0-9]+\] after$/u);
      const attachment = { type: "image", data: bytes.toString("base64"), mimeType: "image/png" };
      expect(shell.root.promptChips.prepareSubmission(draft).images).toEqual([attachment]);
      const records = shell.root.promptChips.imageChipAttachments(draft);
      expect(records).toHaveLength(1);
      expect(records[0]!.image).toEqual(attachment);
      expect(shell.root.promptChips.rehydrateHistoryText(shell.root.promptChips.prepareHistoryText(draft), id => id === records[0]!.id ? records[0]!.image : null)).toBe(draft);
      terminal.input("\u001a");
      terminal.input("\u001a");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("");
      expect(shell.root.promptChips.prepareSubmission(shell.root.editor.getText()).images).toEqual([]);
      shell.root.editor.setText(draft);
      await shell.submit(draft);
      expect(engine.session.promptOptions.at(-1)).toMatchObject({ images: [attachment] });
      await expect(readFile(trace, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await shell.dispose(); await rm(root, { recursive: true, force: true }); }
  }, 10_000);

  it("preserves two rapid supplied screenshots and intervening typing in reservation order", async () => {
    const { shell, terminal, root, path, trace } = await setup();
    try {
      terminal.input(`\u001b[200~"${path}"\u001b[201~`);
      terminal.input(" between ");
      terminal.input(`\u001b[200~"${path}"\u001b[201~`);
      terminal.input(" after");
      await vi.waitFor(() => expect(shell.root.promptChips.prepareSubmission(shell.root.editor.getText()).images).toHaveLength(2));
      expect(shell.root.editor.getText()).toMatch(/^\[📷 screenshot-[a-f0-9]+\] between \[📷 screenshot-[a-f0-9]+\] after$/u);
      await expect(readFile(trace, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await shell.dispose(); await rm(root, { recursive: true, force: true }); }
  }, 10_000);

  it("removes a failed file reservation and reports only the fixed retry message", async () => {
    const root = await mkdtemp(join(tmpdir(), "supplied-image-failed-shell-"));
    // A helper that reports a known read failure after identifying an image exercises chip cleanup.
    const failed = join(root, "failed.mjs");
    await writeFile(failed, `process.on('message', m => { if(m.kind==='begin') process.send({kind:'phase',phase:'acquired-image'}); if(m.kind==='convert') process.send({kind:'error',code:'paste-screenshot'}); }); process.send({kind:'ready'});`);
    const { shell, terminal } = await fixture([], [], true, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      { helper: pathToFileURL(failed) });
    try {
      shell.root.editor.setText("before ");
      terminal.input(`\u001b[200~"C:\\private screenshot.png"\u001b[201~`); terminal.input("after");
      await vi.waitFor(() => expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Couldn’t paste screenshot—try again."));
      expect(shell.root.editor.getText()).toBe("before after");
      expect(shell.root.promptChips.prepareSubmission(shell.root.editor.getText()).images).toEqual([]);
    } finally { await shell.dispose(); await rm(root, { recursive: true, force: true }); }
  }, 10_000);
});

it("sanitizes direct worker file-open errors before returning them to the shell", async () => {
  const root = await mkdtemp(join(tmpdir(), "image-worker-file-error-"));
  try {
    await expect(runImageWorker({ kind: "prepare-file", path: join(root, "private-missing.png") }, new AbortController().signal))
      .rejects.toMatchObject({ code: "paste-screenshot", message: "Couldn’t paste screenshot—try again." });
  } finally { await rm(root, { recursive: true, force: true }); }
});
