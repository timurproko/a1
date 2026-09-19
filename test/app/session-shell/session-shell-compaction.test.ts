import HeadlessXterm from "@xterm/headless";
import { formatSubmittedPromptTime } from "../../../src/ui/components/index.js";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { getOsc8LinkAtColumn as getPinnedPiTuiLinkAtColumn } from "@earendil-works/pi-tui";
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
import { piTheme } from "../../../src/integrations/pi/components/index.js";
import { withPinnedHyperlinks, fixture, nextImmediate } from "./session-shell-fixture.js";

describe("prompt-style compaction in the real engine and shell", () => {
  const time = new Date(2026, 8, 13, 14, 35).getTime();
  const compaction = (tokensBefore = 281483, summary = Array.from({ length: 24 }, (_, i) => `summary-${i} alpha beta`).join("\n\n")) => ({
    role: "compactionSummary", summary, tokensBefore, timestamp: time,
  });
  const user = (text: string) => ({ role: "user", content: [{ type: "text", text }], timestamp: time });
  const reply = (name: string) => ({ role: "assistant", content: [{ type: "text", text: Array.from({ length: 30 }, (_, i) => `${name}-${i}`).join("\n\n") }], timestamp: time + 1 });

  it("loads the disposable visual-review session through Pi's real session manager", async () => {
    const directory = await mkdtemp(join(tmpdir(), "compaction-review-"));
    try {
      const script = fileURLToPath(new URL("../../../scripts/pi/create-compaction-review-session.mjs", import.meta.url));
      const path = execFileSync(process.execPath, [script, directory], { encoding: "utf8" }).trim();
      const manager = SessionManager.open(path);
      const { adapter, shell } = await fixture(manager.buildSessionContext().messages, [], true);
      try {
        const source = adapter.view().transcript.find(block => block.kind === "compaction")!;
        expect(source.payload).toMatchObject({ role: "compactionSummary", tokensBefore: 281483 });
        expect(adapter.view().transcript.slice(0, 3).map(block => block.kind)).toEqual(["compaction", "assistant", "user"]);
        const rows = shell.root.transcriptComponent(source.id)!.render(80).map(stripTerminalSequences);
        expect(rows[0]).toContain("Compacted from 281,483 tokens");
        expect(rows.join("\n")).toContain("Synthetic retained detail 24.");
        expect(rows.join("\n")).not.toContain("END OF FULL COMPACTION SUMMARY");
        expect(adapter.view().transcript.filter(block => block.kind === "user")).toHaveLength(2);
      } finally { await shell.dispose(); }
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("keeps resumed and newly completed summary data through settlement without adding prompt recall entries", async () => {
    const messages: unknown[] = [compaction(), user("real prompt"), reply("answer")];
    const { engine, adapter, terminal, shell } = await fixture(messages, [], true);
    try {
      const original = adapter.view().transcript.find(block => block.kind === "compaction")!;
      expect(original).toMatchObject({ text: compaction().summary, payload: { role: "compactionSummary", tokensBefore: 281483, timestamp: time } });
      const source = shell.root.transcriptComponent(original.id)!;
      expect(stripTerminalSequences(source.render(80).join("\n"))).toContain("summary-23 alpha beta");
      const next = { ...compaction(300001, "Fresh **summary** content."), timestamp: time + 2 };
      messages.push(next);
      engine.session.emit({ type: "message_end", message: next });
      await adapter.flushEvents();
      const latest = adapter.view().transcript.filter(block => block.kind === "compaction").at(-1)!;
      expect(latest.id).not.toBe(original.id);
      expect(latest).toMatchObject({ text: next.summary, payload: { tokensBefore: 300001, timestamp: next.timestamp } });
      expect(stripTerminalSequences(shell.root.transcriptComponent(latest.id)!.render(80).join("\n"))).toContain("Compacted from 300,001 tokens");
      engine.session.emit({ type: "agent_settled", messages });
      await adapter.flushEvents();
      expect(adapter.view().transcript.filter(block => block.kind === "compaction").map(block => block.text)).toEqual([compaction().summary, next.summary]);
      shell.root.editor.setText("draft");
      for (let i = 0; i < 5; i++) { terminal.input("\u001b[A"); await nextImmediate(); }
      expect(shell.root.editor.getText()).toBe("real prompt");
      expect(engine.session.calls.some(call => call.startsWith("prompt:"))).toBe(false);
    } finally { await shell.dispose(); }
  });

  it.each(["always", "hidden", "auto"] as const)("pins and navigates one mixed sequence with a %s scrollbar", async scrollbarAppearance => {
    const { terminal, shell } = await fixture([compaction(), user("middle prompt"), reply("middle"), compaction(300001), user("last prompt"), reply("last")], [], true);
    try {
      terminal.resize(80, 14);
      shell.root.editor.setText("keep draft");
      shell.root.setViewportConfig({ scrollbarAppearance, scrollbarStyle: "thin", scrollbarSpeed: "normal" });
      const rows = () => shell.root.render(80).map(stripTerminalSequences);
      const key = async (data: string) => { terminal.input(data); await nextImmediate(); return rows(); };
      const bottom = rows();
      let frame = await key("\u001b[1;5H");
      expect(frame[0]!.trim()).toBe("");
      expect(frame[1]).toContain("❯ Compacted from 281,483 tokens");
      const header = frame[1]!;
      const firstExtent = shell.root.viewportPresentationEvidence().maxScroll;
      frame = await key("\u001b[<65;3;3M");
      expect(frame[0]).toContain("❯ Compacted from 281,483 tokens");
      expect(frame[0]).toContain("14:35");
      expect(shell.root.render(80)[0]).not.toContain("\u001b[2m");
      expect(frame.filter(row => row.includes("Compacted from 281,483 tokens"))).toHaveLength(1);
      expect(shell.root.viewportPresentationEvidence().maxScroll).toBe(firstExtent);
      const whilePinned = shell.root.exitTranscript(80);
      await key("\u000f");
      expect(shell.root.exitTranscript(80)).toBe(whilePinned);
      terminal.input("\u001b[<0;5;1M");
      terminal.input("\u001b[<0;5;1m");
      frame = rows();
      // Invariant: the reserved scrollbar cell is naturally blank on viewport row zero.
      expect(frame[0]!.slice(0, -1)).toBe(header.slice(0, -1));
      expect(frame[2]).toContain("summary-0 alpha beta");
      expect(shell.root.viewportPresentationEvidence().followingEnd).toBe(false);
      expect((await key("\u001b[1;2B"))[0]).toContain("❯ middle prompt");
      expect((await key("\u001b[1;2B"))[0]).toContain("❯ Compacted from 300,001 tokens");
      expect((await key("\u001b[1;2B"))[0]).toContain("❯ last prompt");
      expect((await key("\u001b[1;2B")).map(row => row.slice(0, 79))).toEqual(bottom.map(row => row.slice(0, 79)));
      expect(shell.root.viewportPresentationEvidence().followingEnd).toBe(true);
      expect((await key("\u001b[1;2A"))[0]).toContain("❯ last prompt");
      expect((await key("\u001b[1;2A"))[0]).toContain("❯ Compacted from 300,001 tokens");
      expect((await key("\u001b[1;2A"))[0]).toContain("❯ middle prompt");
      frame = await key("\u001b[1;2A");
      expect(frame[0]!.trim()).toBe("");
      expect(frame[1]).toBe(header);
      expect(await key("\u001b[1;2A")).toEqual(frame);
      await key("\u001b[1;5F");
      expect((await key("\u001b[1;3H"))[0]).toContain("❯ last prompt");
      expect((await key("\u001b[1;3H"))[0]).toContain("❯ Compacted from 300,001 tokens");
      expect((await key("\u001b[1;3H"))[0]).toContain("❯ middle prompt");
      expect((await key("\u001b[1;3H"))[1]).toBe(header);
      expect(shell.root.editor.getText()).toBe("keep draft");
    } finally { await shell.dispose(); }
  });

  it.each(["hidden", "always", "auto"] as const)("keeps timestamps metadata-grey across source, quiet, and hover states with a %s scrollbar", async appearance => {
    const expectedScreen = new HeadlessXterm.Terminal({ cols: 1, rows: 1, allowProposedApi: true });
    let expectedGreyStyle: readonly number[];
    try {
      await new Promise<void>(resolve => expectedScreen.write(`${piTheme().fg("dim", "x")}\u001b[0m`, resolve));
      const cell = expectedScreen.buffer.active.getLine(0)!.getCell(0)!;
      expectedGreyStyle = [cell.getFgColorMode(), cell.getFgColor(), cell.isDim(), cell.isBold()];
    } finally { expectedScreen.dispose(); }
    const snapshots = [];
    for (const kind of ["compaction", "user"] as const) {
      const summary = compaction();
      const message = kind === "compaction" ? summary : user(`Compacted from 281,483 tokens\n\n${summary.summary}`);
      const { terminal, shell } = await fixture([message, reply("tail")], [], true);
      try {
        terminal.resize(80, 14);
        shell.root.setViewportConfig({ scrollbarAppearance: appearance, scrollbarStyle: "thin", scrollbarSpeed: "normal" });
        shell.root.render(80);
        const frames = [];
        for (const data of ["\u001b[1;5H", "\u001b[<65;3;3M", "\u001b[1;5F", "\u001b[<35;3;1M", "\u001b[<35;3;3M", "\u001b[1;5H", "\u001b[<65;3;3M", "\u001b[<35;3;1M", "\u001b[<35;3;3M"]) {
          terminal.input(data);
          await nextImmediate();
          frames.push(shell.root.render(80).slice(0, 8));
        }
        const rendered = [];
        for (const rows of frames) {
          const screen = new HeadlessXterm.Terminal({ cols: 80, rows: rows.length + 1, allowProposedApi: true });
          try {
            await new Promise<void>(resolve => screen.write(rows.map(row => `${row}\u001b[0m`).join("\r\n"), resolve));
            rendered.push(rows.map((_, row) => Array.from({ length: 80 }, (_, column) => {
              const cell = screen.buffer.active.getLine(row)!.getCell(column)!;
              return {
                text: cell.getChars(), background: [cell.getBgColorMode(), cell.getBgColor()],
                // Provenance: foreground attributes on blank padding cannot affect visible glyphs.
                foreground: cell.getChars().trim() ? [cell.getFgColorMode(), cell.getFgColor(), cell.isDim(), cell.isBold()] : null,
              };
            })));
          } finally { screen.dispose(); }
        }
        const labelColumn = stripTerminalSequences(frames[1]![0]!).indexOf("Compacted");
        const timeColumn = stripTerminalSequences(frames[1]![0]!).indexOf("14:35");
        expect(labelColumn).toBeGreaterThanOrEqual(0);
        expect(timeColumn).toBeGreaterThan(labelColumn);
        const sourceTimeColumn = stripTerminalSequences(frames[0]![1]!).indexOf("14:35");
        expect(sourceTimeColumn).toBeGreaterThanOrEqual(0);
        const sourceTimeStyle = rendered[0]![1]![sourceTimeColumn]!.foreground!;
        expect(sourceTimeStyle[2]).toBe(0);
        expect(sourceTimeStyle[3]).toBe(0);
        // Invariant: timestamp foreground and intensity stay on metadata grey in every state.
        expect(sourceTimeStyle).toEqual(expectedGreyStyle);
        expect(sourceTimeStyle.slice(0, 2)).not.toEqual(rendered[7]![0]![labelColumn]!.foreground!.slice(0, 2));
        expect(rendered[5]![1]![sourceTimeColumn]!.foreground).toEqual(sourceTimeStyle);
        for (const state of [1, 2, 3, 4, 6, 7, 8]) {
          for (let column = timeColumn; column < timeColumn + 5; column++) {
            expect(rendered[state]![0]![column]!.foreground).toEqual(sourceTimeStyle);
            expect(rendered[state]![0]![column]!.background).toEqual(rendered[state]![0]![labelColumn]!.background);
          }
        }
        // Compatibility: prompt bodies still enter and leave quiet/hover presentation independently.
        expect(rendered[3]![0]![labelColumn]!.foreground![2]).toBe(0);
        expect(rendered[4]![0]![labelColumn]!.foreground![2]).not.toBe(0);
        expect(rendered[6]).toEqual(rendered[1]);
        expect(rendered[1]![0]![labelColumn]!.foreground![2]).toBe(0);
        expect(rendered[2]![0]![labelColumn]!.foreground![2]).not.toBe(0);
        expect(rendered[8]).toEqual(rendered[1]);
        expect(rendered[7]![0]![labelColumn]!.foreground).toEqual(rendered[1]![0]![labelColumn]!.foreground);
        snapshots.push(rendered);
      } finally { await shell.dispose(); }
    }
    expect(snapshots[0]).toEqual(snapshots[1]);
  });

  it("keeps selected source timestamp foreground and intensity while painting the selection background", async () => {
    const { terminal, shell } = await fixture([user("Select the timestamp")], [], true);
    try {
      terminal.resize(80, 24);
      const beforeFrame = shell.root.render(80);
      const formatted = formatSubmittedPromptTime(time)!;
      const rowIndex = beforeFrame.findIndex(row => stripTerminalSequences(row).includes(formatted));
      expect(rowIndex).toBeGreaterThanOrEqual(0);
      const timeColumn = stripTerminalSequences(beforeFrame[rowIndex]!).indexOf(formatted);
      expect(timeColumn).toBeGreaterThanOrEqual(0);
      const terminalRow = rowIndex + 1;
      terminal.input(`\u001b[<0;${timeColumn + 1};${terminalRow}M`);
      terminal.input(`\u001b[<32;${timeColumn + 5};${terminalRow}M`);
      terminal.input(`\u001b[<0;${timeColumn + 5};${terminalRow}m`);
      await nextImmediate();
      const selectedRow = shell.root.render(80)[rowIndex]!;
      const screen = new HeadlessXterm.Terminal({ cols: 80, rows: 3, allowProposedApi: true });
      try {
        await new Promise<void>(resolve => screen.write(
          `${beforeFrame[rowIndex]}\u001b[0m\r\n${selectedRow}\u001b[0m\r\nsentinel`,
          resolve,
        ));
        const before = screen.buffer.active.getLine(0)!;
        const selected = screen.buffer.active.getLine(1)!;
        for (let column = timeColumn; column < timeColumn + 5; column++) {
          const beforeCell = before.getCell(column)!;
          const selectedCell = selected.getCell(column)!;
          expect([
            selectedCell.getFgColorMode(), selectedCell.getFgColor(), selectedCell.isDim(), selectedCell.isBold(),
          ]).toEqual([
            beforeCell.getFgColorMode(), beforeCell.getFgColor(), beforeCell.isDim(), beforeCell.isBold(),
          ]);
          expect(selectedCell.getBgColor()).toBe(0x264f78);
        }
        const sentinel = screen.buffer.active.getLine(2)!.getCell(0)!;
        expect(sentinel.getFgColor()).toBe(-1);
        expect(sentinel.isDim()).toBe(0);
        expect(sentinel.isBold()).toBe(0);
      } finally { screen.dispose(); }
    } finally { await shell.dispose(); }
  });

  it.each([undefined, null, Number.NaN, 8.64e15 + 1, time])("dims quiet bodies but keeps a fitting timestamp at normal intensity through resize and unavailable metadata (%s)", async timestamp => {
    for (const kind of ["user", "compaction"] as const) {
      const message = { ...(kind === "user" ? user("14:35 clock-like content") : compaction(281483, "Short summary.")), timestamp };
      const { adapter, terminal, shell } = await fixture([message, reply("tail")], [], true);
      try {
        // Compatibility: the engine normalizes unavailable compaction timestamps to epoch zero.
        const sourceTimestamp = (adapter.view().transcript[0]!.payload as { timestamp?: unknown }).timestamp;
        const formatted = typeof sourceTimestamp === "number" ? formatSubmittedPromptTime(sourceTimestamp) : null;
        shell.root.setViewportConfig({ scrollbarAppearance: "hidden", scrollbarStyle: "thin", scrollbarSpeed: "normal" });
        for (const width of [80, 18, 17, 48]) {
          terminal.resize(width, 24);
          const frame = shell.root.render(width);
          const screen = new HeadlessXterm.Terminal({ cols: width, rows: 25, allowProposedApi: true });
          try {
            await new Promise<void>(resolve => screen.write(frame.map(row => `${row}\u001b[0m`).join("\r\n"), resolve));
            const hasTimestamp = formatted !== null && width >= 18;
            const line = screen.buffer.active.getLine(0)!;
            if (hasTimestamp) expect(line.translateToString().slice(-5)).toBe(formatted);
            for (let column = 0; column < width; column++) {
              const cell = line.getCell(column)!;
              if (!cell.getChars().trim()) continue;
              const isTimestamp = hasTimestamp && column >= width - 5;
              expect(cell.isDim() !== 0, `${kind} width=${width} column=${column}`).toBe(!isTimestamp);
              if (isTimestamp) expect(cell.isBold()).toBe(0);
              expect(cell.getBgColor()).toBe(line.getCell(0)!.getBgColor());
            }
            if (kind === "user") expect(line.translateToString()).toContain("14:35");
          } finally { screen.dispose(); }
        }
      } finally { await shell.dispose(); }
    }
  });

  it.each([undefined, null, Number.NaN, 8.64e15 + 1, time])("preserves prominent source glyph styling across reflow and rail changes (%s)", async timestamp => {
    for (const kind of ["user", "compaction"] as const) {
      const message = {
        ...(kind === "user" ? user(`14:35 clock-like content\n\n${compaction().summary}`) : compaction()), timestamp,
      };
      const { terminal, shell } = await fixture([message, reply("tail")], [], true);
      try {
        for (const [width, appearance] of [[80, "hidden"], [18, "hidden"], [17, "always"], [48, "auto"], [80, "always"]] as const) {
          terminal.resize(width, 14);
          shell.root.setViewportConfig({ scrollbarAppearance: appearance, scrollbarStyle: "thin", scrollbarSpeed: "normal" });
          shell.root.render(width);
          terminal.input("\u001b[1;5H");
          await nextImmediate();
          const source = shell.root.render(width)[1]!;
          terminal.input("\u001b[<65;3;3M");
          await nextImmediate();
          const pinned = shell.root.render(width)[0]!;
          const screen = new HeadlessXterm.Terminal({ cols: width, rows: 3, allowProposedApi: true });
          try {
            await new Promise<void>(resolve => screen.write(`${source}\u001b[0m\r\n${pinned}\u001b[0m\r\nsentinel`, resolve));
            // Compatibility: row zero intentionally has no rail; compare only source content cells.
            const contentWidth = width - (appearance === "hidden" ? 0 : 1);
            for (let column = 0; column < contentWidth; column++) {
              const before = screen.buffer.active.getLine(0)!.getCell(column)!;
              const after = screen.buffer.active.getLine(1)!.getCell(column)!;
              expect(after.getChars()).toBe(before.getChars());
              if (!before.getChars().trim()) continue;
              expect([after.getFgColorMode(), after.getFgColor(), after.isDim(), after.isBold()])
                .toEqual([before.getFgColorMode(), before.getFgColor(), before.isDim(), before.isBold()]);
            }
            const sentinel = screen.buffer.active.getLine(2)!.getCell(0)!;
            expect(sentinel.isDim()).toBe(0);
            expect(sentinel.isBold()).toBe(0);
            expect(sentinel.getFgColor()).toBe(-1);
          } finally { screen.dispose(); }
        }
      } finally { await shell.dispose(); }
    }
  });

  it("replaces quiet timestamp metadata while dimming only the prompt body without leaking intensity", async () => {
    const later = { ...user("14:35 is content, not metadata"), timestamp: time + 60_000 };
    const { terminal, shell } = await fixture([compaction(281483, "Short summary."), reply("first"), later, reply("tail")], [], true);
    try {
      terminal.resize(80, 14);
      shell.root.setViewportConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "normal" });
      shell.root.render(80);
      terminal.input("\u001b[1;5H");
      await nextImmediate();
      terminal.input("\u001b[<65;3;3M");
      await nextImmediate();
      shell.root.render(80);
      for (const [data, expected] of [["\u001b[<65;3;3M", "14:35"], ["\u001b[1;5F", "14:36"]]) {
        terminal.input(data!);
        await nextImmediate();
        const frame = shell.root.render(80);
        const screen = new HeadlessXterm.Terminal({ cols: 80, rows: 3, allowProposedApi: true });
        try {
          await new Promise<void>(resolve => screen.write(`${frame[0]}\r\nsentinel`, resolve));
          const row = screen.buffer.active.getLine(0)!;
          expect(row.translateToString().slice(74, 79)).toBe(expected);
          for (let column = 74; column < 79; column++) expect(row.getCell(column)!.isDim()).toBe(0);
          expect(row.getCell(2)!.isDim()).not.toBe(0);
          expect(row.getCell(73)!.isDim()).not.toBe(0);
          expect(screen.buffer.active.getLine(1)!.getCell(0)!.isDim()).toBe(0);
          expect(screen.buffer.active.getLine(1)!.getCell(0)!.isBold()).toBe(0);
        } finally { screen.dispose(); }
      }
    } finally { await shell.dispose(); }
  });

  it("uses quiet compaction context after the full summary and preserves selector input ownership", async () => {
    const { terminal, shell } = await fixture([compaction(281483, "Short summary."), reply("long reply")], [], true);
    try {
      terminal.resize(80, 14);
      const frame = shell.root.render(80);
      expect(stripTerminalSequences(frame[0]!)).toContain("Compacted from 281,483 tokens");
      expect(frame[0]).toContain("\u001b[2m");
      await shell.submit("/models");
      shell.runtime.renderNow();
      const top = shell.root.viewportPresentationEvidence().scrollTop;
      terminal.input("\u001b[1;2A");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
    } finally { await shell.dispose(); }
  });

  it("retains cached long summary rows, links and selection while later output streams and the viewport resizes", async () => {
    await withPinnedHyperlinks(async () => {
      const text = "copyable alpha beta\n\n[web](https://example.com/summary) [file](file:///D:/work/summary.md)\n\n" + compaction().summary.repeat(25);
      const { engine, adapter, terminal, shell } = await fixture([compaction(281483, text), reply("tail")], [], true);
      try {
        terminal.resize(80, 16);
        shell.root.editor.setText("unsubmitted draft");
        shell.root.render(80);
        terminal.input("\u001b[1;5H");
        const rows = shell.root.render(80);
        const source = adapter.view().transcript.find(block => block.kind === "compaction")!;
        const renderer = shell.root.transcriptComponent(source.id)!;
        const spy = vi.spyOn(renderer, "render");
        const linkRow = rows.find(row => stripTerminalSequences(row).includes("web"))!;
        const linkText = stripTerminalSequences(linkRow);
        expect(getPinnedPiTuiLinkAtColumn(linkRow, linkText.indexOf("web"))).toBe("https://example.com/summary");
        expect(getPinnedPiTuiLinkAtColumn(linkRow, linkText.indexOf("file"))).toBe("file:///D:/work/summary.md");
        expect(linkRow).toContain(piTheme().fg("mdLink", "web"));
        expect(linkRow).toContain(piTheme().fg("accent", "file"));
        const row = rows.findIndex(line => stripTerminalSequences(line).includes("copyable alpha beta")) + 1;
        terminal.input(`\u001b[<0;3;${row}M`);
        terminal.input(`\u001b[<32;21;${row}M`);
        terminal.input(`\u001b[<0;21;${row}m`);
        expect(shell.root.hasActiveSelection()).toBe(true);
        for (let i = 0; i < 8; i++) {
          const message = { role: "assistant", timestamp: time + 5, content: [{ type: "text", text: `stream ${i}` }] };
          engine.session.emit({ type: "message_update", message, assistantMessageEvent: { type: "text_delta", delta: String(i) } });
          await adapter.flushEvents();
          shell.runtime.renderNow();
        }
        expect(spy).not.toHaveBeenCalled();
        expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(0);
        expect(shell.root.hasActiveSelection()).toBe(true);
        for (const width of [40, 100, 80]) {
          terminal.resize(width, 16);
          const resized = shell.root.render(width);
          expect(resized.every(line => visibleWidth(line) <= width)).toBe(true);
          expect(shell.root.viewportPresentationEvidence().followingEnd).toBe(false);
          expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(0);
        }
        expect(shell.root.hasActiveSelection()).toBe(true);
        terminal.input("\u0003");
        await nextImmediate();
        expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("copyable alpha beta").toString("base64")}\u0007`);
        expect(stripTerminalSequences(renderer.render(80).join("\n"))).toContain("summary-23 alpha beta");
        expect(shell.root.editor.getText()).toBe("unsubmitted draft");
        expect(adapter.view().transcript.find(block => block.id === source.id)?.text).toBe(text);
      } finally { await shell.dispose(); }
    });
  });

  it("keeps branch summaries, compaction working status and the comparison route unchanged", async () => {
    const branch = { role: "branchSummary", summary: "Branch body.", fromId: "branch-1", timestamp: time };
    for (const custom of [false, true]) {
      const { engine, adapter, terminal, shell } = await fixture([compaction(), branch, reply("tail")], [], custom);
      try {
        terminal.resize(80, 16);
        const before = shell.root.exitTranscript(80);
        if (!custom) {
          expect(before).toContain("ctrl+o");
          expect(before).not.toContain("summary-23 alpha beta");
        }
        const branchBlock = adapter.view().transcript.find(block => (block.payload as { role?: string }).role === "branchSummary")!;
        expect(stripTerminalSequences(shell.root.transcriptComponent(branchBlock.id)!.render(80).join("\n"))).toContain("ctrl+o");
        engine.session.emit({ type: "compaction_start", reason: "manual" });
        await adapter.flushEvents();
        expect(stripTerminalSequences(shell.root.render(80).join("\n"))).toContain("Compacting");
        engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
        await adapter.flushEvents();
        expect(shell.root.exitTranscript(80)).toBe(before);
        expect(adapter.view().transcript.filter(block => block.kind === "compaction")).toHaveLength(2);
      } finally { await shell.dispose(); }
    }
  });
});
