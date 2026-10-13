import { describe, expect, it, vi } from "vitest";
import { bindResidentTabBridge, residentStartupPresentation } from "../../src/composition/owned-ui.js";
import { formatResidentFallbackNotice } from "../../bin/tab-launch-context.js";

function fixture(start: () => Promise<boolean> = async () => true) {
  let listener: ((event: { type: string; lifecycle?: string }) => void) | null = null;
  let sessionName: string | undefined = "initial";
  let resume: { sessionDir: string; sessionId: string } | null = { sessionDir: "D:/sessions", sessionId: "one.jsonl" };
  const unsubscribe = vi.fn();
  const bridge = {
    start: vi.fn(start),
    status: vi.fn(),
    session: vi.fn(),
  };
  const backend = {
    identity: { currentSessionResumeMetadata: () => resume },
    session: {
      view: () => ({ status: { footer: { sessionName } } }),
      onEvent: (value: typeof listener) => { listener = value; return unsubscribe; },
    },
  };
  return {
    bridge,
    backend,
    unsubscribe,
    event: (event: { type: string; lifecycle?: string }) => listener?.(event),
    changeSession(next: typeof resume, name?: string) { resume = next; sessionName = name; },
  };
}

describe("resident tab composition bridge", () => {
  it("renders exactly one direct fallback notice and stays silent when the feature is off", () => {
    const reasons = [
      "terminal host not installed",
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
    expect(residentStartupPresentation(false)).toEqual({});
    expect(residentStartupPresentation(true, formatResidentFallbackNotice("ignored")))
      .toEqual({ startup: { quiet: true } });
  });

  it("reports starting, working, idle, and current session metadata from engine events", async () => {
    const value = fixture();
    await expect(bindResidentTabBridge(value.bridge as never, value.backend as never)).resolves.toBe(value.unsubscribe);
    expect(value.bridge.status).toHaveBeenCalledWith("starting");
    expect(value.bridge.session).toHaveBeenCalledWith("D:/sessions/one.jsonl", "initial", "user");

    value.event({ type: "session-lifecycle", lifecycle: "busy" });
    value.event({ type: "session-lifecycle", lifecycle: "idle" });
    value.changeSession({ sessionDir: "D:/sessions", sessionId: "two.jsonl" }, "renamed");
    value.event({ type: "session-view" });
    expect(value.bridge.status.mock.calls.map(call => call[0])).toEqual(["starting", "working", "idle", "idle"]);
    expect(value.bridge.session).toHaveBeenLastCalledWith("D:/sessions/two.jsonl", "renamed", "user");
  });

  it("keeps composition available when the bridge refuses startup", async () => {
    const value = fixture(async () => { throw new Error("unavailable"); });
    await expect(bindResidentTabBridge(value.bridge as never, value.backend as never)).resolves.toBe(value.unsubscribe);
    expect(value.bridge.status).toHaveBeenCalledWith("starting");
    expect(value.bridge.session).toHaveBeenCalledOnce();
  });
});
