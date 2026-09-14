import { afterEach, describe, expect, it, vi } from "vitest";
import { Text } from "#pi-tui";
import { stripAnsi } from "../../../../src/ui/components/text.js";
import { readVisibleHyperlinks } from "../../../../src/ui/components/visible-hyperlinks.js";
import { transcriptLifecycleFixture, TranscriptFixtureSession } from "../../../support/rendering/transcript-lifecycle-fixture.js";

import { replayTerminalCheckpoints, replayTerminalPaint } from "../../../support/rendering/terminal-paint-evidence.js";

const active: Awaited<ReturnType<typeof transcriptLifecycleFixture>>[] = [];
afterEach(async () => { for (const value of active.splice(0)) await value.dispose(); });
const plain = (rows: readonly string[]) => rows.map(stripAnsi).join("\n");
async function fixture(width = 80, height = 30) {
  let text = "BEFORE_ASYNC";
  let invalidate = () => {};
  let notifyDuringRender = false;
  const value = await transcriptLifecycleFixture({ width, height,
    messages: [{ role: "assistant", timestamp: 1, stopReason: "stop", content: [{ type: "text", text: Array.from({ length: 100 }, (_, n) => `HISTORY_${n}`).join("\n\n") }] }],
    definitions: new Map([["async", { name: "async", renderCall: () => new Text("CALL", 0, 0),
      renderResult: (_r: unknown, _o: unknown, _t: unknown, context: { invalidate(): void }) => {
        invalidate = context.invalidate;
        if (notifyDuringRender) context.invalidate();
        return new Text(text, 0, 0);
      },
    }]]),
  });
  active.push(value);
  await value.emit({ type: "tool_execution_end", toolCallId: "async", toolName: "async", isError: false, result: { content: [] } },
    { type: "message_end", message: { role: "assistant", timestamp: 30, stopReason: "stop", content: [{ type: "text", text: "COPY_CURRENT [label](https://example.invalid/current)" }] } });
  value.shell.runtime.renderNow();
  const frames: readonly string[][] = [];
  const captured = frames as string[][];
  const render = value.shell.root.render.bind(value.shell.root);
  vi.spyOn(value.shell.root, "render").mockImplementation(columns => {
    const rows = render(columns); captured.push([...rows]); return rows;
  });
  return { ...value, frames,
    change(next: string) { text = next; invalidate(); },
    callback: () => invalidate,
    notifyInRenderer() { notifyDuringRender = true; invalidate(); },
  };
}

