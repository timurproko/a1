import { describe, expect, it, vi } from "vitest";
import { bindResidentTabBridge, residentStartupPresentation } from "../../src/composition/owned-ui.js";
import { formatResidentFallbackNotice } from "../../bin/tab-launch-context.js";

function fixture(start: () => Promise<boolean> = async () => true) {
  let listener: ((event: { type: string; lifecycle?: string }) => void) | null = null;
  let commandListener: ((command: { type: string; visible?: boolean }) => void) | null = null;
  let sessionName: string | undefined = "initial";
  let resume: { sessionDir: string; sessionId: string } | null = { sessionDir: "D:/sessions", sessionId: "one.jsonl" };
  let queuedSubmissions: string[] = [];
  let transcript: { kind: string; text: string }[] = [{ kind: "user", text: "Fix login please" }];
  const unsubscribe = vi.fn();
  const bridge = {
    start: vi.fn(start),
    status: vi.fn(),
    session: vi.fn(),
    prompt: vi.fn(),
    onCommand: vi.fn((value: typeof commandListener) => { commandListener = value; return vi.fn(); }),
  };
  const backend = {
    identity: { currentSessionResumeMetadata: () => resume },
    session: {
      view: () => ({
        status: { footer: { sessionName } },
        editor: { queuedSubmissions },
        transcript,
      }),
      onEvent: (value: typeof listener) => { listener = value; return unsubscribe; },
    },
    workflows: { executeWorkflow: vi.fn(async () => ({ outcome: "completed" })) },
    generateResidentTabName: vi.fn(async (_instruction: string, _maxTokens: number, _signal: AbortSignal) => "Fix Login Please"),
  };
  return {
    bridge,
    backend,
    unsubscribe,
    event: (event: { type: string; lifecycle?: string; successful?: boolean; aborted?: boolean }) => listener?.(event),
    command: (command: { type: string; visible?: boolean }) => commandListener?.(command),
    queue(...values: string[]) { queuedSubmissions = values; },
    changeSession(next: typeof resume, name?: string) { resume = next; sessionName = name; },
    rename(name: string | undefined) { sessionName = name; },
    setTranscript(blocks: typeof transcript) { transcript = blocks; },
  };
}

