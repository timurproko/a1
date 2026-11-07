import { describe, expect, it, vi } from "vitest";
import { composeExitText, formatSessionResumeCommand, quoteCommandArgument, SessionStopLatch } from "../../../src/app/session-shell/session-lifecycle.js";

const resume = { sessionId: "s1", sessionDir: "/data/sessions", usesDefaultSessionDir: true };

describe("session lifecycle", () => {
  it("prints nothing after a regular-screen session", () => {
    const transcript = vi.fn(() => "rows");
    expect(composeExitText({ terminalMode: "regular", customViewport: false, exitMode: "transcript", resume, transcript })).toBe("");
    expect(transcript).not.toHaveBeenCalled();
  });

  it("leaves only the resume hint for bare A1 or the resume-hint mode", () => {
    const transcript = vi.fn(() => "rows");
    const bare = composeExitText({ terminalMode: "fullscreen", customViewport: true, exitMode: "transcript", resume, transcript });
    expect(bare).toBe("\u001b[2mTo resume this session:\u001b[22m a1 --session s1");
    expect(composeExitText({ terminalMode: "fullscreen", customViewport: false, exitMode: "resume-hint", resume, transcript })).toBe(bare);
    expect(transcript).not.toHaveBeenCalled();
  });

  it("prints the pinned transcript before the hint, and either one alone when the other is empty", () => {
    expect(composeExitText({ terminalMode: "fullscreen", customViewport: false, exitMode: "transcript", resume, transcript: () => "rows" }))
      .toBe("rows\n\n\u001b[2mTo resume this session:\u001b[22m a1 --session s1");
    expect(composeExitText({ terminalMode: "fullscreen", customViewport: false, exitMode: "transcript", resume: null, transcript: () => "rows" })).toBe("rows");
  });

  it("quotes a non-default session directory for the shell", () => {
    expect(formatSessionResumeCommand({ sessionId: "s1", sessionDir: "/it's here", usesDefaultSessionDir: false }))
      .toBe("a1 --session-dir '/it'\\''s here' --session s1");
    expect(quoteCommandArgument("plain/path")).toBe("plain/path");
    expect(quoteCommandArgument("")).toBe("''");
  });

  it("resolves the stop latch once, after disposal settles either way", async () => {
    const latch = new SessionStopLatch();
    let stopped = false;
    void latch.stopped.then(() => { stopped = true; });
    latch.settleAfter(() => Promise.reject(new Error("dispose failed")));
    await latch.stopped;
    expect(stopped).toBe(true);
    latch.resolve();
  });
});
