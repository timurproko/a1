import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createResponseCopyExecutor } from "../../../src/app/session-shell/response-copy-transport.js";
import { ShellClipboard } from "../../../src/app/session-shell/shell-clipboard.js";
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

  it("inserts terminal-provided paste once without native acquisition", async () => {
    const readText = vi.fn(async () => "wrong host clipboard");
    const { shell, terminal } = await fixture([], [], true, undefined, { readText });
    try {
      const text = "How 界 👩‍💻";
      terminal.input(`\u001b[200~${text}\u001b[201~ after`);
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe(`${text} after`);
      expect(readText).not.toHaveBeenCalled();
    } finally { await shell.dispose(); }
  });

  it.each([false, true])("refuses wrong-host native paste but preserves an explicit clipboard port (provided=%s)", async provided => {
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
        await expect(source.read(new AbortController().signal)).rejects.toMatchObject({ code: "paste-unavailable" });
        expect(readText).not.toHaveBeenCalled();
      }
    } finally { clipboard.dispose(); }
  });
});