describe("asynchronous transcript presentation lifetime", () => {
  it.each([[40, 16], [192, 54]])("reflows geometry with dock input pending at %s x %s and never restores old rows", async (width, height) => {
    const value = await fixture(width, height);
    const before = value.shell.root.viewportFrameDescriptor()!;
    const evidence = value.shell.root.viewportPresentationEvidence();
    const revision = value.backend.view().transcript.find(block => block.id === "tool-async")!.revision;
    value.terminal.input("x");
    value.change("AFTER_ASYNC\nHEIGHT_TWO\nHEIGHT_THREE\nHEIGHT_FOUR");
    await vi.waitFor(() => expect(value.frames.some(rows => plain(rows).includes("HEIGHT_FOUR"))).toBe(true));
    await vi.waitFor(() => expect(value.shell.root.editor.getText()).toBe("x"));
    const after = value.shell.root.viewportFrameDescriptor()!;
    expect(after.followingEnd).toBe(true);
    expect(after.dock).toEqual(before.dock);
    expect(after.nextDocumentRange.end - before.nextDocumentRange.end).toBe(3);
    expect(value.shell.root.viewportPresentationEvidence().maxScroll - evidence.maxScroll).toBe(3);
    expect(value.backend.view().transcript.find(block => block.id === "tool-async")!.revision).toBe(revision);
    const firstCurrent = value.frames.findIndex(rows => plain(rows).includes("AFTER_ASYNC"));
    value.terminal.input("y");
    await vi.waitFor(() => expect(value.shell.root.editor.getText()).toBe("xy"));
    expect(value.frames.slice(firstCurrent).every(rows => !plain(rows).includes("BEFORE_ASYNC"))).toBe(true);
    const rows = value.shell.root.render(width);
    expect(rows.flatMap(row => readVisibleHyperlinks(row).ranges).some(link => link.target === "https://example.invalid/current")).toBe(true);
    const line = rows.findIndex(row => stripAnsi(row).includes("COPY_CURRENT"));
    expect(line).toBeGreaterThanOrEqual(0);
    const column = stripAnsi(rows[line]!).indexOf("COPY_CURRENT") + 1;
    value.shell.root.handleViewportPreInput(`\u001b[<0;${column};${line + 1}M`);
    value.shell.root.handleViewportPreInput(`\u001b[<32;${column + 12};${line + 1}M`);
    value.shell.root.handleViewportPreInput(`\u001b[<0;${column + 12};${line + 1}m`);
    expect(value.shell.root.handleViewportPreInput("\u0003").copyText).toBe("COPY_CURRENT");
  });

  it("keeps detached scroll and bottom-control hit geometry current after off-screen height changes", async () => {
    const value = await fixture();
    value.shell.root.handleViewportPreInput("\u001b[<64;5;5M");
    await vi.waitFor(() => expect(value.shell.root.viewportPresentationEvidence().followingEnd).toBe(false));
    const before = value.shell.root.viewportPresentationEvidence();
    value.change("AFTER_ASYNC\nROW_TWO\nROW_THREE");
    await vi.waitFor(() => expect(value.shell.root.viewportPresentationEvidence().maxScroll).toBe(before.maxScroll + 2));
    const after = value.shell.root.viewportPresentationEvidence();
    expect(after.followingEnd).toBe(false);
    expect(after.scrollTop).toBe(before.scrollTop);
    expect(after.bottom).toEqual(before.bottom);
    expect(after.bottom).not.toBeNull();
    const bottom = after.bottom!;
    value.terminal.input(`\u001b[<0;${bottom.columnStart};${bottom.row}M`);
    value.terminal.input(`\u001b[<0;${bottom.columnStart};${bottom.row}m`);
    await vi.waitFor(() => expect(value.shell.root.viewportPresentationEvidence().followingEnd).toBe(true));
  });

  it("coalesces notifications without eagerly rendering history or recursing into renderer invalidation", async () => {
    const value = await fixture();
    const history = value.backend.view().transcript[0]!;
    const stable = vi.spyOn(value.shell.root.transcriptComponent(history.id)!, "render");
    const dirty = vi.spyOn(value.shell.root.transcriptComponent("tool-async")!, "render");
    const request = vi.spyOn(value.shell.runtime, "requestRender");
    value.notifyInRenderer();
    for (let n = 0; n < 100; n++) value.callback()();
    expect(request).toHaveBeenCalledTimes(1);
    expect(dirty).not.toHaveBeenCalled();
    expect(stable).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(dirty).toHaveBeenCalledTimes(1));
    expect(stable).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("keeps off-screen dirtiness lazy and shows current rows on return without re-rendering all history", async () => {
    const value = await fixture();
    await value.emit({ type: "message_end", message: { role: "assistant", timestamp: 60, stopReason: "stop",
      content: [{ type: "text", text: Array.from({ length: 30 }, (_, n) => `LATER_${n}`).join("\n\n") }] } });
    value.shell.runtime.renderNow();
    expect(plain(value.shell.root.render(80))).not.toContain("BEFORE_ASYNC");
    const dirty = vi.spyOn(value.shell.root.transcriptComponent("tool-async")!, "render");
    const stable = value.backend.view().transcript.filter(block => block.id !== "tool-async")
      .map(block => vi.spyOn(value.shell.root.transcriptComponent(block.id)!, "render"));
    value.change("CURRENT_OFFSCREEN");
    expect(dirty).not.toHaveBeenCalled();
    expect(stable.every(spy => spy.mock.calls.length === 0)).toBe(true);
    await vi.waitFor(() => expect(dirty).toHaveBeenCalledTimes(1));
    expect(stable.every(spy => spy.mock.calls.length === 0)).toBe(true);
    let found = false;
    for (let n = 0; n < 30 && !found; n++) {
      value.shell.root.handleViewportPreInput("\u001b[<64;5;5M");
      const rows = value.shell.root.render(80);
      found = plain(rows).includes("CURRENT_OFFSCREEN");
      expect(plain(rows)).not.toContain("BEFORE_ASYNC");
    }
    expect(found).toBe(true);
    expect(dirty).toHaveBeenCalledTimes(1);
    expect(stable.every(spy => spy.mock.calls.length === 0)).toBe(true);
  });

  it("combines asynchronous height with a pending live stream and retains live-tail metadata", async () => {
    const value = await fixture();
    const message = { role: "assistant", timestamp: 60, stopReason: "pending", content: [{ type: "text", text: "LIVE_BEFORE" }] };
    await value.emit({ type: "message_start", message });
    value.shell.runtime.renderNow();
    value.session.emit({ type: "message_update", message: { ...message, content: [{ type: "text", text: "LIVE_AFTER" }] } });
    value.change("ASYNC_WITH_STREAM\nEXTRA_GEOMETRY");
    await vi.waitFor(() => expect(value.frames.some(rows => plain(rows).includes("LIVE_AFTER") && plain(rows).includes("EXTRA_GEOMETRY"))).toBe(true));
    const frame = value.shell.root.viewportFrameDescriptor()!;
    expect(frame.liveTailRows).toBeGreaterThan(0);
    expect(frame.liveTailRows).toBeLessThanOrEqual(3);
    expect(frame.followingEnd).toBe(true);
    expect(value.backend.view().transcript.at(-1)?.status).toBe("live");
  });

  it.each([[40, 16], [192, 54]])("refreshes behind modal coverage and restores current text/styles without resize at %s x %s", async (width, height) => {
    const value = await fixture(width, height);
    const input: string[] = [];
    const overlay = value.shell.runtime.showOverlay({
      render: (columns: number) => Array.from({ length: height }, () => "M".repeat(columns)),
      invalidate() {}, handleInput: (data: string) => { input.push(data); },
    }, { width: "100%", anchor: "top-left" });
    value.change("CURRENT_UNDER_MODAL\nASYNC_HEIGHT");
    value.terminal.input("x");
    await vi.waitFor(() => expect(input).toContain("x"));
    await vi.waitFor(() => expect(value.frames.some(rows => plain(rows).includes("CURRENT_UNDER_MODAL"))).toBe(true));
    expect(value.shell.root.editor.getText()).toBe("");
    const coveredEnd = value.terminal.writes.length;
    overlay.hide();
    await vi.waitFor(() => expect(value.terminal.writes.slice(coveredEnd).some(write => write.data.includes("CURRENT_UNDER_MODAL"))).toBe(true));
    value.terminal.input("y");
    await vi.waitFor(() => expect(value.shell.root.editor.getText()).toBe("y"));
    const frames = await replayTerminalCheckpoints(value.terminal.writes, [
      { writeEnd: coveredEnd, columns: width, rows: height },
      { writeEnd: value.terminal.writes.length, columns: width, rows: height },
    ]);
    expect(frames[0]!.rows[0]).toBe("M".repeat(width));
    expect(plain(frames[0]!.rows)).not.toContain("UNDER_MODAL");
    expect(plain(frames[1]!.rows)).toContain("CURRENT_UNDER_MODAL");
    expect(plain(frames[1]!.rows)).not.toContain("BEFORE_ASYNC");
    const options = { columns: width, rows: height, captureStyles: true };
    const honored = await replayTerminalPaint(value.terminal.writes, { ...options, synchronizedUpdates: "honor" });
    const ignored = await replayTerminalPaint(value.terminal.writes, { ...options, synchronizedUpdates: "ignore" });
    expect(ignored.final).toEqual(honored.final);
    expect(ignored.finalStyles).toEqual(honored.finalStyles);
  });

  it("ignores pending callbacks after authoritative removal, replacement, and disposal", async () => {
    const value = await fixture();
    const old = value.callback();
    value.session.messages = [{ role: "user", timestamp: 50, content: "AUTHORITATIVE_REPLACEMENT" }];
    await value.emit({ type: "agent_settled" });
    expect(value.shell.root.transcriptComponent("tool-async")).toBeUndefined();
    const request = vi.spyOn(value.shell.runtime, "requestRender");
    old();
    expect(request).not.toHaveBeenCalled();
    await value.replaceSession(new TranscriptFixtureSession([]));
    request.mockClear();
    old();
    expect(request).not.toHaveBeenCalled();
    await value.shell.dispose();
    request.mockClear();
    old();
    expect(request).not.toHaveBeenCalled();
  });
});
