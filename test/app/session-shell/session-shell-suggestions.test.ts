import { SUGGESTION_CONVERSATIONS } from "../../fixtures/prompt-suggestion-conversations.js";
import { SuggestionDiagnosticCapture } from "../../../src/features/prompt-suggestions/index.js";
import { join } from "node:path";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
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
import type { OwnedUiPromptSuggestionGeneratorPort } from "../../../src/contracts/owned-ui/index.js";
import { memoryHistory } from "./prompt-history-fixture.js";
import { fixture, nextImmediate } from "./session-shell-fixture.js";

describe("OwnedUiSessionShell prompt suggestions", () => {
  it("exposes modal, readiness, and focus presentation reasons without altering the draft", async () => {
    const target = await fixture([], [], true);
    try {
      const view = target.adapter.view();
      target.shell.root.update({ ...view, dialog: { id: "modal", title: "Choice", kind: "choice", payload: null } });
      expect(target.shell.root.promptSuggestionPrepareBlockReason()).toBe("modal");
      target.shell.root.update({ ...view, lifecycle: "busy" });
      expect(target.shell.root.promptSuggestionPresentationBlockReason()).toBe("not-ready");
      target.shell.root.update(view);
      target.shell.root.editor.setFocused?.(false);
      expect(target.shell.root.promptSuggestionPresentationBlockReason()).toBe("not-focused");
      expect(target.shell.root.editor.getText()).toBe("");
    } finally { await target.shell.dispose(); }
  });

  it.each(["empty", "error"])("does not extract an archive fallback after %s", async outcome => {
    let backend!: OwnedUiPromptSuggestionGeneratorPort;
    const diagnostics = new SuggestionDiagnosticCapture({ enabled: true });
    const target = await fixture(SUGGESTION_CONVERSATIONS.archive.messages, [], true, undefined, undefined, undefined, undefined, {
      generator: { generate: request => backend.generate(request) }, enabled: () => true, onChange: () => () => {}, diagnostics,
    });
    backend = target.adapter;
    target.engine.completeSuggestion = async () => ({ stopReason: outcome === "error" ? "error" : "stop", content: [] });
    try {
      target.engine.session.emit({ type: "agent_start" });
      target.engine.session.emit({ type: "message_end", message: SUGGESTION_CONVERSATIONS.archive.messages.at(-1) });
      target.engine.session.emit({ type: "agent_settled" });
      await target.adapter.flushEvents();
      await nextImmediate();
      expect(stripTerminalSequences(target.shell.root.editor.render(60).join("\n"))).not.toContain("archive it");
      expect(diagnostics.snapshot().map(record => record.event)).toEqual(["started", outcome === "error" ? "provider-failure" : "empty"]);
    } finally { await target.shell.dispose(); diagnostics.dispose(); }
  });

  it("prefetches before settlement, reveals atomically at settlement, and requires Tab before Enter", async () => {
    const messages = [
      { role: "user", content: "fix it", timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "First answer" }], stopReason: "stop", timestamp: 2 },
      { role: "user", content: "continue", timestamp: 3 },
      { role: "assistant", content: [{ type: "text", text: "Shall I merge it?" }], stopReason: "stop", timestamp: 4 },
    ];
    const calls: string[] = [];
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: async request => {
        calls.push(`suggest:${request.identity.runSequence}:${request.identity.responseSequence}`);
        return { identity: request.identity, outcome: "candidate", text: "go ahead and merge it" };
      },
    };
    const target = await fixture(messages, [], true, undefined, undefined, undefined, undefined, {
      generator,
      enabled: () => true,
      onChange: () => () => {},
    });
    target.engine.session.emit({ type: "agent_start" });
    target.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    await target.adapter.flushEvents();
    await nextImmediate();
    expect(calls).toEqual(["suggest:1:1"]);
    expect(stripTerminalSequences(target.shell.root.editor.render(60).join("\n"))).not.toContain("go ahead and merge it");

    target.engine.session.emit({ type: "agent_settled" });
    await target.adapter.flushEvents();
    const ghost = target.shell.root.editor.render(60).join("\n");
    expect(stripTerminalSequences(ghost)).toContain("❯ go ahead and merge it");
    expect(ghost).toContain("\u001b[2m");
    expect(target.shell.root.editor.getText()).toBe("");
    expect(target.adapter.view().status.workingMessage).toBeNull();

    target.shell.root.editor.handleInput?.("\r");
    expect(target.engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([]);
    target.shell.root.editor.handleInput?.("\t");
    expect(target.shell.root.editor.getText()).toBe("go ahead and merge it");
    expect(target.engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([]);
    target.shell.root.editor.handleInput?.("\r");
    await nextImmediate();
    expect(target.engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual(["prompt:go ahead and merge it"]);
    await target.shell.dispose();
  });

  it("reveals a still-current suggestion immediately when its result arrives after settlement", async () => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "First" }], stopReason: "stop" },
      { role: "assistant", content: [{ type: "text", text: "Second" }], stopReason: "stop" },
    ];
    let finish: ((text: string) => void) | undefined;
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: request => new Promise(resolve => { finish = text => resolve({ identity: request.identity, outcome: "candidate", text }); }),
    };
    const target = await fixture(messages, [], true, undefined, undefined, undefined, undefined, {
      generator, enabled: () => true, onChange: () => () => {},
    });
    target.engine.session.emit({ type: "agent_start" });
    target.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    target.engine.session.emit({ type: "agent_settled" });
    await target.adapter.flushEvents();
    expect(stripTerminalSequences(target.shell.root.editor.render(50).join("\n"))).not.toContain("run the tests");
    finish?.("run the tests");
    await nextImmediate();
    expect(stripTerminalSequences(target.shell.root.editor.render(50).join("\n"))).toContain("❯ run the tests");
    await target.shell.dispose();
  });

  it.each(["backspace", "clear-shortcut"])("hides a shown suggestion behind a coordinated draft and repaints it after %s empties the editor", async clearing => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "First" }], stopReason: "stop" },
      { role: "assistant", content: [{ type: "text", text: "Second" }], stopReason: "stop" },
    ];
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ({ identity: request.identity, outcome: "candidate" as const, text: "run the tests" })),
    };
    const target = await fixture(messages, [], true, undefined, undefined, undefined, undefined, {
      generator, enabled: () => true, onChange: () => () => {},
    });
    try {
      target.engine.session.emit({ type: "agent_start" });
      target.engine.session.emit({ type: "message_end", message: messages.at(-1) });
      target.engine.session.emit({ type: "agent_settled" });
      await target.adapter.flushEvents();
      await nextImmediate();
      const rendered = () => stripTerminalSequences(target.shell.root.editor.render(50).join("\n"));
      expect(rendered()).toContain("❯ run the tests");

      target.terminal.input("x");
      await nextImmediate();
      expect(target.shell.root.editor.getText()).toBe("x");
      expect(rendered()).not.toContain("run the tests");
      target.terminal.input("\t");
      await nextImmediate();
      expect(target.shell.root.editor.getText()).toBe("x");

      target.terminal.input(clearing === "backspace" ? "\u007f" : "\u0003");
      await nextImmediate();
      expect(target.shell.root.editor.getText()).toBe("");
      expect(rendered()).toContain("❯ run the tests");
      expect(generator.generate).toHaveBeenCalledTimes(1);

      target.terminal.input("\t");
      await nextImmediate();
      expect(target.shell.root.editor.getText()).toBe("run the tests");
      expect(target.shell.root.editor.render(50).join("\n")).not.toContain("\u001b[2mrun the tests");
    } finally { await target.shell.dispose(); }
  });

  it.each([false, true])("restores a shown suggestion through coordinated input after clearing an autocomplete draft (history=%s)", async persistent => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "First" }], stopReason: "stop" },
      { role: "assistant", content: [{ type: "text", text: "Second" }], stopReason: "stop" },
    ];
    const diagnostics = new SuggestionDiagnosticCapture({ enabled: true });
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ({ identity: request.identity, outcome: "candidate" as const, text: "run the tests" })),
    };
    const history = memoryHistory();
    const target = await fixture(messages, [], true, undefined, undefined, undefined, undefined, {
      generator, enabled: () => true, onChange: () => () => {}, diagnostics,
    }, persistent ? { store: history.store, limit: 100 } : undefined);
    try {
      target.engine.session.emit({ type: "agent_start" });
      target.engine.session.emit({ type: "message_end", message: messages.at(-1) });
      target.engine.session.emit({ type: "agent_settled" });
      await target.adapter.flushEvents();
      await nextImmediate();
      expect(stripTerminalSequences(target.shell.root.editor.render(50).join("\n"))).toContain("❯ run the tests");

      target.terminal.input("/");
      await nextImmediate();
      expect(target.shell.root.editor.getText()).toBe("/");
      expect(stripTerminalSequences(target.shell.root.editor.render(50).join("\n"))).not.toContain("run the tests");

      const writeStart = target.terminal.writes.length;
      target.terminal.input("\u0015");
      await nextImmediate();
      expect(target.shell.root.editor.getText()).toBe("");
      expect(target.shell.root.promptSuggestionPresentationBlockReason()).toBeNull();
      expect(stripTerminalSequences(target.shell.root.editor.render(50).join("\n"))).toContain("❯ run the tests");
      expect(stripTerminalSequences(target.terminal.writes.slice(writeStart).join(""))).toContain("run the tests");
      expect(generator.generate).toHaveBeenCalledTimes(1);
      expect(diagnostics.snapshot().filter(record => record.event === "displayed")).toHaveLength(1);
    } finally { await target.shell.dispose(); diagnostics.dispose(); }
  });

  it("submits only the typed draft and does not restore the suggestion afterwards", async () => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "First" }], stopReason: "stop" },
      { role: "assistant", content: [{ type: "text", text: "Second" }], stopReason: "stop" },
    ];
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ({ identity: request.identity, outcome: "candidate" as const, text: "run the tests" })),
    };
    const target = await fixture(messages, [], true, undefined, undefined, undefined, undefined, {
      generator, enabled: () => true, onChange: () => () => {},
    });
    try {
      target.engine.session.emit({ type: "agent_start" });
      target.engine.session.emit({ type: "message_end", message: messages.at(-1) });
      target.engine.session.emit({ type: "agent_settled" });
      await target.adapter.flushEvents();
      await nextImmediate();
      const rendered = () => stripTerminalSequences(target.shell.root.editor.render(50).join("\n"));
      expect(rendered()).toContain("❯ run the tests");

      for (const key of "hi") target.shell.root.editor.handleInput?.(key);
      target.shell.root.editor.handleInput?.("\r");
      await nextImmediate();
      expect(target.engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual(["prompt:hi"]);
      expect(target.shell.root.editor.getText()).toBe("");
      expect(rendered()).not.toContain("run the tests");
      target.shell.root.editor.handleInput?.("\t");
      expect(target.shell.root.editor.getText()).toBe("");
    } finally { await target.shell.dispose(); }
  });

  it("applies the prompt-suggestion setting live without generating retroactively", async () => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "First" }], stopReason: "stop" },
      { role: "assistant", content: [{ type: "text", text: "Second" }], stopReason: "stop" },
    ];
    let settingListener: ((value: boolean) => void) | undefined;
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ({ identity: request.identity, outcome: "candidate" as const, text: "run the tests" })),
    };
    const target = await fixture(messages, [], true, undefined, undefined, undefined, undefined, {
      generator,
      enabled: () => true,
      onChange: listener => { settingListener = listener; return () => { settingListener = undefined; }; },
    });
    target.engine.session.emit({ type: "agent_start" });
    target.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    target.engine.session.emit({ type: "agent_settled" });
    await target.adapter.flushEvents();
    await nextImmediate();
    expect(stripTerminalSequences(target.shell.root.editor.render(50).join("\n"))).toContain("run the tests");

    settingListener?.(false);
    expect(stripTerminalSequences(target.shell.root.editor.render(50).join("\n"))).not.toContain("run the tests");
    target.engine.session.emit({ type: "agent_start" });
    target.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    target.engine.session.emit({ type: "agent_settled" });
    await target.adapter.flushEvents();
    expect(generator.generate).toHaveBeenCalledTimes(1);

    settingListener?.(true);
    expect(generator.generate).toHaveBeenCalledTimes(1);
    target.engine.session.emit({ type: "agent_start" });
    target.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    target.engine.session.emit({ type: "agent_settled" });
    await target.adapter.flushEvents();
    await nextImmediate();
    expect(generator.generate).toHaveBeenCalledTimes(2);
    await target.shell.dispose();
  });

  it("does not install prompt suggestions on the comparison shell even if options are supplied", async () => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "First" }], stopReason: "stop" },
      { role: "assistant", content: [{ type: "text", text: "Second" }], stopReason: "stop" },
    ];
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ({ identity: request.identity, outcome: "candidate" as const, text: "run the tests" })),
    };
    const target = await fixture(messages, [], false, undefined, undefined, undefined, undefined, {
      generator, enabled: () => true, onChange: () => () => {},
    });
    target.engine.session.emit({ type: "agent_start" });
    target.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    target.engine.session.emit({ type: "agent_settled" });
    await target.adapter.flushEvents();
    expect(generator.generate).not.toHaveBeenCalled();
    expect(stripTerminalSequences(target.shell.root.editor.render(50).join("\n"))).not.toContain("❯");
    await target.shell.dispose();
  });

  it("cancels pending suggestion work on typing and suppresses tool continuations and replacement input", async () => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "First" }], stopReason: "stop" },
      { role: "assistant", content: [{ type: "text", text: "Second" }], stopReason: "stop" },
    ];
    let finish: ((text: string) => void) | undefined;
    let observedSignal: AbortSignal | undefined;
    const generator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: request => {
        observedSignal = request.signal;
        return new Promise(resolve => { finish = text => resolve({ identity: request.identity, outcome: "candidate", text }); });
      },
    };
    const suggestionOptions = { generator, enabled: () => true, onChange: () => () => {} };
    const typing = await fixture(messages, [], true, undefined, undefined, undefined, undefined, suggestionOptions);
    typing.engine.session.emit({ type: "agent_start" });
    typing.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    await typing.adapter.flushEvents();
    typing.shell.root.editor.handleInput?.("x");
    expect(observedSignal?.aborted).toBe(true);
    finish?.("run the tests");
    await nextImmediate();
    expect(typing.shell.root.editor.getText()).toBe("x");
    expect(stripTerminalSequences(typing.shell.root.editor.render(50).join("\n"))).not.toContain("run the tests");
    await typing.shell.dispose();

    const blockedGenerator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ({ identity: request.identity, outcome: "candidate" as const, text: "run the tests" })),
    };
    const blocked = await fixture(messages, [], true, undefined, undefined, undefined, undefined, {
      generator: blockedGenerator, enabled: () => true, onChange: () => () => {},
    });
    blocked.shell.root.setInputSurface({ render: () => ["replacement"], invalidate() {}, handleInput() {} });
    blocked.engine.session.emit({ type: "agent_start" });
    blocked.engine.session.emit({ type: "message_end", message: messages.at(-1) });
    blocked.engine.session.emit({ type: "agent_settled" });
    await blocked.adapter.flushEvents();
    expect(blockedGenerator.generate).not.toHaveBeenCalled();
    await blocked.shell.dispose();

    const toolGenerator: OwnedUiPromptSuggestionGeneratorPort = {
      generate: vi.fn(async request => ({ identity: request.identity, outcome: "candidate" as const, text: "continue" })),
    };
    const tools = await fixture(messages, [], true, undefined, undefined, undefined, undefined, {
      generator: toolGenerator, enabled: () => true, onChange: () => () => {},
    });
    tools.engine.session.emit({ type: "agent_start" });
    tools.engine.session.emit({
      type: "message_end",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "Checking" }, { type: "toolCall", id: "tool-1", name: "read", arguments: {} }],
        stopReason: "toolUse",
      },
    });
    await tools.adapter.flushEvents();
    expect(toolGenerator.generate).not.toHaveBeenCalled();
    await tools.shell.dispose();
  });
});
