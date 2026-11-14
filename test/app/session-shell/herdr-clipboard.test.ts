import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createResponseCopyExecutor } from "../../../src/app/session-shell/response-copy-transport.js";
import { ShellClipboard } from "../../../src/app/session-shell/shell-clipboard.js";
import { PastePreparationClient } from "../../../src/app/session-shell/paste-preparation-client.js";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { fixture, nextImmediate } from "./session-shell-fixture.js";

describe("Herdr terminal-owned clipboard", () => {
  beforeEach(() => {
    for (const name of ["SSH_CONNECTION", "SSH_CLIENT", "SSH_TTY", "TMUX", "STY", "WSL_DISTRO_NAME"]) vi.stubEnv(name, "");
    vi.stubEnv("HC_TERMINAL_ID", "herdr-terminal-id");
    vi.stubEnv("TERM_PROGRAM", "ghostty");
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([true, false])("routes selection copy through the shared destination (autocopy=%s)", async autocopy => {
    let writeControl!: (control: string) => void;
    const platformWriteText = vi.fn(async () => true);
    // Security: keep the real destination policy and preparer but replace all host/terminal side effects.
    const execute = createResponseCopyExecutor({ terminal: { submit: async control => writeControl(control) }, platformWriteText,
      helper: new URL("./response-copy-native-fixture.mjs", import.meta.url) });
    const { shell, terminal } = await fixture([
      { role: "assistant", content: [{ type: "text", text: "How are you" }], timestamp: 1 },
    ], [], true, undefined, undefined, undefined, undefined, undefined, undefined, undefined, { execute });
    writeControl = control => terminal.write(control);
    try {
      terminal.resize(60, 12);
      shell.root.viewport.setCopyOnSelect(autocopy);
      shell.runtime.renderNow();
      const rows = shell.root.render(60).map(stripTerminalSequences);
      const row = rows.findIndex(line => line.includes("How are you")) + 1;
      expect(row).toBeGreaterThan(0);
      const column = rows[row - 1]!.indexOf("How") + 1;
      terminal.input(`\u001b[<0;${column};${row}M\u001b[<32;${column + 3};${row}M\u001b[<0;${column + 3};${row}m`);
      if (!autocopy) {
        await nextImmediate();
        expect(terminal.writes.filter(write => write.startsWith("\u001b]52;c;"))).toEqual([]);
        terminal.input("\u0003");
      }
      await vi.waitFor(() => expect(terminal.writes.filter(write => write.startsWith("\u001b]52;c;")))
        .toEqual([`\u001b]52;c;${Buffer.from("How").toString("base64")}\u0007`]), { timeout: 5_000 });
      expect(platformWriteText).not.toHaveBeenCalled();
    } finally { await shell.dispose(); execute.dispose(); }
  }, 10_000);

  it.each(["How 界 👩‍💻", "first\nsecond", "large ".repeat(1000)])("inserts supplied text once without clipboard acquisition (case %#)", async text => {
    const readText = vi.fn(async () => "wrong host clipboard");
    const readImage = vi.fn(async () => null);
    const { shell, terminal } = await fixture([], [], true, undefined, { readText, readImage });
    try {
      terminal.input(`\u001b[200~${text}\u001b[201~ after`);
      await vi.waitFor(() => expect(shell.root.promptChips.prepareSubmission(shell.root.editor.getText()).text).toBe(`${text} after`));
      expect(readText).not.toHaveBeenCalled();
      expect(readImage).not.toHaveBeenCalled();
    } finally { await shell.dispose(); }
  });

  it("selects native image-only capture despite terminal-owned copy", () => {
    const clipboard = new ShellClipboard({ ownedCopy: true, substituteTerminal: false,
      disposed: () => false, terminalAttached: () => true, writeControl: vi.fn(),
    });
    try { expect(clipboard.capturePaste()).toMatchObject({ kind: "native", imagesOnly: true, before: expect.any(Function) }); }
    finally { clipboard.dispose(); }
  });

  it.each([false, true])("refuses known-remote raw paste but preserves an explicit clipboard port (provided=%s)", async provided => {
    vi.stubEnv("SSH_CONNECTION", "remote");
    const readText = vi.fn(async () => "explicit clipboard");
    const clipboard = new ShellClipboard({ ownedCopy: true, substituteTerminal: false,
      disposed: () => false, terminalAttached: () => true, writeControl: vi.fn(),
      ...(provided ? { clipboard: { readText } } : {}),
    });
    try {
      const source = clipboard.capturePaste();
      expect(source.kind).toBe("provided");
      if (source.kind !== "provided") throw new Error("Native acquisition must not be selected");
      if (provided) {
        await expect(source.read(new AbortController().signal)).resolves.toEqual({ kind: "text", text: "explicit clipboard" });
        expect(readText).toHaveBeenCalledOnce();
      } else {
        await expect(source.read(new AbortController().signal)).rejects.toMatchObject({ code: "paste-screenshot" });
        expect(readText).not.toHaveBeenCalled();
      }
    } finally { clipboard.dispose(); }
  });

  it("acquires a raw screenshot through the production gate and attaches its bytes once", async () => {
    const { shell, terminal, engine } = await fixture([], [], true, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      { helper: new URL("./paste-image-fixture.mjs", import.meta.url) });
    try {
      terminal.input("\u0016");
      terminal.input(" after");
      await vi.waitFor(() => expect(shell.root.promptChips.prepareSubmission(shell.root.editor.getText()).images).toHaveLength(1));
      expect(shell.root.editor.getText()).toMatch(/^\[📷 screenshot-[a-f0-9]+\] after$/u);
      const prepared = shell.root.promptChips.prepareSubmission(shell.root.editor.getText());
      expect(prepared.images).toEqual([{ type: "image", mimeType: "image/png",
        data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1sAAAAASUVORK5CYII=" }]);
      await shell.submit(shell.root.editor.getText());
      expect(engine.session.promptOptions.at(-1)).toMatchObject({ images: prepared.images });
    } finally { await shell.dispose(); }
  }, 10_000);

  it.each(["empty", "denied"])("retains the draft and reports retry feedback for %s screenshot acquisition", async mode => {
    const { shell, terminal } = await fixture([], [], true, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      { helper: new URL(`./paste-image-${mode}-fixture.mjs`, import.meta.url) });
    try {
      shell.root.editor.setText("before ");
      terminal.input("\u0016");
      terminal.input("after");
      await vi.waitFor(() => expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Couldn’t paste screenshot—try again."));
      expect(shell.root.editor.getText()).toBe("before after");
      expect(shell.root.promptChips.prepareSubmission(shell.root.editor.getText()).images).toEqual([]);
    } finally { await shell.dispose(); }
  }, 10_000);

  it("keeps image acquisition behind the captured terminal-copy barrier", async () => {
    const submission = Promise.withResolvers<void>();
    const submitting = Promise.withResolvers<void>();
    const platformWriteText = vi.fn(async () => true);
    const execute = createResponseCopyExecutor({ terminal: { submit: async () => { submitting.resolve(); await submission.promise; } },
      platformWriteText, helper: new URL("./response-copy-native-fixture.mjs", import.meta.url) });
    const clipboard = new ShellClipboard({ ownedCopy: true, substituteTerminal: false, responseCopy: { execute },
      disposed: () => false, terminalAttached: () => true, writeControl: vi.fn() });
    const phases: string[] = [];
    const client = new PastePreparationClient({ helper: new URL("./paste-image-fixture.mjs", import.meta.url), onEvent: event => phases.push(event.phase) });
    try {
      const copy = clipboard.copyText("copy from another agent");
      await submitting.promise;
      const paste = client.start(clipboard.capturePaste(), value => value, () => {});
      await vi.waitFor(() => expect(phases).toContain("predecessor"));
      expect(phases).not.toContain("acquiring");
      submission.resolve();
      await expect(copy).resolves.toMatchObject({ outcome: "submitted-unverified" });
      await expect(paste.result).resolves.toMatchObject({ kind: "image", mimeType: "image/png" });
      paste.complete();
      expect(platformWriteText).not.toHaveBeenCalled();
    } finally { submission.resolve(); await client.dispose(); clipboard.dispose(); execute.dispose(); }
  }, 10_000);
});
