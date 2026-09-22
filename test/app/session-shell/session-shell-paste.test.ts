import { createResponseCopyExecutor } from "../../../src/app/session-shell/response-copy-transport.js";
import { selectionCopyRowText } from "../../../src/ui/components/index.js";
import { PromptHistoryService } from "../../../src/features/prompt-history/index.js";
import { type ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CURSOR_MARKER, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { Markdown } from "@earendil-works/pi-tui";
import { describe, expect, it, onTestFailed, onTestFinished, vi } from "vitest";
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
import { screenshotPng } from "../../fixtures/image-sources.js";
import { OwnedUiSessionShell } from "../../../src/app/session-shell/index.js";
import { Session, fixture, observedPasteFixture, nextImmediate } from "./session-shell-fixture.js";

describe("OwnedUiSessionShell paste and clipboard", () => {
  it("reserves and settles the cold first Ctrl+V exactly once before any mouse paste", async () => {
    let release!: (value: string) => void;
    const readText = vi.fn(() => new Promise<string>(resolve => { release = resolve; }));
    const events: Array<{ request: number; phase: string }> = [];
    const { shell, terminal } = await fixture([], [], true, undefined, { readText }, undefined, undefined, undefined, undefined, undefined, undefined,
      event => events.push({ request: event.request, phase: event.phase }));
    try {
      terminal.input("\u0016");
      const reservation = shell.root.editor.getText();
      expect(reservation).toMatch(/^\[📷 screenshot-[a-f0-9]+\]$/u);
      expect(shell.root.hasPendingPastes(reservation)).toBe(true);
      await vi.waitFor(() => expect(readText).toHaveBeenCalledOnce());
      const route = events.filter(event => event.request < 0);
      expect(route.map(event => event.phase)).toEqual(["shortcut-received", "shortcut-matched", "shortcut-admitted"]);
      expect(new Set(route.map(event => event.request)).size).toBe(1);
      expect(events.filter(event => event.request > 0 && event.phase === "admitted")).toHaveLength(1);

      terminal.input(" after");
      release("cold first paste");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("cold first paste after"), { timeout: 5_000 });
      expect(readText).toHaveBeenCalledOnce();
      expect(events.filter(event => event.request > 0 && event.phase === "inserting")).toHaveLength(1);
      expect(events.filter(event => event.request > 0 && event.phase === "settled")).toHaveLength(1);
      expect(JSON.stringify(events)).not.toMatch(/cold first paste|clipboard payload|screenshot-/u);
    } finally { await shell.dispose(); }
  });

  it("records first terminal-owned inline paste through truthful framing, insertion, and settlement", async () => {
    const readText = vi.fn(async () => "must not be read");
    const events: Array<{ request: number; phase: string; transport: string | undefined; outcome: string | undefined }> = [];
    const { shell, terminal } = await fixture([], [], true, undefined, { readText }, undefined, undefined, undefined, undefined, undefined, undefined,
      event => events.push({ request: event.request, phase: event.phase, transport: event.transport, outcome: event.outcome }));
    try {
      terminal.input("\u001b[200~terminal first\u001b[201~ after");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("terminal first after");
      expect(readText).not.toHaveBeenCalled();
      expect(events.map(event => event.phase)).toEqual(["framing", "inserting", "settled"]);
      expect(new Set(events.map(event => event.request)).size).toBe(1);
      expect(events.every(event => event.request < 0 && event.transport === "terminal")).toBe(true);
      expect(events.at(-1)?.outcome).toBe("ready");
    } finally { await shell.dispose(); }
  });

  it.each(["native", "terminal"] as const)("bounds near-limit URL presentation without losing its value (%s)", async route => {
    const text = "https://example.com/" + "x".repeat(16 * 1024 * 1024 - 64);
    const readText = vi.fn(async () => text);
    const { shell, terminal } = await fixture([], [], true, undefined, { readText });
    let last = performance.now(), gap = 0;
    const timer = setInterval(() => { const now = performance.now(); gap = Math.max(gap, now - last); last = now; }, 5);
    try {
      const begin = performance.now();
      terminal.input(route === "native" ? "\x16" : `\x1b[200~${text}\x1b[201~`);
      terminal.input(" after");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toContain("[🔗 "), { timeout: 15_000 });
      const draft = shell.root.editor.getText();
      expect(draft.endsWith(" after")).toBe(true);
      expect(draft.length).toBeLessThan(80);
      expect(shell.root.preparePromptSubmission(draft).text === text + " after").toBe(true);
      expect(shell.root.prepareHistoryText(draft) === text + " after").toBe(true);
      shell.runtime.renderNow();
      terminal.input(" typing");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe(draft + " typing");
      shell.runtime.renderNow();
      await new Promise(resolve => setTimeout(resolve, 10));
      clearInterval(timer);
      const maxWriteBytes = Math.max(...terminal.writes.map(value => Buffer.byteLength(value)));
      expect(maxWriteBytes).toBeLessThan(64 * 1024);
      expect(terminal.writes.some(value => value.includes("\x1b]8;;https://example.com/"))).toBe(false);
      expect(readText).toHaveBeenCalledTimes(route === "native" ? 1 : 0);
      // Rationale: structural bounds gate CI; timing remains synthetic evidence, not physical acceptance.
      console.log("CLIPBOARD_PRESENTATION_PROBE", JSON.stringify({ route, sourceBytes: Buffer.byteLength(text), insertionMs: performance.now() - begin,
        maxTimerGapMs: gap, maxWriteBytes, editorChars: draft.length }));
    } finally { clearInterval(timer); await shell.dispose(); }
  }, 20_000);

  it.each([10, 1000].flatMap(history => [false, true].flatMap(streaming => ["copy", "paste", "combined"].map(operation => ({ history, streaming, operation })))))
    ("records separate cold/warm clipboard baselines %j", async ({ history, streaming, operation }) => {
      let clipboard = "external value";
      const samples: unknown[] = [];
      const copyPhases: { phase: string; elapsedMs: number }[] = [];
      const pastePhases: { phase: string; elapsedMs: number; bytes: number }[] = [];
      const runtimePhases: string[] = [];
      const writeText = vi.fn(async (text: string) => { clipboard = text; });
      const readText = vi.fn(async () => clipboard);
      const messages = Array.from({ length: history }, (_, i) => ({ role: "assistant", content: [{ type: "text", text: i === history - 1 ? "copy-target visible response" : `generated historical response ${i}` }] }));
      const { shell, terminal, engine, adapter } = await fixture(messages, [], true, undefined, { readText }, undefined,
        { onEvent: event => runtimePhases.push(event.phase) }, undefined, undefined, undefined,
        { execute: createResponseCopyExecutor({ writeText }), onEvent: event => copyPhases.push({ phase: event.phase, elapsedMs: event.elapsedMs }) },
        event => pastePhases.push({ phase: event.phase, elapsedMs: event.elapsedMs ?? 0, bytes: event.bytes ?? 0 }));
      try {
        if (streaming) { engine.session.emit({ type: "agent_start" }); await adapter.flushEvents(); }
        for (let iteration = 0; iteration < 3; iteration++) {
          shell.root.editor.setText(""); shell.runtime.renderNow();
          clipboard = `external-${iteration}`;
          copyPhases.length = 0; pastePhases.length = 0; runtimePhases.length = 0;
          let last = performance.now(), gap = 0, ticks = 0;
          const heartbeat = setInterval(() => { const now = performance.now(); gap = Math.max(gap, now - last); last = now; ticks++; }, 5);
          const begin = performance.now();
          try {
            if (operation !== "paste") {
              const rows = shell.root.render(80).map(stripTerminalSequences);
              const row = rows.findIndex(text => text.includes("copy-target"));
              expect(row).toBeGreaterThanOrEqual(0);
              const column = rows[row]!.indexOf("copy-target") + 1;
              // Rationale: independent generated drags must not become double/triple-click selection gestures.
              const clock = vi.spyOn(Date, "now").mockReturnValue(Date.now() + iteration * 1000);
              try { terminal.input(`\u001b[<0;${column};${row + 1}M\u001b[<32;${column + 10};${row + 1}M\u001b[<0;${column + 10};${row + 1}m\u0003`); }
              finally { clock.mockRestore(); }
            }
            if (operation !== "copy") terminal.input("\x16");
            terminal.input("typed"); await nextImmediate();
            expect(shell.root.editor.getText()).toContain("typed");
            const inputMs = performance.now() - begin;
            if (operation !== "paste") await vi.waitFor(() => expect(clipboard).toBe("copy-target"), { timeout: 5000 });
            if (operation !== "copy") await vi.waitFor(() => expect(shell.root.editor.getText()).toBe(`${clipboard}typed`), { timeout: 5000 });
            else expect(shell.root.editor.getText()).toBe("typed");
            await nextImmediate(); shell.runtime.renderNow();
            expect(ticks).toBeGreaterThan(0);
            samples.push({ iteration, temperature: iteration === 0 ? "cold-shell" : "warm-shell", inputMs,
              completionMs: performance.now() - begin, maxTimerGapMs: gap, ticks,
              compositions: runtimePhases.filter(phase => phase === "composition-end").length,
              writes: runtimePhases.filter(phase => phase === "write-end").length, copyPhases: [...copyPhases], pastePhases: [...pastePhases] });
          } finally { clearInterval(heartbeat); }
        }
        expect(writeText).toHaveBeenCalledTimes(operation === "paste" ? 0 : 3);
        expect(readText).toHaveBeenCalledTimes(operation === "copy" ? 0 : 3);
        // Rationale: helpers still start cold per request; these generated timings do not measure physical clipboard/terminal behavior.
        console.log("CLIPBOARD_GENERATED_BASELINE", JSON.stringify({ history, streaming, operation, samples }));
      } finally { await shell.dispose(); }
    }, 20_000);

  it.each(["single-line", "multiline", "image"])("records isolated large-payload presentation controls (%s)", async kind => {
    const text = kind === "single-line" ? "x".repeat(2 * 1024 * 1024) : "generated line\n".repeat(100_000);
    const image = screenshotPng(1024, 1024).toString("base64");
    const phases: { phase: string; elapsedMs: number; bytes: number }[] = [];
    const { shell, terminal } = await fixture([], [], true, undefined,
      { readText: async () => text, ...(kind === "image" ? { readImage: async () => ({ data: image, mimeType: "image/png" }) } : {}) },
      undefined, undefined, undefined, undefined, undefined, undefined,
      event => phases.push({ phase: event.phase, elapsedMs: event.elapsedMs ?? 0, bytes: event.bytes ?? 0 }));
    let last = performance.now(), gap = 0, ticks = 0;
    const heartbeat = setInterval(() => { const now = performance.now(); gap = Math.max(gap, now - last); last = now; ticks++; }, 5);
    try {
      const begin = performance.now(); terminal.input("\x16"); terminal.input(" after"); await nextImmediate();
      expect(shell.root.editor.getText()).toContain(" after");
      await vi.waitFor(() => {
        expect(shell.root.editor.getText()).toMatch(kind === "image" ? /^\[📷 screenshot-/u : /^\[paste #/u);
        expect(shell.root.hasPendingPastes(shell.root.editor.getText())).toBe(false);
      }, { timeout: 10_000 });
      const ready = shell.root.preparePromptSubmission(shell.root.editor.getText());
      if (kind === "image") { expect(ready.images).toHaveLength(1); expect(ready.text).toBe(shell.root.editor.getText()); }
      else expect(ready.text === text + " after").toBe(true);
      shell.runtime.renderNow(); await nextImmediate();
      expect(ticks).toBeGreaterThan(0);
      expect(shell.root.editor.getText().length).toBeLessThan(100);
      const maxWriteBytes = Math.max(...terminal.writes.map(value => Buffer.byteLength(value)));
      expect(maxWriteBytes).toBeLessThan(64 * 1024);
      console.log("CLIPBOARD_LARGE_CONTROL", JSON.stringify({ kind, elapsedMs: performance.now() - begin, maxTimerGapMs: gap, ticks, maxWriteBytes, phases }));
    } finally { clearInterval(heartbeat); await shell.dispose(); }
  }, 15_000);

  it.each([{ count: 2, nameUnits: 7 }, { count: 1000, nameUnits: 7 }, { count: 4000, nameUnits: 7 }, { count: 12000, nameUnits: 7 }, { count: 6000, nameUnits: 160 }, { count: 0, nameUnits: 160 }]
    .flatMap(value => [false, true].map(terminalPaste => ({ ...value, terminalPaste }))))("bounds path-list presentation and preserves edits %j", async ({ count: requestedCount, nameUnits, terminalPaste }) => {
    const directory = await mkdtemp(join(tmpdir(), "clipboard-path-evidence-"));
    const file = join(directory, `${"f".repeat(nameUnits)}.txt`);
    await writeFile(file, "generated");
    const count = requestedCount || Math.floor(16 * 1024 * 1024 / (Buffer.byteLength(file) + 3));
    const text = Array.from({ length: count }, () => `"${file}"`).join("\n");
    const phases: string[] = [];
    const readText = vi.fn(async () => text);
    const { shell, terminal } = await fixture([], [], true, undefined, { readText }, undefined, undefined, undefined, undefined, undefined, undefined,
      event => phases.push(event.phase));
    let last = performance.now(), gap = 0, ticks = 0;
    const heartbeat = setInterval(() => { const now = performance.now(); gap = Math.max(gap, now - last); last = now; ticks++; }, 5);
    try {
      const begin = performance.now();
      terminal.input(terminalPaste ? `\x1b[200~${text}\x1b[201~` : "\x16"); terminal.input(" after");
      await nextImmediate();
      expect(shell.root.editor.getText()).toContain(" after");
      await vi.waitFor(() => expect(phases).toContain("settled"), { timeout: 15_000 });
      const draft = shell.root.editor.getText();
      const pathFallback = phases.includes("path-fallback");
      const expanded = pathFallback ? text : file.repeat(count);
      expect(shell.root.preparePromptSubmission(draft).text === expanded + " after").toBe(true);
      expect(shell.root.prepareHistoryText(draft) === expanded + " after").toBe(true);
      if (count > 2) {
        expect(draft).toMatch(/^\[paste #\d+ (?:\d+ chars|\+\d+ lines)\] after$/u);
        expect(draft.length).toBeLessThan(100);
      } else if (!pathFallback) expect(draft).toBe("[📄 fffffff.txt]".repeat(count) + " after");
      expect(readText).toHaveBeenCalledTimes(terminalPaste ? 0 : 1);
      shell.runtime.renderNow(); await nextImmediate();
      expect(ticks).toBeGreaterThan(0);
      const maxWriteBytes = Math.max(...terminal.writes.map(value => Buffer.byteLength(value)));
      expect(maxWriteBytes).toBeLessThan(64 * 1024);
      // Rationale: deterministic representation/content gates are separate from generated timings and physical acceptance.
      console.log("CLIPBOARD_PATH_PRESENTATION", JSON.stringify({ count, nameUnits, terminalPaste, pathFallback, sourceBytes: Buffer.byteLength(text),
        editorChars: draft.length, elapsedMs: performance.now() - begin, maxTimerGapMs: gap, maxWriteBytes }));
      terminal.input("\x1a"); await nextImmediate();
      expect(shell.root.editor.getText()).toBe(draft.slice(0, -6));
      terminal.input("\x1a"); await nextImmediate();
      expect(shell.root.editor.getText()).toBe("");
      terminal.input("\x19"); await nextImmediate();
      expect(shell.root.editor.getText()).toBe(draft.slice(0, -6));
      terminal.input("\x19"); await nextImmediate();
      expect(shell.root.editor.getText()).toBe(draft);
      expect(shell.root.preparePromptSubmission(draft).text === expanded + " after").toBe(true);
    } finally { clearInterval(heartbeat); await shell.dispose(); await rm(directory, { recursive: true, force: true }); }
  }, 25_000);

  it.each(["\n", " "])("bounds aggregate URL metadata and resets each decoration pass (separator=%j)", async separator => {
    const { shell } = await fixture([], [], true);
    const url = "https://example.com/" + "x".repeat(30_000);
    const small = "https://small.example/";
    try {
      const chip = shell.root.rehydrateHistoryText(url, () => null);
      const smallChip = shell.root.rehydrateHistoryText(small, () => null);
      shell.root.editor.setText([chip, chip, chip, smallChip].join(separator));
      for (let pass = 0; pass < 3; pass++) {
        const rows = shell.root.editor.render(separator === "\n" ? 80 : 220);
        const output = rows.join("\n");
        const controls = [...output.matchAll(/\u001b\]8;;[^\u0007\u001b]*(?:\u0007|\u001b\\)/gu)].map(match => match[0]);
        expect(controls.reduce((sum, value) => sum + Buffer.byteLength(value), 0)).toBeLessThanOrEqual(64 * 1024);
        expect(controls.filter(value => value === `\u001b]8;;${url}\u001b\\`)).toHaveLength(2);
        expect(controls.filter(value => value === `\u001b]8;;${small}\u001b\\`)).toHaveLength(1);
        expect(stripTerminalSequences(output)).toContain(smallChip);
      }
      expect(shell.root.preparePromptSubmission(shell.root.editor.getText()).text === [url, url, url, small].join(separator)).toBe(true);
    } finally { await shell.dispose(); }
  });

  it.each([false, true])("keeps selected-response copying independent of UI progress (streaming=%s)", async streaming => {
    let finish!: () => void;
    const pending = new Promise<void>(resolve => { finish = resolve; });
    let clipboardText = "old clipboard";
    const readText = vi.fn(async () => clipboardText);
    const phases: string[] = [];
    const { shell, terminal, engine, adapter } = await fixture([
      { role: "assistant", content: [{ type: "text", text: "copy-target response text" }] },
    ], [], true, undefined, { readText }, undefined, undefined, undefined, undefined, undefined, {
      onEvent: event => phases.push(event.phase),
      execute: (snapshot, phase) => {
        phase("submitting", snapshot.sourceUnits, "injected");
        const result = pending.then(() => {
          clipboardText = snapshot.rows.map((row, index) => selectionCopyRowText(snapshot, row, index)).join("\n");
          return { outcome: "delivered" as const };
        });
        return { result, stopped: result.then(() => {}), cancel: finish };
      },
    });
    try {
      if (streaming) { engine.session.emit({ type: "agent_start" }); await adapter.flushEvents(); }
      shell.runtime.renderNow();
      const rows = shell.root.render(80).map(stripTerminalSequences);
      const row = rows.findIndex(text => text.includes("copy-target"));
      const column = rows[row]!.indexOf("copy-target") + 1;
      terminal.input(`\u001b[<0;${column};${row + 1}M\u001b[<32;${column + 10};${row + 1}M\u001b[<0;${column + 10};${row + 1}m\u0003`);
      expect(shell.root.hasActiveSelection()).toBe(false);
      terminal.input("still usable");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("still usable");
      expect(phases).toContain("submitting");
      expect(phases).not.toContain("settled");
      terminal.input("\u0016");
      await nextImmediate();
      expect(readText).not.toHaveBeenCalled();
      if (streaming) {
        const message = { role: "assistant", content: [{ type: "text", text: "new streamed response" }], timestamp: 2 };
        engine.session.emit({ type: "message_start", message });
        engine.session.emit({ type: "message_end", message });
        await adapter.flushEvents();
        shell.runtime.renderNow();
        expect(shell.root.render(80).map(stripTerminalSequences).join("\n")).toContain("new streamed response");
        const writes = terminal.writes.length;
        await vi.waitFor(() => expect(terminal.writes.length).toBeGreaterThan(writes), { timeout: 1000 });
        expect(phases).not.toContain("settled");
      }
      finish();
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("still usablecopy-target"));
      expect(clipboardText).toBe("copy-target");
      expect(phases).toContain("settled");
    } finally { finish(); await shell.dispose(); }
  });

  it.each(["current", "session", "dispose"])("fences late copy completion and preserves UI ownership across %s", async boundary => {
    let release!: () => void;
    const waiting = new Promise<void>(resolve => { release = resolve; });
    const cancel = vi.fn();
    const formatting = vi.spyOn(Markdown.prototype, "render");
    const messages = [{ role: "assistant", content: [{ type: "text", text: Array.from({ length: 100 }, (_, i) => `row ${i} selectable content`).join("\n\n") }] }];
    const { shell, terminal, engine, adapter } = await fixture(messages, [], true, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, {
        execute: (_snapshot, phase) => {
          phase("submitting", 10, "injected");
          const result = waiting.then(() => ({ outcome: "delivered" as const }));
          return { result, stopped: result.then(() => {}), cancel };
        },
      });
    const select = () => {
      const rows = shell.root.render(80).map(stripTerminalSequences);
      const row = rows.findIndex(text => text.includes("selectable"));
      expect(row).toBeGreaterThanOrEqual(0);
      const column = rows[row]!.indexOf("selectable") + 1;
      terminal.input(`\u001b[<0;${column};${row + 1}M\u001b[<32;${column + 10};${row + 1}M\u001b[<0;${column + 10};${row + 1}m`);
    };
    try {
      await nextImmediate(); shell.runtime.renderNow();
      expect(formatting.mock.calls.length).toBeGreaterThan(0);
      const formats = formatting.mock.calls.length;
      select(); terminal.input("\u0003");
      expect(shell.root.hasActiveSelection()).toBe(false);
      terminal.input("draft"); await nextImmediate(); shell.runtime.renderNow();
      expect(shell.root.editor.getText()).toBe("draft");
      const top = shell.root.viewportPresentationEvidence().scrollTop;
      terminal.input("\u001b[<64;2;2M"); await nextImmediate(); shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBeLessThan(top);
      expect(formatting.mock.calls.length).toBe(formats);
      if (boundary === "session") { await engine.rebindSession?.(new Session(messages)); await adapter.flushEvents(); shell.runtime.renderNow(); }
      if (boundary === "dispose") {
        await shell.dispose();
        expect(terminal.active).toBe(false);
        expect(terminal.writes.join("")).toContain("\u001b[?1049l");
      } else {
        select(); expect(shell.root.hasActiveSelection()).toBe(true);
      }
      const writes = terminal.writes.length;
      release(); await nextImmediate(); await nextImmediate();
      if (boundary === "dispose") expect(terminal.writes).toHaveLength(writes);
      else expect(shell.root.hasActiveSelection()).toBe(true);
      if (boundary !== "current") expect(cancel).toHaveBeenCalledOnce();
    } finally { release(); await shell.dispose(); formatting.mockRestore(); }
  });

  it("does not paste the previous clipboard after a known response-copy failure", async () => {
    let fail!: () => void;
    const pending = new Promise<void>(resolve => { fail = resolve; });
    const readText = vi.fn(async () => "stale text");
    const { shell, terminal } = await fixture([
      { role: "assistant", content: [{ type: "text", text: "selected response" }] },
    ], [], true, undefined, { readText }, undefined, undefined, undefined, undefined, undefined, {
      execute: (_snapshot, phase) => {
        phase("submitting", 10, "injected");
        const result = pending.then(() => ({ outcome: "failed" as const, failure: "denied" as const }));
        return { result, stopped: result.then(() => {}), cancel: fail };
      },
    });
    try {
      const rows = shell.root.render(80).map(stripTerminalSequences);
      const row = rows.findIndex(text => text.includes("selected response"));
      const column = rows[row]!.indexOf("selected") + 1;
      terminal.input(`\u001b[<0;${column};${row + 1}M\u001b[<32;${column + 7};${row + 1}M\u001b[<0;${column + 7};${row + 1}m\u0003`);
      await nextImmediate();
      terminal.input("\u0016");
      fail();
      // Invariant: the paste error replaces the earlier copy-failure notice in the shared dock slot.
      await vi.waitFor(() => expect(shell.root.render(80).map(stripTerminalSequences).join("\n")).toContain("Paste skipped because the preceding copy failed."));
      expect(shell.root.render(80).map(stripTerminalSequences).join("\n")).not.toContain("clipboard is unavailable");
      await nextImmediate();
      expect(readText).not.toHaveBeenCalled();
      expect(shell.root.editor.getText()).toBe("");
      terminal.input("still usable"); await nextImmediate();
      expect(shell.root.editor.getText()).toBe("still usable");
    } finally { fail(); await shell.dispose(); }
  });

  it.each([
    ["/models", "Models"],
    ["/settings", "Auto-compact"],
    ["/fork", "Fork"],
    ["/login", "Login"],
    ["/logout", "Logout"],
  ])("preserves normal transcript scroll and copy behind %s", async (command, _heading) => {
    const messages = [{ role: "assistant", content: [{ type: "text", text: Array.from({ length: 120 }, (_, i) => `transcript-${i} alpha beta gamma`).join("\n\n") }] }];
    const { shell, terminal, engine } = await fixture(messages, [], true);
    try {
      terminal.resize(80, 54);
      shell.runtime.renderNow();
      await shell.submit(command!);
      await nextImmediate();
      shell.runtime.renderNow();
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      const previous = shell.root.viewportPresentationEvidence().scrollTop;
      const calls = [...engine.session.calls];
      terminal.input("\u001b[<64;3;3M");
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(previous - 3);
      expect(engine.session.calls).toEqual(calls);
      const selectedRow = shell.root.render(80).findIndex(row => stripTerminalSequences(row).includes("transcript-")) + 1;
      expect(selectedRow).toBeGreaterThan(0);
      const before = terminal.writes.length;
      terminal.input(`\u001b[<0;2;${selectedRow}M\u001b[<32;7;${selectedRow}M\u001b[<0;7;${selectedRow}m\u0003`);
      await nextImmediate();
      shell.runtime.renderNow();
      const output = terminal.writes.slice(before).join("");
      const copies = [...output.matchAll(/\u001b\]52;c;([^\u0007]*)\u0007/g)];
      expect(copies).toHaveLength(1);
      expect(Buffer.from(copies[0]![1]!, "base64").toString()).not.toContain("\u001b");
      expect(output).not.toContain("Copied");
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      expect(engine.session.calls).toEqual(calls);
      terminal.input("\u001b");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
    } finally { await shell.dispose(); }
  });

  it.each(["replacement", "overlay"])("routes an unlisted extension %s by painted bounds and preserves mixed input order", async kind => {
    const { shell, terminal, engine } = await fixture([{ role: "assistant", content: [{ type: "text", text: "alpha beta gamma\n\n".repeat(100) }] }], [], true);
    const received: string[] = [];
    let done: (() => void) | undefined;
    try {
      terminal.resize(80, 40);
      const context = (engine.session.extensionBindings as { uiContext: ExtensionUIContext }).uiContext;
      const result = context.custom<void>((_tui, _theme, _keys, finish) => {
        done = () => finish();
        return { render: (width: number) => ["EXTENSION".padEnd(width), " ".repeat(width), " ".repeat(width)],
          invalidate() {}, handleInput(data: string) { received.push(data); } };
      }, kind === "overlay" ? { overlay: true, overlayOptions: { width: 20, row: 8, col: 10 } } : undefined);
      await nextImmediate();
      shell.runtime.renderNow();
      const modalRow = kind === "overlay" ? 9 : shell.root.render(80).findIndex(row => row.includes("EXTENSION")) + 1;
      const modalCol = kind === "overlay" ? 11 : 1;
      const top = shell.root.viewportPresentationEvidence().scrollTop;
      terminal.input("\u001b[<64;2;3M");
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top - 3);
      expect(received).toEqual([]);
      terminal.input(`x\u001b[<0;${modalCol};${modalRow}M\u001b[<32;2;3M\u001b[<0;2;3my`);
      await nextImmediate();
      expect(received).toEqual(["x", `\u001b[<0;${modalCol};${modalRow}M`, "\u001b[<32;2;3M", "\u001b[<0;2;3m", "y"]);
      received.length = 0;
      const selectedRow = shell.root.render(80).findIndex(row => stripTerminalSequences(row).includes("alpha")) + 1;
      terminal.input("\u001b[<0;2;");
      terminal.input(`${selectedRow}M\u001b[<32;7;${selectedRow}M\u001b[<0;7;${selectedRow}m`);
      const copyAt = terminal.writes.length;
      terminal.input("\u0003");
      await nextImmediate();
      expect(terminal.writes.slice(copyAt).join("")).toContain("\u001b]52;c;");
      expect(received).toEqual([]);
      done!();
      await result;
      shell.runtime.renderNow();
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
      expect(shell.runtime.hasOverlay()).toBe(false);
    } finally { done?.(); await shell.dispose(); }
  });

  it.each(["select", "confirm", "input", "editor", "custom-editor"])("preserves viewport interaction during extension %s", async kind => {
    const { shell, terminal, engine } = await fixture([{ role: "assistant", content: [{ type: "text", text: "alpha beta gamma\n\n".repeat(100) }] }], [], true);
    const context = (engine.session.extensionBindings as { uiContext: ExtensionUIContext }).uiContext;
    let pending: Promise<unknown> | undefined;
    try {
      terminal.resize(80, 54);
      if (kind === "select") pending = context.select("Extension choices", ["One", "Two"]);
      else if (kind === "confirm") pending = context.confirm("Permission", "Allow this operation?");
      else if (kind === "input") pending = context.input("Extension input");
      else if (kind === "editor") pending = context.editor("Extension editor", "draft");
      else context.setEditorComponent(() => ({ render: () => ["Custom editor"], invalidate() {}, handleInput() {}, getText: () => "", setText() {}, insertTextAtCursor() {}, addToHistory() {} }));
      await nextImmediate();
      shell.runtime.renderNow();
      const before = shell.root.viewportPresentationEvidence().scrollTop;
      terminal.input("\u001b[<64;2;3M");
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(before - 3);
      const row = shell.root.render(80).findIndex(line => stripTerminalSequences(line).includes("alpha")) + 1;
      const copyAt = terminal.writes.length;
      terminal.input(`\u001b[<0;2;${row}M\u001b[<32;7;${row}M\u001b[<0;7;${row}m\u0003`);
      await nextImmediate();
      expect(terminal.writes.slice(copyAt).join("")).toContain("\u001b]52;c;");
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      if (kind === "custom-editor") context.setEditorComponent(undefined);
      else terminal.input("\u001b");
      await pending;
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
    } finally { await shell.dispose(); }
  });

  it("recalls expanded large pasted text using a fresh durable history worker and chip store", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "text-paste-history-"));
    const options = { dataDir, profileRoot: join(dataDir, "profile"), limit: 100 };
    const payload = "日本語 👩‍💻 [📷 literal] [paste #999 1001 chars]\n  indented\n".repeat(12).trim();
    const firstSnapshot = (store: PromptHistoryService) => new Promise<void>(resolvePromise => {
      let unsubscribe = () => {};
      unsubscribe = store.onSnapshot(() => { unsubscribe(); resolvePromise(); });
    });
    let shell: OwnedUiSessionShell | undefined;
    try {
      const firstStore = new PromptHistoryService(options); const firstReady = firstSnapshot(firstStore);
      const first = await fixture([], [], true, undefined, { readText: async () => payload }, undefined, undefined, undefined,
        { store: firstStore, limit: 100 });
      shell = first.shell; await firstReady; first.terminal.input("\x16");
      await vi.waitFor(() => expect(shell!.root.editor.getText()).toMatch(/^\[paste #1 /u));
      await shell.submit(shell.root.editor.getText()); await shell.dispose(); shell = undefined;
      const secondStore = new PromptHistoryService(options); const secondReady = firstSnapshot(secondStore);
      const second = await fixture([], [], true, undefined, undefined, undefined, undefined, undefined,
        { store: secondStore, limit: 100 });
      shell = second.shell; await secondReady;
      expect(shell.root.editor.recall?.position().total).toBe(1);
      second.terminal.input("\x1b[A");
      await vi.waitFor(() => expect(shell!.root.editor.getText()).toBe(payload));
      await shell.submit(shell.root.editor.getText());
      expect(second.engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([`prompt:${payload}`]);
    } finally { await shell?.dispose(); await rm(dataDir, { recursive: true, force: true }); }
  });

  it.each(["shortcut", "terminal", "right-click"])("pastes text without flashing a screenshot chip through %s", async gesture => {
    let release!: (text: string) => void;
    const read = new Promise<string>(resolve => { release = resolve; });
    const { shell, terminal } = await fixture([], [], true, undefined, { readText: () => read });
    try {
      terminal.resize(40, 16);
      shell.root.editor.setText("before ");
      shell.runtime.renderNow();
      const before = shell.root.editor.render(40);
      const start = terminal.writes.length;
      if (gesture === "shortcut") terminal.input("\u0016");
      else if (gesture === "terminal") terminal.input("\u001b[200~\u001b[201~");
      else {
        const frame = shell.root.render(40).map(stripTerminalSequences);
        const row = frame.findIndex(line => line.includes("before ")) + 1;
        terminal.input(`\u001b[<2;8;${row}M\u001b[<2;8;${row}m`);
      }
      // Concurrency: force real presentation while clipboard acquisition is still unresolved.
      shell.runtime.renderNow();
      expect(shell.root.editor.render(40)).toEqual(before);
      terminal.input("after");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(stripTerminalSequences(shell.root.editor.render(40).join("\n"))).toContain("before after");
      release("pasted\ntext");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("before pasted\ntextafter"));
      shell.runtime.renderNow();
      expect(terminal.writes.slice(start).join("")).not.toMatch(/screenshot-|preparing/u);
      terminal.input("!");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("before pasted\ntextafter!");
    } finally { await shell.dispose(); }
  });

  it("keeps repeated text pastes invisible and ordered when the second read finishes first", async () => {
    let first!: (text: string) => void;
    let second!: (text: string) => void;
    const readText = vi.fn().mockImplementationOnce(() => new Promise(resolve => { first = resolve; }))
      .mockImplementationOnce(() => new Promise(resolve => { second = resolve; }));
    const { shell, terminal } = await fixture([], [], true, undefined, { readText });
    try {
      shell.root.editor.setText("left ");
      terminal.input("\u0016");
      terminal.input("middle ");
      terminal.input("\u0016");
      terminal.input("right");
      await vi.waitFor(() => expect(readText).toHaveBeenCalledTimes(2));
      const frame = () => stripTerminalSequences(shell.root.editor.render(40).join("\n"));
      expect(frame()).toContain("left middle right");
      expect(frame()).not.toContain("screenshot-");
      second("second ");
      await vi.waitFor(() => expect(frame()).toContain("left middle second right"));
      expect(frame()).not.toContain("screenshot-");
      first("first ");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("left first middle second right"));
      expect(frame()).not.toContain("screenshot-");
    } finally { await shell.dispose(); }
  });

  it("reserves paste before acquisition and waits once on Enter without replacing newer input", async () => {
    let release!: (value: { data: string; mimeType: string }) => void;
    const source = screenshotPng().toString("base64");
    const read = new Promise<{ data: string; mimeType: string }>(resolve => { release = resolve; });
    const { shell, terminal, engine } = await fixture([], [], true, undefined, { readText: async () => null, readImage: () => read });
    try {
      terminal.input("\u0016");
      const chip = shell.root.editor.getText();
      expect(chip).toMatch(/^\[📷 screenshot-[a-f0-9]+\]$/u);
      expect(shell.root.hasPendingPastes(chip)).toBe(true);
      shell.runtime.renderNow();
      const frame = stripTerminalSequences(shell.root.render(100).join("\n"));
      expect(frame).not.toContain(chip);
      expect(frame).not.toContain("preparing");
      terminal.input(" inspect this");
      await nextImmediate();
      const draft = shell.root.editor.getText();
      terminal.input("\r");
      const duplicate = shell.submit(draft);
      terminal.input("newer draft");
      expect(engine.session.promptOptions).toHaveLength(0);
      expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("Waiting for images");
      release({ data: source, mimeType: "image/png" });
      expect((await duplicate).outcome).toBe("completed");
      expect(engine.session.promptOptions).toHaveLength(1);
      expect(engine.session.calls.find(call => call.startsWith("prompt:"))).toBe(`prompt:${chip.slice(0, -1)}-resized] inspect this`);
      expect(shell.root.editor.getText()).toBe("newer draft");
      expect(stripTerminalSequences(shell.root.render(100).join("\n"))).not.toContain("Waiting for images");
    } finally { await shell.dispose(); }
  }, 20_000);

  it.each(["delete", "cancel", "session", "dispose"])("does not resurrect or dispatch a pending image after %s", async action => {
    let release!: (value: { data: string; mimeType: string }) => void;
    const read = new Promise<{ data: string; mimeType: string }>(resolve => { release = resolve; });
    const { shell, terminal, engine, adapter } = await fixture([], [], true, undefined, { readText: async () => null, readImage: () => read });
    try {
      terminal.input("\u0016");
      expect(shell.root.editor.getText()).toMatch(/^\[📷 screenshot-[a-f0-9]+\]$/u);
      expect(shell.root.hasPendingPastes(shell.root.editor.getText())).toBe(true);
      await nextImmediate();
      if (action === "delete") { terminal.input("\u0001"); terminal.input("\u007f"); }
      if (action === "cancel") { terminal.input("\r"); await shell.interrupt(); }
      if (action === "session") { await engine.rebindSession?.(new Session()); await adapter.flushEvents(); }
      if (action === "dispose") await shell.dispose();
      await nextImmediate();
      shell.root.editor.setText("newer");
      release({ data: screenshotPng(8, 8).toString("base64"), mimeType: "image/png" });
      await nextImmediate(); await nextImmediate();
      expect(shell.root.editor.getText()).toBe("newer");
      expect(engine.session.promptOptions).toHaveLength(0);
    } finally { await shell.dispose(); }
  });

  it("keeps image order and caret position when the second paste completes first", async () => {
    let first!: (value: { data: string; mimeType: string }) => void;
    const firstData = screenshotPng(8, 8).toString("base64");
    const secondData = screenshotPng(12, 12).toString("base64");
    const readImage = vi.fn().mockImplementationOnce(() => new Promise(resolve => { first = resolve; }))
      .mockResolvedValueOnce({ data: secondData, mimeType: "image/png" });
    const { shell, terminal, engine } = await fixture([], [], true, undefined, { readText: async () => null, readImage });
    try {
      terminal.input("\u0016");
      const firstChip = shell.root.editor.getText();
      terminal.input("\u0016");
      const secondChip = shell.root.editor.getText().slice(firstChip.length);
      terminal.input(" tail");
      await vi.waitFor(() => expect(shell.root.hasPendingPastes(secondChip)).toBe(false));
      expect(shell.root.editor.getText()).toBe(`${firstChip}${secondChip} tail`);
      expect(shell.root.hasPendingPastes(firstChip)).toBe(true);
      first({ data: firstData, mimeType: "image/png" });
      await vi.waitFor(() => expect(shell.root.hasPendingPastes(firstChip)).toBe(false));
      expect(shell.root.editor.getText()).toBe(`${firstChip}${secondChip} tail`);
      expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain(`${firstChip}${secondChip}`);
      terminal.input("!");
      await nextImmediate();
      expect(shell.root.editor.getText()).toMatch(/ tail!$/u);
      terminal.input("\r");
      await nextImmediate();
      expect(engine.session.promptOptions.at(-1)).toMatchObject({ images: [
        { data: firstData, mimeType: "image/png" }, { data: secondData, mimeType: "image/png" },
      ] });
    } finally { await shell.dispose(); }
  });

  it.each(["steer", "follow-up", "compaction"])("gates pending %s images and preserves a newer draft", async mode => {
    let release!: (value: { data: string; mimeType: string }) => void;
    const read = new Promise<{ data: string; mimeType: string }>(resolve => { release = resolve; });
    const { shell, terminal, engine, adapter } = await fixture([], [], true, undefined, { readText: async () => null, readImage: () => read });
    try {
      if (mode === "compaction") { engine.session.isCompacting = true; engine.session.emit({ type: "compaction_start", reason: "manual" }); }
      else engine.session.emit({ type: "agent_start" });
      await adapter.flushEvents();
      terminal.input("\u0016");
      const pending = mode === "follow-up" ? shell.queueFollowUp() : shell.submit(shell.root.editor.getText());
      shell.root.editor.setText("newer");
      expect(engine.session.promptOptions).toHaveLength(0);
      release({ data: screenshotPng(8, 8).toString("base64"), mimeType: "image/png" });
      await pending;
      if (mode === "compaction") {
        expect(engine.session.promptOptions).toHaveLength(0);
        expect(engine.session.queued).toEqual([expect.objectContaining({ mode: "steer", images: [expect.objectContaining({ type: "image", mimeType: "image/png" })] })]);
        engine.session.isCompacting = false;
        engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
        await adapter.flushEvents(); await nextImmediate();
        expect(engine.session.promptOptions.at(-1)).toMatchObject({ images: [expect.objectContaining({ type: "image", mimeType: "image/png" })] });
      }
      expect(engine.session.promptOptions).toHaveLength(1);
      expect(engine.session.promptOptions.at(-1)).toMatchObject({ streamingBehavior: mode === "follow-up" ? "followUp" : "steer" });
      expect(shell.root.editor.getText()).toBe("newer");
    } finally { await shell.dispose(); }
  });

  it("dequeues a waiting intent without canceling the image now referenced by the editor", async () => {
    let release!: (value: { data: string; mimeType: string }) => void;
    const read = new Promise<{ data: string; mimeType: string }>(resolve => { release = resolve; });
    const { shell, terminal, engine } = await fixture([], [], true, undefined, { readText: async () => null, readImage: () => read });
    try {
      terminal.input("\u0016");
      const draft = shell.root.editor.getText();
      const pending = shell.submit(draft);
      await engine.session.steer("queued steer"); await engine.session.followUp("queued follow");
      shell.restoreQueuedInput();
      expect(shell.root.editor.getText()).toBe(`${draft}\nqueued steer\nqueued follow`);
      release({ data: screenshotPng(8, 8).toString("base64"), mimeType: "image/png" });
      await pending;
      await vi.waitFor(() => expect(shell.root.preparePromptSubmission(draft).images).toHaveLength(1));
      expect(engine.session.promptOptions).toHaveLength(0);
      expect((await shell.submit(shell.root.editor.getText())).outcome).toBe("completed");
      expect(engine.session.promptOptions).toHaveLength(1);
    } finally { await shell.dispose(); }
  });

  it("keeps a failed waiting prompt recoverable and never sends its text alone", async () => {
    let release!: (value: { data: string; mimeType: string }) => void;
    const read = new Promise<{ data: string; mimeType: string }>(resolve => { release = resolve; });
    const { shell, terminal, engine } = await fixture([], [], true, undefined, { readText: async () => null, readImage: () => read });
    try {
      terminal.input("look "); terminal.input("\u0016");
      const draft = shell.root.editor.getText();
      terminal.input("\r");
      const waiting = shell.submit(draft);
      terminal.input("new input");
      release({ data: "AAAA".repeat(Math.ceil(20 * 1024 * 1024 / 3) + 1), mimeType: "image/png" });
      expect((await waiting).outcome).toBe("rejected");
      expect(engine.session.promptOptions).toHaveLength(0);
      expect(shell.root.editor.getText()).toBe("new input");
      expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("20 MiB");
      shell.root.editor.setText(""); terminal.input("\u001b[A");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe(draft);
    } finally { await shell.dispose(); }
  });

  it("keeps an invalid image editor submission recoverable instead of rejecting its callback", async () => {
    const { shell, terminal, engine } = await fixture([], [], true);
    try {
      const preparation = vi.spyOn(shell.root, "preparePromptSubmission").mockReturnValue({
        text: "inspect screenshot",
        images: [{ type: "image", data: "AAAA".repeat(2 * 1024 * 1024 + 1), mimeType: "image/png" }],
      });
      shell.root.editor.setText("inspect screenshot");
      terminal.input("\r");
      await nextImmediate();
      expect(shell.root.render(80).join("\n")).toContain("8 MiB");
      expect(shell.root.editor.getText()).toBe("inspect screenshot");
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([]);
      preparation.mockRestore();
      shell.root.editor.setText("corrected prompt");
      terminal.input("\r");
      await nextImmediate();
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual(["prompt:corrected prompt"]);
    } finally { await shell.dispose(); }
  });

  it("retains a real image chip and its bytes across rejection and explicit retry", async () => {
    const data = screenshotPng(16, 16, false).toString("base64");
    const { shell, adapter, terminal, engine } = await fixture([], [], true, undefined, {
      readText: async () => null, readImage: async () => ({ data, mimeType: "image/png" }),
    });
    try {
      terminal.input("\u0016");
      const draft = shell.root.editor.getText();
      expect(draft).toMatch(/^\[📷 screenshot-[a-f0-9]+\]$/u);
      // Concurrency: await real worker completion; this retry contract is not a one-second cold-start benchmark.
      await shell.root.waitForPromptPastes(draft, new AbortController().signal);
      expect(shell.root.hasPendingPastes(draft)).toBe(false);
      expect(shell.root.editor.getText()).toBe(draft);
      vi.spyOn(adapter, "execute").mockResolvedValueOnce({ outcome: "rejected", diagnostic: "synthetic rejection" });
      terminal.input("\r");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe(draft);
      expect(engine.session.promptOptions).toEqual([]);
      terminal.input("\r");
      await nextImmediate();
      expect(engine.session.promptOptions).toHaveLength(1);
      expect(engine.session.promptOptions[0]).toMatchObject({ images: [{ type: "image", data, mimeType: "image/png" }] });
    } finally { await shell.dispose(); }
  });

  it("leaves Pi fullscreen selection and copying available in the comparison profile", async () => {
    const { shell, terminal } = await fixture([{ role: "assistant", content: [{ type: "text", text: "comparison selection\nsecond line\nthird line" }], timestamp: 1 }]);
    try {
      shell.runtime.switchMode("fullscreen");
      shell.runtime.renderNow();
      const start = terminal.writes.length;
      terminal.input("\u001b[<0;1;2M");
      terminal.input("\u001b[<32;15;4M");
      shell.runtime.renderNow();
      terminal.input("\u001b[<0;15;4m");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(terminal.writes.slice(start).join("")).toContain("Copied!");
      expect(terminal.writes.slice(start).join("")).toContain("\u001b]52;c;");
    } finally { await shell.dispose(); }
  });

  it("preserves newer editor input when a pending submission is rejected", async () => {
    const { shell, adapter, terminal, engine } = await fixture([], [], true);
    try {
      let rejectSubmission!: (value: { outcome: "rejected"; diagnostic: string }) => void;
      const execute = vi.spyOn(adapter, "execute").mockImplementationOnce(() => new Promise(resolve => { rejectSubmission = resolve; }));
      shell.root.editor.setText("old draft");
      terminal.input("\r");
      terminal.input("new draft");
      await nextImmediate();
      rejectSubmission({ outcome: "rejected", diagnostic: "do not leak provider payload" });
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("new draft");
      expect(shell.root.render(80).join("\n")).not.toContain("do not leak provider payload");
      shell.root.editor.setText("");
      terminal.input("\u001b[A");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("old draft");
      expect(execute).toHaveBeenCalledOnce();
      expect(engine.session.calls.some(call => call.startsWith("prompt:"))).toBe(false);
    } finally { await shell.dispose(); }
  });

  it.each(["throw", "reject"])("contains an unexpected %s from dispatch without automatic retry", async failure => {
    const { shell, adapter, terminal } = await fixture([], [], true);
    try {
      const execute = vi.spyOn(adapter, "execute").mockImplementationOnce(() => {
        if (failure === "throw") throw new Error("PRIVATE_REQUEST");
        return Promise.reject(new Error("PRIVATE_REQUEST"));
      });
      shell.root.editor.setText("inspect");
      terminal.input("\r");
      await nextImmediate();
      expect(execute).toHaveBeenCalledOnce();
      expect(shell.root.render(80).join("\n")).toContain("uncertain");
      expect(shell.root.render(80).join("\n")).not.toContain("PRIVATE_REQUEST");
      terminal.input("usable");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("usable");
    } finally { await shell.dispose(); }
  });

  it("rejects unsafe source size with a removable failed chip and preserves surrounding input", async () => {
    const { shell, terminal } = await fixture([], [], true, undefined, {
      readText: async () => null,
      readImage: async () => ({ data: "AAAA".repeat(Math.ceil(20 * 1024 * 1024 / 3) + 1), mimeType: "image/png" }),
    });
    try {
      shell.root.editor.setText("keep draft");
      terminal.input("\u0016");
      await vi.waitFor(() => expect(shell.root.render(80).join("\n")).toContain("20 MiB"));
      expect(shell.root.editor.getText()).toMatch(/^keep draft\[📷 failed-/u);
      expect((await shell.submit(shell.root.editor.getText())).outcome).toBe("rejected");
      shell.root.editor.setText("keep draft");
      expect((await shell.submit("keep draft")).outcome).toBe("completed");
    } finally { await shell.dispose(); }
  });

  it("pastes URLs and clipboard images as atomic chips and expands them for copy and submission", async () => {
    let clipboardText = "https://example.com/a/very/useful/resource";
    let clipboardImage: { readonly data: string; readonly mimeType: string } | null = null;
    const { engine, adapter, terminal, shell, trace, dispose } = await observedPasteFixture({
      readText: async () => clipboardText,
      readImage: async () => clipboardImage,
      writeText: async text => { clipboardText = text; },
    });
    terminal.resize(60, 12);
    shell.root.render(60);

    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toContain("[🔗 https://example.com/"));
    const urlChip = shell.root.editor.getText();
    shell.root.editor.setText(`This prefix takes enough room ${urlChip}`);
    const wrappedChipRows = shell.root.editor.render(70).map(row => stripTerminalSequences(row));
    expect(wrappedChipRows.filter(row => row.includes("[🔗")).length).toBe(1);
    expect(wrappedChipRows.find(row => row.includes("[🔗"))).toContain(urlChip);
    shell.root.editor.setText(urlChip);
    const linkedChipRows = shell.root.editor.render(60);
    const linkedChip = linkedChipRows.join("\n");
    const linkedChipRow = linkedChipRows.find(row => stripTerminalSequences(row).includes("https://example.com")) ?? "";
    expect(linkedChip).toContain("\u001b]8;;https://example.com/a/very/useful/resource\u001b\\");
    expect(linkedChip).toContain("\u001b]8;;\u001b\\");
    expect(visibleWidth(linkedChipRow)).toBe(60);
    expect(stripTerminalSequences(linkedChipRow)).toMatch(/\] +$/u);

    terminal.input("\u001b[D"); // Invariant: Left focuses the adjacent chip as one item.
    await nextImmediate();
    const focusedChip = shell.root.render(60).find(row => stripTerminalSequences(row).includes("https://example.com")) ?? "";
    expect(focusedChip).toContain("\u001b[7m");
    expect(focusedChip).toContain("\u001b]8;;https://example.com/a/very/useful/resource\u001b\\");
    expect(focusedChip).not.toContain(CURSOR_MARKER);
    expect(stripTerminalSequences(focusedChip)).toContain(urlChip);
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe("https://example.com/a/very/useful/resource"));
    const writesBeforeChipDelete = terminal.writes.length;
    terminal.input("\u007f");
    await nextImmediate();
    shell.runtime.renderNow();
    const chipDeletionWrites = terminal.writes.slice(writesBeforeChipDelete);
    // Invariant: deleting the last chip overwrites its former link row in the current
    // transaction without clearing unrelated transcript rows.
    expect(chipDeletionWrites.some(write => write.includes("\u001b[2J"))).toBe(false);
    const cleanupWrites = chipDeletionWrites.filter(write => write.includes("\u001b[2K"));
    expect(cleanupWrites.length).toBeGreaterThan(0);
    expect(cleanupWrites.every(write => write.startsWith("\u001b[?2026h") && write.endsWith("\u001b[?2026l"))).toBe(true);
    expect(chipDeletionWrites.some(write => write.includes("\u001b[2K"))).toBe(true);
    expect(shell.root.editor.getText()).toBe("");
    terminal.input("\u001a");
    expect(shell.root.editor.getText()).toContain("[🔗 https://example.com/");

    terminal.input("\u001b[1;5C"); // Invariant: Ctrl+Right treats the chip as one item.
    await nextImmediate();
    expect(shell.root.render(60).join("\n")).toContain("\u001b[7m");
    terminal.input("\u001b[1;5C"); // Invariant: collapse at the chip's far edge.
    terminal.input("\u001b[1;5D"); // Invariant: Ctrl+Left selects the whole chip, never its interior.
    await nextImmediate();
    expect(shell.root.render(60).join("\n")).toContain("\u001b[7m");
    terminal.input("\u001b[1;5D"); // Invariant: collapse at its near edge before the mouse check.
    await nextImmediate();

    const chipFrame = shell.root.render(60).map(row => stripTerminalSequences(row));
    const chipRow = chipFrame.findIndex(row => row.includes("https://example.com")) + 1;
    const chipColumn = (chipFrame[chipRow - 1]?.indexOf("https://example.com") ?? -1) + 4;
    terminal.input(`\u001b[<0;${chipColumn};${chipRow}M`);
    terminal.input(`\u001b[<0;${chipColumn};${chipRow}m`);
    shell.runtime.renderNow();
    expect(shell.root.render(60).join("\n")).toContain("\u001b[7m");

    const redrawsBeforeDrag = shell.runtime.fullRedraws;
    terminal.input(`\u001b[<0;${chipColumn};${chipRow}M`);
    terminal.input(`\u001b[<32;${chipColumn + 1};${chipRow}M`);
    shell.runtime.renderNow();
    const heldChip = shell.root.render(60).join("\n");
    expect(shell.runtime.fullRedraws).toBe(redrawsBeforeDrag);
    expect(heldChip).toContain("\u001b[27m\u001b[48;2;38;79;120m");
    expect(heldChip).toContain("\u001b[4:4m");
    expect(heldChip).not.toContain("\u001b]8;;https://example.com/a/very/useful/resource\u001b\\");
    expect(stripTerminalSequences(heldChip)).toContain("https:\uFE0E//example.com");
    expect(visibleWidth(heldChip.split("\n").find(row => stripTerminalSequences(row).includes("https:\uFE0E//")) ?? "")).toBe(60);
    expect(shell.root.editor.getText()).toContain("https://example.com");

    const writesBeforeRelease = terminal.writes.length;
    terminal.input(`\u001b[<0;${chipColumn + 1};${chipRow}m`);
    shell.runtime.renderNow();
    const draggedChip = shell.root.render(60).join("\n");
    expect(terminal.writes.slice(writesBeforeRelease).some(write => write.includes("\u001b[2J"))).toBe(false);
    expect(terminal.writes.slice(writesBeforeRelease).some(write => write.includes("\u001b]8;;https://example.com/a/very/useful/resource\u001b\\"))).toBe(true);
    expect(draggedChip).toContain("\u001b[27m\u001b[48;2;38;79;120m");
    expect(draggedChip).toContain("\u001b]8;;https://example.com/a/very/useful/resource\u001b\\");
    terminal.input("\u007f");
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe("");

    const imageBytes = screenshotPng(16, 16, false);
    const canonicalImageData = imageBytes.toString("base64");
    clipboardImage = { data: canonicalImageData.replace(/=+$/u, ""), mimeType: "image/png" };
    trace.event("image-requested");
    shell.root.editor.setText("");
    terminal.input("\u0016");
    const imageTag = shell.root.editor.getText();
    expect(imageTag).toMatch(/^\[📷 screenshot-[a-f0-9]+\]$/u);
    await vi.waitFor(() => expect(shell.root.hasPendingPastes(imageTag)).toBe(false));
    expect(shell.root.editor.getText()).toBe(imageTag);
    terminal.input("\u001b[D");
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(imageTag));
    await shell.submit(imageTag);
    expect(engine.session.calls).toContain(`prompt:${imageTag}`);
    expect(engine.session.promptOptions.at(-1)).toMatchObject({
      images: [{ type: "image", data: canonicalImageData, mimeType: "image/png" }],
    });
    expect(Buffer.from(canonicalImageData, "base64")).toEqual(imageBytes);

    engine.session.emit({ type: "agent_start" });
    await adapter.flushEvents();
    await shell.submit(imageTag);
    expect(engine.session.promptOptions.at(-1)).toMatchObject({
      streamingBehavior: "steer",
      images: [{ type: "image", data: canonicalImageData, mimeType: "image/png" }],
    });

    shell.root.editor.setText(imageTag);
    await shell.queueFollowUp();
    expect(engine.session.promptOptions.at(-1)).toMatchObject({
      streamingBehavior: "followUp",
      images: [{ type: "image", data: canonicalImageData, mimeType: "image/png" }],
    });

    await dispose();
  });

  it("falls back to text or leaves the editor unchanged for malformed clipboard images", async () => {
    let clipboardText: string | null = "text fallback";
    const readText = vi.fn(async () => clipboardText);
    const readImage = vi.fn(async () => ({ data: "data:image/png;base64,invalid!", mimeType: "image/png" }));
    const { engine, terminal, shell, dispose } = await observedPasteFixture({ readText, readImage });

    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("text fallback"));
    expect(shell.root.editor.getText()).not.toContain("[📷");
    expect(engine.session.calls.some(call => call.startsWith("prompt:"))).toBe(false);

    shell.root.editor.setText("unchanged");
    clipboardText = null;
    terminal.input("\u0016");
    await vi.waitFor(() => expect(readText).toHaveBeenCalledTimes(2));
    expect(shell.root.editor.getText()).toBe("unchanged");

    await shell.submit("unchanged");
    expect(engine.session.promptOptions.at(-1)).toBeUndefined();
    expect(readImage).toHaveBeenCalledTimes(2);
    await dispose();
  });

  it("disposes pending shell paste after a failed assertion without replacing the failure", async () => {
    const { terminal, trace, dispose } = await observedPasteFixture({ readText: async () => "controlled text", readImage: async () => null });
    const failure = new Error("controlled fixture assertion");
    await expect((async () => {
      try { terminal.input("\u0016"); throw failure; }
      finally { await dispose(); }
    })()).rejects.toBe(failure);
    expect(trace.snapshot().entries.some(entry => entry.operation === "cleanup" && entry.pending === 0)).toBe(true);
    await dispose();
    expect(trace.snapshot().totals.dispose!.count).toBe(1);
  });

  it("extends an uninterrupted LMB drag through adjacent URL chips and their ellipses", async () => {
    const url = "https://example.com/a/very/useful/resource";
    let clipboardText = url;
    const { terminal, shell } = await fixture([], [], true, undefined, {
      readText: async () => clipboardText,
      readImage: async () => null,
      writeText: async text => { clipboardText = text; },
    });
    terminal.resize(120, 12);
    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toContain("[🔗"));
    const chip = shell.root.editor.getText();
    shell.root.editor.setText(`${chip}${chip}`);
    const frame = shell.root.render(120).map(row => stripTerminalSequences(row));
    const promptRow = frame.findIndex(row => row.includes("https://example.com"));
    const prompt = frame[promptRow] ?? "";
    const firstUrlColumn = prompt.indexOf("https://") + 1;
    const secondEllipsisColumn = prompt.lastIndexOf("…") + 1;
    const secondBracketColumn = prompt.lastIndexOf("]") + 1;
    expect(firstUrlColumn).toBeGreaterThan(0);
    expect(secondEllipsisColumn).toBeGreaterThan(firstUrlColumn);
    expect(secondBracketColumn).toBeGreaterThan(secondEllipsisColumn);

    const redrawsBeforeDrag = shell.runtime.fullRedraws;
    terminal.input(`\u001b[<0;${firstUrlColumn};${promptRow + 1}M`);
    terminal.input(`\u001b[<32;${secondEllipsisColumn};${promptRow + 1}M`);
    terminal.input(`\u001b[<32;${secondBracketColumn};${promptRow + 1}M`);
    shell.runtime.renderNow();
    expect(shell.runtime.fullRedraws).toBe(redrawsBeforeDrag);
    expect(shell.root.editor.hasSelection()).toBe(true);
    expect(shell.root.render(120).join("\n")).toContain("\u001b[27m\u001b[48;2;38;79;120m");

    terminal.input(`\u001b[<0;${secondBracketColumn};${promptRow + 1}m`);
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(`${url}${url}`));
    await shell.dispose();
  });

  it("keeps atomic focus within the exact brackets after preceding image icons", async () => {
    const { terminal, shell } = await fixture([], [], true);
    terminal.resize(180, 12);
    const chips = Array.from({ length: 6 }, (_, index) => `[🖼  Clipboard (${index + 1}).png]`);
    shell.root.editor.setText(chips.join(""));
    terminal.input("\u001b[D");
    await nextImmediate();

    const row = shell.root.editor.render(180).find(line => stripTerminalSequences(line).includes("Clipboard (6).png")) ?? "";
    const reversed = [...row.matchAll(/\u001b\[7m([^\u001b]*)\u001b\[0m/gu)].map(match => match[1] ?? "");
    expect(reversed).toContain(chips.at(-1));
    expect(reversed.some(text => text.includes("Clipboard (5).png"))).toBe(false);

    await shell.dispose();
  });

  it("keeps a focused atomic chip selected while repeated pastes insert before it", async () => {
    let clipboardText = "https://example.com/focused-chip";
    const { terminal, shell, dispose, waitForPasteSettlement } = await observedPasteFixture({
      readText: async () => clipboardText,
      readImage: async () => null,
      writeText: async text => { clipboardText = text; },
    });
    terminal.resize(60, 12);
    shell.root.render(60);

    const urlSettled = waitForPasteSettlement();
    terminal.input("\u0016");
    await urlSettled;
    expect(shell.root.editor.getText()).toContain("[🔗 https://example.com/focused-chip]");
    const chip = shell.root.editor.getText();
    terminal.input("\u001b[D");

    clipboardText = "first";
    const firstSettled = waitForPasteSettlement();
    terminal.input("\u0016");
    await firstSettled;
    expect(shell.root.editor.getText()).toBe(`first${chip}`);
    expect(shell.root.render(60).join("\n")).toContain("\u001b[7m");

    clipboardText = "second";
    const secondSettled = waitForPasteSettlement();
    terminal.input("\u0016");
    await secondSettled;
    expect(shell.root.editor.getText()).toBe(`firstsecond${chip}`);
    terminal.input("\u007f");
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe("firstsecond");

    await dispose();
  });

  it("moves exactly one item left and exits a focused chip right in one press", async () => {
    const firstUrl = "https://example.com/first-chip";
    const secondUrl = "https://example.com/second-chip";
    let clipboardText = firstUrl;
    const { terminal, shell } = await fixture([], [], true, undefined, {
      readText: async () => clipboardText,
      readImage: async () => null,
      writeText: async text => { clipboardText = text; },
    });
    terminal.resize(80, 12);
    shell.root.render(80);

    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toContain("first-chip"));
    clipboardText = secondUrl;
    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toContain("second-chip"));
    const adjacent = shell.root.editor.getText();
    const spaced = adjacent.replace("][", "] [");

    terminal.input("\u001b[D"); // Invariant: focus the second chip.
    terminal.input(" "); // Invariant: insert before atomic focus; neither chip is replaced.
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe(spaced);
    clipboardText = "";
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(secondUrl));
    terminal.input("\u001b[C");

    shell.root.editor.setText(adjacent);
    terminal.input("\u001b[H"); // Invariant: focus the first chip through the native cursor.
    terminal.input(" ");
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe(` ${adjacent}`);
    terminal.input("\u001b[C");
    terminal.input("\u001b[C");
    await nextImmediate();
    shell.root.editor.setText(adjacent);

    terminal.input("\u001b[D"); // Invariant: focus the second chip.
    terminal.input("\u001b[D"); // Invariant: the adjacent first chip is one atomic item left.
    clipboardText = "";
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(firstUrl));
    expect(shell.root.editor.hasSelection()).toBe(false);

    shell.root.editor.setText(adjacent);
    terminal.input("\u001b[H"); // Invariant: native editor cursor starts at the first atomic segment.
    await nextImmediate();
    expect(shell.root.editor.hasSelection()).toBe(true);
    terminal.input("\u001b[C"); // Invariant: move to the second chip rather than reselecting the first.
    clipboardText = "";
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(secondUrl));
    expect(shell.root.editor.hasSelection()).toBe(false);

    shell.root.editor.setText(spaced);
    terminal.input("\u001b[D"); // Invariant: focus the second chip.
    terminal.input("\u001b[D"); // Invariant: move one character left onto the separator.
    terminal.input("X");
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe(spaced.replace("] [", "]X ["));

    shell.root.editor.setText(spaced);
    terminal.input("\u001b[D"); // Invariant: focus the second chip.
    terminal.input("\u001b[D"); // Protocol: separator.
    terminal.input("\u001b[D"); // Protocol: first chip.
    terminal.input("\u001b[C"); // Protocol: separator.
    terminal.input("\u001b[C"); // Protocol: second chip.
    clipboardText = "";
    terminal.input("\u0003");
    await vi.waitFor(() => expect(clipboardText).toBe(secondUrl));

    const imageRun = "[📷 first.png][📷 second.png][📷 third.png]";
    shell.root.editor.setText(`words ${imageRun}`);
    terminal.input("\u001b[1;5D"); // Invariant: Ctrl+Left crosses the adjacent run and stops on its separator.
    terminal.input("X");
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe(`wordsX ${imageRun}`);

    shell.root.editor.setText(`words tail${imageRun}`);
    terminal.input("\u001b[1;5D"); // Invariant: an attached chip run also crosses its word to the separator.
    terminal.input("X");
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe(`wordsX tail${imageRun}`);

    shell.root.editor.setText("doio ddh did d diud");
    terminal.input("\u001b[1;5D"); // Invariant: Ctrl+Left stops on the separator before an ordinary word.
    terminal.input("X");
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe("doio ddh did dX diud");

    await shell.dispose();
  });
});