describe("resident tab composition bridge", () => {
  it("renders exactly one direct fallback notice and stays silent when the feature is off", () => {
    const reasons = [
      "terminal host not installed",
      "terminal host not verified",
      "incompatible generation",
      "launch not verified",
      "host startup timed out",
      "host probe failed",
    ];
    for (const reason of reasons) {
      const notice = formatResidentFallbackNotice(reason);
      expect(residentStartupPresentation(false, notice)).toEqual({
        startup: { notices: [{ kind: "warning", message: notice }] },
      });
    }
    expect(formatResidentFallbackNotice("incompatible generation")).toBe("A1 normal mode unavailable (running tabs use another version); running in single agent mode. Run `a1 tabs host stop` to restart them on this version.");
    expect(residentStartupPresentation(false)).toEqual({});
    expect(residentStartupPresentation(true, formatResidentFallbackNotice("ignored")))
      .toEqual({ startup: { quiet: true } });
  });

  it("reports starting, working, idle, and current session metadata from engine events", async () => {
    const value = fixture();
    const unsubscribe = await bindResidentTabBridge(value.bridge as never, value.backend as never);
    expect(unsubscribe).toBeTypeOf("function");
    expect(value.bridge.status).toHaveBeenCalledWith("starting");
    expect(value.bridge.session).toHaveBeenCalledWith("D:/sessions/one.jsonl", "initial", "user");

    value.event({ type: "session-lifecycle", lifecycle: "busy" });
    value.event({ type: "session-lifecycle", lifecycle: "idle" });
    value.changeSession({ sessionDir: "D:/sessions", sessionId: "two.jsonl" }, "renamed");
    value.event({ type: "session-view" });
    expect(value.bridge.status.mock.calls.map(call => call[0])).toEqual(["starting", "working", "idle", "idle"]);
    expect(value.bridge.session).toHaveBeenLastCalledWith("D:/sessions/two.jsonl", "renamed", "user");
  });

  it("reports queued input and interrupted settlement without terminal content", async () => {
    const value = fixture();
    await bindResidentTabBridge(value.bridge as never, value.backend as never);
    value.queue("queued prompt");
    value.event({ type: "session-view" });
    expect(value.bridge.status).toHaveBeenLastCalledWith("working", false, 0, 1);
    value.queue();
    value.event({ type: "agent-run-settled", successful: false, aborted: true });
    expect(value.bridge.prompt).toHaveBeenCalledWith(true);
    expect(JSON.stringify(value.bridge.status.mock.calls)).not.toContain("queued prompt");
  });

  it("applies host visibility without stopping status reporting", async () => {
    const value = fixture();
    const onVisibility = vi.fn();
    await bindResidentTabBridge(value.bridge as never, value.backend as never, null, { onVisibility });
    value.command({ type: "visibility", visible: false });
    value.event({ type: "session-lifecycle", lifecycle: "busy" });
    expect(onVisibility).toHaveBeenCalledWith(false);
    expect(value.bridge.status).toHaveBeenLastCalledWith("working", false, 0, 0);
  });

  it("names the tab while the first agent run is still working", async () => {
    const value = fixture();
    await bindResidentTabBridge(value.bridge as never, value.backend as never, null, { autoName: true });
    value.rename("agent");
    value.event({ type: "session-lifecycle", lifecycle: "busy" });
    value.event({ type: "agent-run-started" });
    await vi.waitFor(() => expect(value.backend.workflows.executeWorkflow).toHaveBeenCalledWith({
      command: "name",
      argument: "fix-login-please",
    }));
    expect(value.backend.generateResidentTabName).toHaveBeenCalledOnce();
    expect(value.backend.generateResidentTabName.mock.calls[0]?.[1]).toBe(4_096);
    expect(value.bridge.session).toHaveBeenLastCalledWith("D:/sessions/one.jsonl", "fix-login-please", "auto");

    value.event({ type: "agent-run-settled", successful: true, aborted: false });
    value.event({ type: "agent-run-started" });
    value.event({ type: "agent-run-settled", successful: true, aborted: false });
    await Promise.resolve();
    expect(value.backend.generateResidentTabName).toHaveBeenCalledOnce();
  });

  it("waits for the run's projected prompt and ignores busy states outside an agent run", async () => {
    const value = fixture();
    value.setTranscript([]);
    await bindResidentTabBridge(value.bridge as never, value.backend as never, null, { autoName: true });
    value.rename("agent 2");
    value.event({ type: "session-lifecycle", lifecycle: "busy" });
    value.event({ type: "session-lifecycle", lifecycle: "idle" });
    value.event({ type: "agent-run-started" });
    value.event({ type: "session-view" });
    expect(value.backend.generateResidentTabName).not.toHaveBeenCalled();
    value.setTranscript([{ kind: "user", text: "Fix login please" }]);
    value.event({ type: "transcript-block" });
    await vi.waitFor(() => expect(value.backend.workflows.executeWorkflow).toHaveBeenCalledOnce());
    expect(value.backend.generateResidentTabName).toHaveBeenCalledOnce();
  });

  it("does not attempt naming when disabled, already user-named, or outside a run", async () => {
    const disabled = fixture();
    await bindResidentTabBridge(disabled.bridge as never, disabled.backend as never);
    disabled.rename("agent");
    disabled.event({ type: "agent-run-started" });

    const named = fixture();
    await bindResidentTabBridge(named.bridge as never, named.backend as never, null, { autoName: true });
    named.event({ type: "agent-run-started" });

    const idle = fixture();
    await bindResidentTabBridge(idle.bridge as never, idle.backend as never, null, { autoName: true });
    idle.rename("agent");
    idle.event({ type: "transcript-block" });
    idle.event({ type: "session-view" });

    await new Promise(resolve => setTimeout(resolve, 0));
    for (const value of [disabled, named, idle]) {
      expect(value.backend.generateResidentTabName).not.toHaveBeenCalled();
      expect(value.backend.workflows.executeWorkflow).not.toHaveBeenCalled();
    }
  });

  it("keeps a manual rename made while generation is pending", async () => {
    const value = fixture();
    let finish!: (name: string) => void;
    value.backend.generateResidentTabName.mockImplementationOnce(() => new Promise<string>(resolve => { finish = resolve; }));
    await bindResidentTabBridge(value.bridge as never, value.backend as never, null, { autoName: true });
    value.rename("agent");
    value.event({ type: "agent-run-started" });
    await vi.waitFor(() => expect(value.backend.generateResidentTabName).toHaveBeenCalledOnce());
    value.rename("auth-work");
    value.event({ type: "session-view" });
    finish("Fix Login Please");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(value.backend.workflows.executeWorkflow).not.toHaveBeenCalled();
    expect(value.bridge.session).toHaveBeenLastCalledWith("D:/sessions/one.jsonl", "auth-work", "user");
    expect(value.bridge.session).not.toHaveBeenCalledWith(expect.anything(), "fix-login-please", "auto");
  });

  it("keeps composition available when the bridge refuses startup", async () => {
    const value = fixture(async () => { throw new Error("unavailable"); });
    const unsubscribe = await bindResidentTabBridge(value.bridge as never, value.backend as never);
    expect(unsubscribe).toBeTypeOf("function");
    expect(value.bridge.status).toHaveBeenCalledWith("starting");
    expect(value.bridge.session).toHaveBeenCalledOnce();
  });
});
