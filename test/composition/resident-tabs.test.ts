import { describe, expect, it, vi } from "vitest";
import { bindResidentTabBridge, residentStartupPresentation } from "../../src/composition/owned-ui.js";
import { formatResidentFallbackNotice } from "../../bin/tab-launch-context.js";

function fixture(start: () => Promise<boolean> = async () => true) {
  let listener: ((event: { type: string; lifecycle?: string }) => void) | null = null;
  let commandListener: ((command: { type: string; visible?: boolean }) => void) | null = null;
  let sessionName: string | undefined = "initial";
  let resume: { sessionDir: string; sessionId: string } | null = { sessionDir: "D:/sessions", sessionId: "one.jsonl" };
  let queuedSubmissions: string[] = [];
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
        transcript: [{ kind: "user", text: "Fix login please" }],
      }),
      onEvent: (value: typeof listener) => { listener = value; return unsubscribe; },
    },
    workflows: { executeWorkflow: vi.fn(async () => ({ outcome: "completed" })) },
    generateResidentTabName: vi.fn(async () => "Fix Login Please"),
  };
  return {
    bridge,
    backend,
    unsubscribe,
    event: (event: { type: string; lifecycle?: string; successful?: boolean; aborted?: boolean }) => listener?.(event),
    command: (command: { type: string; visible?: boolean }) => commandListener?.(command),
    queue(...values: string[]) { queuedSubmissions = values; },
    changeSession(next: typeof resume, name?: string) { resume = next; sessionName = name; },
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

  it("accepts host visibility without pausing the tab or interrupting status reporting", async () => {
    const value = fixture();
    await bindResidentTabBridge(value.bridge as never, value.backend as never);
    value.command({ type: "visibility", visible: false });
    value.event({ type: "session-lifecycle", lifecycle: "busy" });
    expect(value.bridge.status).toHaveBeenLastCalledWith("working", false, 0, 0);
    value.command({ type: "visibility", visible: true });
    value.event({ type: "session-lifecycle", lifecycle: "idle" });
    expect(value.bridge.status).toHaveBeenLastCalledWith("idle", false, 0, 0);
    // Invariant: visibility is a no-op for the child; it neither renames nor stops the session.
    expect(value.backend.workflows.executeWorkflow).not.toHaveBeenCalled();
  });

  it("generates and persists one bounded automatic name after the first settled turn", async () => {
    const value = fixture();
    await bindResidentTabBridge(value.bridge as never, value.backend as never, null, { autoName: true });
    value.changeSession({ sessionDir: "D:/sessions", sessionId: "one.jsonl" }, "agent");
    value.event({ type: "session-lifecycle", lifecycle: "busy" });
    value.event({ type: "session-lifecycle", lifecycle: "idle" });
    await vi.waitFor(() => expect(value.backend.workflows.executeWorkflow).toHaveBeenCalledWith({
      command: "name",
      argument: "fix-login-please",
    }));
    expect(value.backend.generateResidentTabName).toHaveBeenCalledOnce();
    expect(value.bridge.session).toHaveBeenLastCalledWith("D:/sessions/one.jsonl", "fix-login-please", "auto");
  });

  it("keeps composition available when the bridge refuses startup", async () => {
    const value = fixture(async () => { throw new Error("unavailable"); });
    const unsubscribe = await bindResidentTabBridge(value.bridge as never, value.backend as never);
    expect(unsubscribe).toBeTypeOf("function");
    expect(value.bridge.status).toHaveBeenCalledWith("starting");
    expect(value.bridge.session).toHaveBeenCalledOnce();
  });
});
