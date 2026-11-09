import { describe, expect, it, vi } from "vitest";
import type { OwnedUiExtensionUiPort } from "../../../src/contracts/owned-ui/index.js";
import { TestPresentationTerminal } from "../../features/owned-ui/neutral-port-doubles.js";
import { fixture, nextImmediate, secondPresenter, Session } from "./session-shell-fixture.js";

function titleFixture(name?: string, customViewport = true) {
  return fixture([], [], customViewport, undefined, undefined, undefined, undefined, undefined, undefined,
    engine => { engine.session.name = name; });
}

function extensionUi(session: Session): OwnedUiExtensionUiPort {
  return (session.extensionBindings as { uiContext: OwnedUiExtensionUiPort }).uiContext;
}

describe("session terminal titles", () => {
  it.each([
    [undefined, "a1"],
    ["home dir settings", "home dir settings"],
    ["  café 👩‍💻  work  ", "café 👩‍💻  work"],
    [" \t\r\n\u0000\u007f\u009c\u2028\u2029 ", "a1"],
    ["before\u001b]0;injected\u0007after\r\nnext\tline\u0085end\u2028done\u2029ok", "before ]0;injected after next line end done ok"],
  ])("publishes a safe initial title for %j only after terminal startup", async (name, expected) => {
    const running: boolean[] = [];
    const original = TestPresentationTerminal.prototype.setTitle;
    const publish = vi.spyOn(TestPresentationTerminal.prototype, "setTitle").mockImplementation(function (this: TestPresentationTerminal, title) {
      running.push(this.active);
      original.call(this, title);
    });
    const { engine, terminal, shell } = await titleFixture(name);
    try {
      expect(terminal.titles).toEqual([expected]);
      expect(running).toEqual([true]);
      expect(engine.session.name).toBe(name);
      shell.start();
      shell.root.render(80);
      expect(terminal.titles).toEqual([expected]);
    } finally { await shell.dispose(); publish.mockRestore(); }
  });

  it("publishes normalized owned renames once, even with duplicate metadata views", async () => {
    const { engine, adapter, terminal, shell } = await titleFixture();
    try {
      // Compatibility: fake sessions without Pi events still need explicit workflow publication.
      await shell.submit("/name Direct Name");
      await adapter.flushEvents();
      expect(terminal.titles).toEqual(["a1", "direct name"]);
      const setName = engine.session.setSessionName.bind(engine.session);
      vi.spyOn(engine.session, "setSessionName").mockImplementation(name => {
        setName(name);
        engine.session.emit({ type: "session_info_changed", name: engine.session.name });
      });
      await shell.submit("/name Next Name");
      await adapter.flushEvents();
      expect(terminal.titles).toEqual(["a1", "direct name", "next name"]);
      await shell.submit("/name Next Name");
      await adapter.flushEvents();
      expect(terminal.titles).toEqual(["a1", "direct name", "next name"]);
    } finally { await shell.dispose(); }
  });

  it("follows public metadata changes and clearing without rewriting equivalent normalized names", async () => {
    const { engine, adapter, terminal, shell } = await titleFixture("first");
    try {
      for (const name of ["  café 👩‍💻 work  ", "café 👩‍💻 work", undefined]) {
        engine.session.name = name;
        engine.session.emit({ type: "session_info_changed", name: "ignored payload" });
        await adapter.flushEvents();
      }
      expect(terminal.titles).toEqual(["first", "café 👩‍💻 work", "a1"]);
    } finally { await shell.dispose(); }
  });

  it("leaves an extension title untouched through unrelated views, status, model, usage, and streaming", async () => {
    const { engine, adapter, terminal, shell } = await titleFixture("core");
    try {
      extensionUi(engine.session).setTitle("Working...");
      expect(terminal.titles).toEqual(["core", "Working..."]);
      const message = { role: "assistant", content: [{ type: "text", text: "reply" }], timestamp: 1, usage: { input: 10, output: 2 } };
      for (const event of [
        { type: "session_info_changed", name: "core" },
        { type: "agent_start" },
        { type: "message_start", message },
        { type: "message_update", message, assistantMessageEvent: { type: "text_delta", delta: "reply" } },
        { type: "message_end", message },
        { type: "thinking_level_changed", level: "high" },
        { type: "agent_settled" },
      ]) engine.session.emit(event);
      await adapter.flushEvents();
      await shell.cycleModel("forward");
      await adapter.flushEvents();
      expect(terminal.titles).toEqual(["core", "Working..."]);
      await shell.submit("/name Restored");
      await adapter.flushEvents();
      expect(terminal.titles).toEqual(["core", "Working...", "restored"]);
    } finally { await shell.dispose(); }
  });

  it.each(["new", "resume", "fork", "clone"] as const)("updates the title when %s binds a different session", async command => {
    const { engine, adapter, terminal, shell } = await titleFixture("original");
    const replacement = new Session();
    replacement.name = command === "new" ? undefined : `${command} session`;
    const rebind = vi.fn(async () => { await engine.rebindSession!(replacement); });
    engine.newSession = rebind;
    engine.switchSession = rebind;
    Object.assign(engine, { fork: rebind });
    Object.assign(engine.session.sessionManager, { getLeafId: () => "entry-1" });
    try {
      const result = await shell.runWorkflow({ command, argument: "", selection: "entry-1" });
      await adapter.flushEvents();
      expect(result.outcome).toBe("completed");
      expect(rebind).toHaveBeenCalledOnce();
      expect(terminal.titles).toEqual(["original", replacement.name ?? "a1"]);
      const sameName = new Session();
      sameName.name = replacement.name;
      await engine.rebindSession!(sameName);
      await adapter.flushEvents();
      expect(terminal.titles).toEqual(["original", replacement.name ?? "a1"]);
    } finally { await shell.dispose(); }
  });

  it("keeps comparison startup and name changes free of automatic titles while allowing extension titles", async () => {
    const { engine, adapter, terminal, shell } = await titleFixture("comparison", false);
    try {
      expect(terminal.titles).toEqual([]);
      extensionUi(engine.session).setTitle("Extension title");
      await shell.submit("/name Other Name");
      engine.session.emit({ type: "session_info_changed", name: "other name" });
      await adapter.flushEvents();
      shell.activated();
      expect(terminal.titles).toEqual(["Extension title"]);
    } finally { await shell.dispose(); }
  });

  it("publishes only the active presenter's latest title and restores titles on reattachment", async () => {
    const { engine, terminal, shell } = await titleFixture("first");
    const second = await secondPresenter(shell, terminal);
    try {
      second.engine.session.name = "second";
      second.presenter.start();
      await second.adapter.session.flushEvents();
      expect(terminal.titles).toEqual(["first"]);
      second.engine.session.name = "latest second";
      second.engine.session.emit({ type: "session_info_changed" });
      await second.adapter.session.flushEvents();
      expect(terminal.titles).toEqual(["first"]);
      shell.terminalHost.attach(second.presenter);
      expect(terminal.titles).toEqual(["first", "latest second"]);
      // Invariant: detached extensions cannot take terminal ownership either.
      extensionUi(engine.session).setTitle("inactive extension");
      expect(terminal.titles).toEqual(["first", "latest second"]);
      shell.terminalHost.attach(shell);
      extensionUi(engine.session).setTitle("Working...");
      shell.terminalHost.attach(second.presenter);
      shell.terminalHost.attach(shell);
      expect(terminal.titles).toEqual(["first", "latest second", "first", "Working...", "latest second", "first"]);
      await second.presenter.dispose();
      second.engine.session.emit({ type: "session_info_changed", name: "closed" });
      second.presenter.activated();
      await nextImmediate();
      expect(terminal.titles.at(-1)).toBe("first");
      expect(terminal.titles).toHaveLength(6);
    } finally { await shell.dispose(); }
  });

  it("does not publish on attachment before presenter startup or after disconnection", async () => {
    const { terminal, shell } = await titleFixture("first");
    const second = await secondPresenter(shell, terminal);
    try {
      second.engine.session.name = "second";
      shell.terminalHost.attach(second.presenter);
      expect(terminal.titles).toEqual(["first"]);
      second.presenter.start();
      expect(terminal.titles).toEqual(["first", "second"]);
      shell.terminalHost.attach(shell);
      shell.terminalHost.disconnect(second.presenter);
      second.engine.session.name = "disconnected";
      second.engine.session.emit({ type: "session_info_changed" });
      await second.adapter.session.flushEvents();
      second.presenter.activated();
      expect(terminal.titles).toEqual(["first", "second", "first"]);
    } finally {
      await second.presenter.dispose();
      await shell.dispose();
    }
  });
});
