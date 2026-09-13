import { join, resolve } from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCapabilities, setCapabilities, Text } from "#pi-tui";
import { ToolExecutionComponent } from "@earendil-works/pi-coding-agent";
import { createTuiFacade } from "../../../../src/integrations/pi/components/shell-shared-facade.js";
import { stripAnsi } from "../../../../src/ui/components/text.js";
import { readVisibleHyperlinks } from "../../../../src/ui/components/visible-hyperlinks.js";
import { assistantCall, TranscriptFixtureSession, transcriptLifecycleFixture } from "../../../support/rendering/transcript-lifecycle-fixture.js";

const fixtures: Awaited<ReturnType<typeof transcriptLifecycleFixture>>[] = [];
const capabilities = getCapabilities();
afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(fixture => fixture.dispose()));
  setCapabilities(capabilities);
});
async function fixture(options?: Parameters<typeof transcriptLifecycleFixture>[0]) {
  setCapabilities({ ...capabilities, hyperlinks: true });
  const value = await transcriptLifecycleFixture(options); fixtures.push(value); return value;
}
const textRows = (rows: readonly string[]) => rows.map(stripAnsi).join("\n");

/** Regressions deliberately use the real source order rather than tool events before message_end. */
describe("transcript content retention across renderer boundaries", () => {
  it("shows live tool output after the assistant has finished the arguments", async () => {
    const { emit, backend, shell } = await fixture();
    const message = assistantCall();
    await emit({ type: "message_start", message: { ...message, stopReason: "pending" } }, { type: "message_end", message });
    await emit({ type: "tool_execution_start", toolCallId: "call-1", toolName: "bash", args: { command: "fixture" } });
    await emit({ type: "tool_execution_update", toolCallId: "call-1", toolName: "bash", args: { command: "fixture" },
      partialResult: { content: [{ type: "text", text: "LIVE_OUTPUT_REQUIRED" }] } });
    expect(backend.view().transcript.find(block => block.id === "tool-call-1")).toMatchObject({ status: "live", text: "LIVE_OUTPUT_REQUIRED" });
    expect(textRows(shell.root.render(80))).toContain("LIVE_OUTPUT_REQUIRED");
  });

  it("keeps earlier history between a run-local agent_end and delayed settlement", async () => {
    const old = { role: "user", timestamp: 1, content: "EARLIER_HISTORY_REQUIRED" };
    const { emit, backend, shell } = await fixture({ messages: [old] });
    const message = { role: "assistant", timestamp: 20, stopReason: "stop", content: [{ type: "text", text: "NEW_RESPONSE" }] };
    const identity = backend.view().transcript[0]!.id;
    await emit({ type: "message_start", message: { ...message, stopReason: "pending" } }, { type: "message_end", message });
    await emit({ type: "agent_end", messages: [message], willRetry: false });
    expect(backend.view().transcript.map(block => block.id)).toContain(identity);
    expect(textRows(shell.root.render(80))).toContain("EARLIER_HISTORY_REQUIRED");
    await emit({ type: "agent_settled" });
    expect(backend.view().transcript.filter(block => block.id === identity)).toHaveLength(1);
  });

  it("does not downgrade a completed result when its message is restated", async () => {
    const { emit, backend } = await fixture();
    const message = assistantCall();
    await emit({ type: "message_end", message });
    await emit({ type: "tool_execution_end", toolCallId: "call-1", toolName: "bash", args: { command: "fixture" },
      result: { content: [{ type: "text", text: "FINAL_RESULT_REQUIRED" }] }, isError: false });
    await emit({ type: "turn_end", message, toolResults: [] });
    expect(backend.view().transcript.find(block => block.id === "tool-call-1")).toMatchObject({ kind: "tool-result", status: "finalized", text: "FINAL_RESULT_REQUIRED" });
  });

  it("maps argument completion and execution start independently to the public renderer", async () => {
    const contexts: { argsComplete: boolean; executionStarted: boolean }[] = [];
    const { emit, backend } = await fixture({ definitions: new Map([["phase", {
      name: "phase", renderCall: (_args: unknown, _theme: unknown, context: { argsComplete: boolean; executionStarted: boolean }) => {
        contexts.push({ argsComplete: context.argsComplete, executionStarted: context.executionStarted });
        return new Text("phase", 0, 0);
      },
    }]]) });
    const message = assistantCall("phase", "phase", {});
    await emit({ type: "message_start", message: { ...message, stopReason: "pending" } });
    expect(contexts.at(-1)).toEqual({ argsComplete: false, executionStarted: false });
    await emit({ type: "message_end", message });
    expect(contexts.at(-1)).toEqual({ argsComplete: true, executionStarted: false });
    expect(backend.view().transcript.at(-1)?.toolState).toEqual({ argsComplete: true, execution: "pending" });
    await emit({ type: "tool_execution_start", toolCallId: "phase", toolName: "phase", args: {} });
    expect(contexts.at(-1)).toEqual({ argsComplete: true, executionStarted: true });
    expect(backend.view().transcript.at(-1)?.toolState).toEqual({ argsComplete: true, execution: "running" });
  });

  it.each(["aborted", "error"])("settles a pending invocation on assistant %s and rejects late execution", async stopReason => {
    const { emit, backend, shell } = await fixture();
    const message = assistantCall();
    await emit({ type: "message_start", message: { ...message, stopReason: "pending" } });
    // The final message may omit the partially generated declaration; pinned settles all pending tools.
    await emit({ type: "message_end", message: { ...message, content: [], stopReason, errorMessage: "PROVIDER_FAILED" } });
    const result = backend.view().transcript.find(block => block.id === "tool-call-1")!;
    expect(result).toMatchObject({ kind: "tool-result", status: "finalized", toolState: {
      argsComplete: false, execution: stopReason === "error" ? "failed" : "aborted",
    } });
    expect(textRows(shell.root.render(80))).toContain(stopReason === "error" ? "PROVIDER_FAILED" : "Operation aborted");
    await emit({ type: "tool_execution_start", toolCallId: "call-1", toolName: "bash", args: {} },
      { type: "tool_execution_update", toolCallId: "call-1", toolName: "bash", partialResult: { content: [{ type: "text", text: "OBSOLETE_OUTPUT" }] } });
    expect(backend.view().transcript.find(block => block.id === result.id)).toBe(result);
  });

  it.each(["aborted", "error"])("preserves completed arguments when %s restates the call", async stopReason => {
    const { emit, backend } = await fixture();
    const message = assistantCall();
    await emit({ type: "message_end", message },
      { type: "tool_execution_start", toolCallId: "call-1", toolName: "bash", args: { command: "fixture" } });
    const failed = { ...message, stopReason, errorMessage: "PROVIDER_FAILED" };
    await emit({ type: "message_end", message: failed });
    expect(backend.view().transcript.find(block => block.id === "tool-call-1")?.toolState).toEqual({
      argsComplete: true, execution: stopReason === "error" ? "failed" : "aborted",
    });
    await emit({ type: "agent_settled" });
    expect(backend.view().transcript.find(block => block.id === "tool-call-1")?.toolState?.argsComplete).toBe(true);
  });

  it("replaces component execution state and rejects old callbacks when a new binding reuses invocation ids", async () => {
    const { emit, session, backend, shell, replaceSession } = await fixture();
    const obsolete = [...session.listeners][0]!;
    await emit({ type: "message_end", message: assistantCall() },
      { type: "tool_execution_end", toolCallId: "call-1", toolName: "bash", result: { content: [{ type: "text", text: "OLD_SESSION_RESULT" }] }, isError: false });
    expect(textRows(shell.root.render(80))).toContain("OLD_SESSION_RESULT");
    await replaceSession(new TranscriptFixtureSession([assistantCall("call-1", "bash", { command: "NEW_SESSION_COMMAND" })]));
    expect(backend.view().transcript.find(block => block.id === "tool-call-1")?.toolState?.execution).toBe("pending");
    expect(textRows(shell.root.render(80))).toContain("NEW_SESSION_COMMAND");
    expect(textRows(shell.root.render(80))).not.toContain("OLD_SESSION_RESULT");
    obsolete({ type: "tool_execution_end", toolCallId: "call-1", toolName: "bash", result: { content: [{ type: "text", text: "OBSOLETE_SESSION_RESULT" }] }, isError: false });
    await backend.flushEvents();
    expect(textRows(shell.root.render(80))).not.toContain("OBSOLETE_SESSION_RESULT");
  });

  it("preserves running output through duplicate starts and restated declarations", async () => {
    const { emit, backend } = await fixture();
    const message = assistantCall();
    await emit({ type: "message_end", message },
      { type: "tool_execution_start", toolCallId: "call-1", toolName: "bash", args: { command: "fixture" } },
      { type: "tool_execution_update", toolCallId: "call-1", toolName: "bash", partialResult: { content: [{ type: "text", text: "KEEP_RUNNING_OUTPUT" }] } });
    const result = backend.view().transcript.find(block => block.id === "tool-call-1")!;
    expect(result.toolRendering).toMatchObject({ arguments: { command: "fixture" } });
    await emit({ type: "tool_execution_start", toolCallId: "call-1", toolName: "bash", args: {} },
      { type: "turn_end", message, toolResults: [] });
    expect(backend.view().transcript.find(block => block.id === result.id)).toBe(result);
  });

  it("retains final arguments, disposition, and attachment ownership across call restatement", async () => {
    const { emit, backend } = await fixture();
    const message = assistantCall("attached", "unknown-image-tool", { path: "fixture.png" });
    await emit({ type: "message_end", message }, { type: "message_end", message: {
      role: "toolResult", timestamp: 25, toolCallId: "attached", toolName: "unknown-image-tool", isError: true,
      content: [{ type: "text", text: "ATTACHED_ERROR_RESULT" }, { type: "image", mimeType: "image/png", data: "AQID" }],
    } });
    const result = backend.view().transcript.find(block => block.id === "tool-attached")!;
    expect(result).toMatchObject({ toolState: { execution: "failed" }, payload: { isError: true },
      toolRendering: { arguments: { path: "fixture.png" } } });
    expect(result.imageReferences).toHaveLength(1);
    const order = backend.view().transcript.map(block => block.id);
    await emit({ type: "turn_end", message, toolResults: [] });
    expect(backend.view().transcript.find(block => block.id === result.id)).toBe(result);
    expect(backend.view().transcript.map(block => block.id)).toEqual(order);
    expect(backend.resolveTranscriptImage(result.imageReferences![0]!.assetId)).not.toBeNull();
  });

  it("rejects post-result partials in both the engine and a shell preempted by a full view", async () => {
    const { emit, backend, shell } = await fixture();
    await emit({ type: "message_end", message: assistantCall() },
      { type: "tool_execution_end", toolCallId: "call-1", toolName: "bash", args: { command: "fixture" },
        result: { content: [{ type: "text", text: "SETTLED_OUTPUT" }] }, isError: false });
    const result = backend.view().transcript.find(block => block.id === "tool-call-1")!;
    shell.root.update(backend.view());
    shell.root.applyTranscriptBlock({ ...result, revision: result.revision + 20, kind: "tool-call", status: "live",
      toolState: { argsComplete: true, execution: "running" }, text: "OBSOLETE_OUTPUT", payload: { partialResult: true } });
    expect(textRows(shell.root.render(80))).toContain("SETTLED_OUTPUT");
    expect(textRows(shell.root.render(80))).not.toContain("OBSOLETE_OUTPUT");
    await emit({ type: "tool_execution_update", toolCallId: "call-1", toolName: "bash", partialResult: { content: [{ type: "text", text: "OBSOLETE_OUTPUT" }] } });
    expect(backend.view().transcript.find(block => block.id === result.id)).toBe(result);
  });

  it("coalesces concurrent executions independently after arguments finish without suppressing another live tool", async () => {
    const { session, emit, backend } = await fixture();
    const first = assistantCall("first");
    const second = { ...assistantCall("second"), timestamp: 30 };
    await emit({ type: "message_end", message: first }, { type: "message_end", message: second });
    for (let index = 0; index < 512; index++) {
      for (const id of ["first", "second"]) session.emit({ type: "tool_execution_update", toolCallId: id, toolName: "bash",
        partialResult: { content: [{ type: "text", text: `${id}-${index}` }] } });
    }
    session.emit({ type: "tool_execution_end", toolCallId: "first", toolName: "bash", result: { content: [{ type: "text", text: "FIRST_FAILED" }] }, isError: true });
    await backend.flushEvents();
    expect(backend.view().transcript.find(block => block.id === "tool-first")).toMatchObject({
      text: "FIRST_FAILED", status: "finalized", toolState: { execution: "failed" },
    });
    expect(backend.view().transcript.find(block => block.id === "tool-second")).toMatchObject({
      text: "second-511", status: "live", toolState: { execution: "running" },
    });
    expect(backend.deliveryDiagnostics().superseded).toBeGreaterThan(1000);
    expect(backend.deliveryDiagnostics().peakNodes).toBeLessThan(32);
  });

  it.each([true, false])("settles tool execution state when protected overload recovery finalizes the transcript (cancelled=%s)", async cancelled => {
    const { session, backend } = await fixture();
    if (!cancelled) vi.spyOn(session, "abort").mockRejectedValueOnce(new Error("abort failed"));
    for (let n = 0; n < 1100; n++) session.emit({ type: "tool_execution_update", toolCallId: `overflow-${n}`, toolName: "unknown",
      partialResult: { content: [{ type: "text", text: "running" }] } });
    await expect(backend.flushEvents()).rejects.toThrow("Engine delivery did not complete");
    expect(backend.deliveryDiagnostics().overloads).toBeGreaterThan(0);
    const tools = backend.snapshot().view.transcript.filter(block => block.toolState !== undefined);
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every(block => block.status === "finalized" && block.toolState?.execution === (cancelled ? "aborted" : "failed"))).toBe(true);
  });

  it("merges unseen run-local messages with repeated timestamps without replacing earlier turns", async () => {
    const old = { role: "assistant", timestamp: 20, stopReason: "stop", content: [{ type: "text", text: "OLD_TURN" }] };
    const { session, emit, backend } = await fixture({ messages: [old] });
    const first = backend.view().transcript[0]!;
    const next = { ...old, content: [{ type: "text", text: "NEW_TURN" }] };
    session.messages.push(next);
    await emit({ type: "agent_end", messages: [next], willRetry: false });
    expect(backend.view().transcript.map(block => block.text)).toEqual(["OLD_TURN", "NEW_TURN"]);
    expect(backend.view().transcript[0]).toBe(first);
    const blocks = backend.view().transcript;
    await emit({ type: "agent_settled" });
    expect(backend.view().transcript).toEqual(blocks);
  });

  it("passes structured result details to the actual tool renderer", async () => {
    const renderResult = vi.fn((result: { details?: { diff?: string } }) => new Text(result.details?.diff ?? "MISSING_DETAILS", 0, 0));
    const { emit, shell } = await fixture({ definitions: new Map([["structured", {
      name: "structured", renderCall: () => new Text("structured", 0, 0), renderResult,
    }]]) });
    await emit({ type: "message_end", message: assistantCall("call-1", "structured", {}) });
    await emit({ type: "tool_execution_end", toolCallId: "call-1", toolName: "structured", args: {},
      result: { content: [{ type: "text", text: "Success" }], details: { diff: "AUTHORITATIVE_DIFF_REQUIRED" } }, isError: false });
    expect(renderResult).toHaveBeenLastCalledWith(expect.objectContaining({ details: { diff: "AUTHORITATIVE_DIFF_REQUIRED" } }), expect.anything(), expect.anything(), expect.anything());
    expect(textRows(shell.root.render(80))).toContain("AUTHORITATIVE_DIFF_REQUIRED");
  });

  it("preserves partial content boundaries, deep details, full arguments, and error context", async () => {
    const args = { json: "literal argument", entries: Array.from({ length: 150 }, (_, n) => n) };
    const details = { entries: Array.from({ length: 150 }, (_, n) => ({ n })) };
    const content = [{ type: "text", text: "first" }, { type: "text", text: "" }, { type: "text", text: "last" }];
    const renderResult = vi.fn(() => new Text("structured output", 0, 0));
    const { emit, backend } = await fixture({ definitions: new Map([["structured", {
      name: "structured", renderCall: () => new Text("structured", 0, 0), renderResult,
    }]]) });
    await emit({ type: "message_end", message: assistantCall("structured", "structured", args) });
    await emit({ type: "tool_execution_update", toolCallId: "structured", toolName: "structured", partialResult: { content, details } });
    expect(renderResult).toHaveBeenLastCalledWith({ content, details }, { expanded: false, isPartial: true },
      expect.anything(), expect.objectContaining({ args, argsComplete: true, executionStarted: true, isError: false }));
    await emit({ type: "tool_execution_end", toolCallId: "structured", toolName: "structured", result: { content, details }, isError: true });
    expect(renderResult).toHaveBeenLastCalledWith({ content, details }, { expanded: false, isPartial: false },
      expect.anything(), expect.objectContaining({ args, isError: true }));
    expect(backend.snapshot().view.transcript.at(-1)?.toolRendering?.result?.details).toEqual(details);
  });

  it("enforces the same combined metadata limit while reconstructing history", async () => {
    const args = { value: "a".repeat(40 * 1024) };
    const { backend, shell } = await fixture({ messages: [assistantCall("history", "unknown", args), {
      role: "toolResult", toolCallId: "history", toolName: "unknown", timestamp: 25, isError: false,
      content: [{ type: "text", text: "HISTORY_RESULT" }], details: { value: "d".repeat(40 * 1024) },
    }] });
    const result = backend.snapshot().view.transcript.at(-1)!;
    expect(result.toolRendering?.arguments).toEqual(args);
    expect(result.toolRendering?.result?.details).toBeUndefined();
    expect(result.toolRendering?.unavailable).toContain("Tool details unavailable");
    expect(textRows(shell.root.transcriptComponent(result.id)!.render(80))).toContain("HISTORY_RESULT");
  });

  it("preserves the pinned renderer error fallback", async () => {
    const { emit, shell } = await fixture({ definitions: new Map([["throws", {
      name: "throws", renderCall: () => new Text("throws", 0, 0), renderResult: () => { throw new Error("renderer failed"); },
    }]]) });
    await emit({ type: "tool_execution_end", toolCallId: "throws", toolName: "throws", args: {},
      result: { content: [{ type: "text", text: "RENDERER_FALLBACK_RESULT" }], details: { diff: "valid" } }, isError: false });
    expect(textRows(shell.root.render(80))).toContain("RENDERER_FALLBACK_RESULT");
  });

  it("uses pinned inline PNG presentation and hidden-image fallback without duplicating the image", async () => {
    const { emit, shell } = await fixture();
    setCapabilities({ ...getCapabilities(), images: "kitty" });
    const data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    await emit({ type: "message_end", message: assistantCall("png", "unknown", {}) });
    await emit({ type: "tool_execution_end", toolCallId: "png", toolName: "unknown", args: {},
      result: { content: [{ type: "image", data, mimeType: "image/png" }] }, isError: false });
    const component = shell.root.transcriptComponent("tool-png")!;
    const rows = component.render(80).join("\n");
    expect(rows.match(/\u001b_Ga=T/g)).toHaveLength(1);
    component.setImagePresentation(false, 80);
    expect(textRows(component.render(80))).toMatch(/\[Image/);
    expect(component.render(80).join("\n")).not.toContain("\u001b_Ga=T");
  });

  it("shows an oversized-details fallback without losing the result or outcome", async () => {
    const { emit, backend, shell } = await fixture();
    await emit({ type: "tool_execution_end", toolCallId: "large", toolName: "unknown", args: {},
      result: { content: [{ type: "text", text: "KEEP_LARGE_RESULT" }], details: "x".repeat(70 * 1024) }, isError: false });
    expect(textRows(shell.root.render(80))).toContain("KEEP_LARGE_RESULT");
    expect(textRows(shell.root.render(80))).toContain("Tool details unavailable");
    expect(backend.snapshot().view.transcript.at(-1)?.toolState?.execution).toBe("succeeded");
  });

  it("matches the independent actual edit renderer and retains its authoritative diff after a late failed preview", async () => {
    const args = { path: resolve(".artifacts/nonexistent-edit-preview-fixture.ts"), edits: [{ oldText: "old", newText: "new" }] };
    const result = { content: [{ type: "text" as const, text: "Successfully replaced text" }],
      details: { diff: "-1 old\n+1 AUTHORITATIVE_FINAL_DIFF", firstChangedLine: 1 }, isError: false };
    const { emit, shell } = await fixture();
    const requested = vi.fn();
    const reference = new ToolExecutionComponent("edit", "edit", args, { showImages: true, imageWidthCells: 80 }, undefined,
      createTuiFacade({ getColumns: () => 80, getRows: () => 30, requestRender: requested }), process.cwd());
    reference.setArgsComplete();
    requested.mockClear();
    reference.updateResult(result);
    await emit({ type: "tool_execution_end", toolCallId: "edit", toolName: "edit", args, result, isError: false });
    const component = shell.root.transcriptComponent("tool-edit")!;
    expect(textRows(component.render(100))).toContain("AUTHORITATIVE_FINAL_DIFF");
    await vi.waitFor(() => expect(requested).toHaveBeenCalled());
    await vi.waitFor(() => expect(component.presentationRevision).toBeGreaterThan(0));
    for (const width of [40, 80, 192]) expect(component.render(width)).toEqual(reference.render(width));
    expect(textRows(component.render(100))).toContain("AUTHORITATIVE_FINAL_DIFF");
    expect(textRows(component.render(100))).not.toContain("ENOENT");
  });

  it("replaces an already rendered stale edit preview with the authoritative final diff", async () => {
    const directory = await mkdtemp(join(tmpdir(), "a1-edit-parity-"));
    try {
      const path = join(directory, "sample.ts");
      await writeFile(path, "old\n");
      const args = { path, edits: [{ oldText: "old", newText: "PREVIEW_NOT_FINAL" }] };
      const { emit, shell } = await fixture();
      await emit({ type: "message_end", message: assistantCall("edit-preview", "edit", args) });
      const component = shell.root.transcriptComponent("tool-edit-preview")!;
      await vi.waitFor(() => expect(textRows(component.render(100))).toContain("PREVIEW_NOT_FINAL"));
      const result = { content: [{ type: "text" as const, text: "Success" }],
        details: { diff: "-1 old\n+1 AUTHORITATIVE_FINAL_DIFF", firstChangedLine: 1 }, isError: false };
      await emit({ type: "tool_execution_start", toolCallId: "edit-preview", toolName: "edit", args },
        { type: "tool_execution_end", toolCallId: "edit-preview", toolName: "edit", args, result, isError: false });
      expect(textRows(component.render(100))).toContain("AUTHORITATIVE_FINAL_DIFF");
      expect(textRows(component.render(100))).not.toContain("PREVIEW_NOT_FINAL");
      const reference = new ToolExecutionComponent("edit", "edit-preview", args, {}, undefined,
        createTuiFacade({ getColumns: () => 80, getRows: () => 30, requestRender() {} }), process.cwd());
      reference.setArgsComplete(); reference.markExecutionStarted(); reference.updateResult(result);
      for (const width of [40, 80, 192]) expect(component.render(width)).toEqual(reference.render(width));
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("updates image references without replacing the mounted tool or its renderer state", async () => {
    const states = new Set<unknown>();
    const renderResult = vi.fn((result: { content: { type: string }[] }) => new Text(`images:${result.content.filter(p => p.type === "image").length}`, 0, 0));
    const { emit, shell, backend } = await fixture({ definitions: new Map([["images", {
      name: "images", renderCall: (_args: unknown, _theme: unknown, context: { state: unknown }) => {
        states.add(context.state); return new Text("images", 0, 0);
      }, renderResult,
    }]]) });
    await emit({ type: "message_end", message: assistantCall("images", "images", {}) });
    const mounted = shell.root.transcriptComponent("tool-images");
    for (const data of ["AQID", "BAUG"]) {
      const content = [{ type: "image", data, mimeType: "image/png" }];
      await emit({ type: "tool_execution_update", toolCallId: "images", toolName: "images", partialResult: { content } });
      expect(renderResult).toHaveBeenLastCalledWith(expect.objectContaining({ content }), expect.anything(), expect.anything(), expect.anything());
      expect(backend.view().transcript.at(-1)?.imageReferences).toHaveLength(1);
      expect(shell.root.transcriptComponent("tool-images")).toBe(mounted);
      expect(states.size).toBe(1);
    }
  });

  it("schedules a real asynchronous frame, coalesces notifications, and reuses unaffected rows", async () => {
    let label = "BEFORE_SCHEDULED_RENDER";
    let invalidate = () => {};
    const { emit, shell, terminal, backend } = await fixture({ messages: [{ role: "user", timestamp: 1, content: "STABLE_HISTORY" }],
      definitions: new Map([["async", { name: "async", renderCall: () => new Text("async", 0, 0),
        renderResult: (_r: unknown, _o: unknown, _t: unknown, context: { invalidate(): void }) => {
          invalidate = context.invalidate; return new Text(label, 0, 0);
        },
      }]]) });
    await emit({ type: "tool_execution_end", toolCallId: "async", toolName: "async", args: {}, result: { content: [] }, isError: false });
    await vi.waitFor(() => expect(textRows(terminal.writes.map(write => write.data))).toContain(label));
    const stable = vi.spyOn(shell.root.transcriptComponent(backend.view().transcript[0]!.id)!, "render");
    const request = vi.spyOn(shell.runtime, "requestRender");
    const offset = terminal.writes.length;
    const revision = backend.view().transcript.at(-1)!.revision;
    label = "AFTER_SCHEDULED_RENDER\nSECOND_ASYNC_ROW";
    for (let n = 0; n < 100; n++) invalidate();
    expect(request).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(textRows(terminal.writes.slice(offset).map(write => write.data))).toContain("AFTER_SCHEDULED_RENDER"));
    expect(textRows(shell.root.render(80))).toContain("SECOND_ASYNC_ROW");
    expect(stable).not.toHaveBeenCalled();
    expect(backend.view().transcript.at(-1)!.revision).toBe(revision);
  });

  it("rejects asynchronous callbacks from replaced component mounts and session generations", async () => {
    let invalidate = () => {};
    const { emit, shell, replaceSession } = await fixture({ definitions: new Map([["async", {
      name: "async", renderResult: (_r: unknown, _o: unknown, _t: unknown, context: { invalidate(): void }) => {
        invalidate = context.invalidate; return new Text("OLD_ASYNC_CONTENT", 0, 0);
      },
    }]]) });
    await emit({ type: "tool_execution_end", toolCallId: "async", toolName: "async", args: {}, result: { content: [] }, isError: false });
    const obsoleteMount = invalidate;
    shell.root.transcriptComponent("tool-async")!.setOutputPad(0);
    const request = vi.spyOn(shell.runtime, "requestRender");
    obsoleteMount();
    expect(request).not.toHaveBeenCalled();
    const obsoleteSession = invalidate;
    await replaceSession(new TranscriptFixtureSession([assistantCall("async", "bash", { command: "NEW_SESSION" })]));
    request.mockClear();
    obsoleteSession();
    expect(request).not.toHaveBeenCalled();
    expect(textRows(shell.root.render(80))).not.toContain("OLD_ASYNC_CONTENT");
  });

  it("publishes asynchronous renderer changes at the same semantic revision", async () => {
    let label = "BEFORE_ASYNC_RENDER";
    let invalidate = () => {};
    const { emit, shell, backend } = await fixture({ definitions: new Map([["async-render", {
      name: "async-render", renderCall: () => new Text("async-render", 0, 0),
      renderResult: (_result: unknown, _options: unknown, _theme: unknown, context: { invalidate(): void }) => {
        invalidate = context.invalidate; return new Text(label, 0, 0);
      },
    }]]) });
    await emit({ type: "tool_execution_end", toolCallId: "async", toolName: "async-render", args: {}, result: { content: [] }, isError: false });
    expect(textRows(shell.root.render(80))).toContain(label);
    const revision = backend.view().transcript.at(-1)!.revision;
    const request = vi.spyOn(shell.runtime, "requestRender");
    label = "AFTER_ASYNC_RENDER";
    invalidate();
    await Promise.resolve();
    expect(request).toHaveBeenCalled();
    expect(textRows(shell.root.render(80))).toContain(label);
    expect(backend.view().transcript.at(-1)!.revision).toBe(revision);
  });

  it("attaches a late image to an already mounted tool surface", async () => {
    const { emit, shell, backend } = await fixture();
    await emit({ type: "message_end", message: assistantCall("image", "unknown-image-tool", {}) });
    await emit({ type: "message_end", message: {
      role: "toolResult", timestamp: 25, toolCallId: "image", toolName: "unknown-image-tool", isError: false,
      content: [{ type: "image", mimeType: "image/png", data: "AQID" }],
    } });
    expect(backend.view().transcript.find(block => block.id === "tool-image")?.imageReferences).toHaveLength(1);
    expect(textRows(shell.root.render(80))).toMatch(/\[Image/);
  });

  // Known failure retained verbatim under the accepted scope split (PR #355 / issue #353).
  // Vitest must fail this test if the defect unexpectedly passes, so follow-up cannot forget to promote it.
  it.fails("retains full URL targets on wrapped tool-output segments [known: #353]", async () => {
    const url = "https://example.invalid/very-long-directory/another-directory/resource?query=value";
    const { emit, shell } = await fixture({ width: 40 });
    await emit({ type: "tool_execution_end", toolCallId: "url", toolName: "bash", args: { command: "fixture" },
      result: { content: [{ type: "text", text: url }] }, isError: false });
    const rows = shell.root.render(40);
    const links = rows.flatMap(row => readVisibleHyperlinks(row).ranges).filter(range => range.kind === "explicit");
    expect(links.length).toBeGreaterThan(1);
    expect(links.every(range => range.target === url)).toBe(true);
  });

  it("keeps full targets on wrapped file links and explicit styled labels", async () => {
    const path = resolve("very-long-directory-name/another-directory/very-long-file-name.ts");
    const { emit, shell } = await fixture({ width: 40 });
    await emit({ type: "tool_execution_end", toolCallId: "file", toolName: "read", args: { path },
      result: { content: [] }, isError: false });
    const links = shell.root.render(40).flatMap(row => readVisibleHyperlinks(row).ranges).filter(range => range.kind === "explicit");
    expect(links.length).toBeGreaterThan(1);
    expect(links.every(range => range.target === pathToFileURL(path).href)).toBe(true);
  });
});
