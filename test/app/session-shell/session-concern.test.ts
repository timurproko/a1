import { describe, expect, it } from "vitest";
import { SessionConcerns } from "../../../src/app/session-shell/session-concern.js";

describe("SessionConcerns", () => {
  it("fans session replacement and disposal out in the declared order", () => {
    const calls: string[] = [];
    const concerns = new SessionConcerns([
      { onSessionReplaced: () => calls.push("copy"), dispose: () => calls.push("dispose copy") },
      { onSessionReplaced: () => calls.push("pastes") },
      { dispose: () => calls.push("dispose dialogs") },
    ]);
    concerns.replaceSession();
    concerns.dispose();
    expect(calls).toEqual(["copy", "pastes", "dispose copy", "dispose dialogs"]);
  });

  it("disposes once, keeps going past a failing concern, and ignores replacement afterwards", () => {
    const calls: string[] = [];
    const failures: unknown[] = [];
    const concerns = new SessionConcerns([
      { dispose: () => { throw new Error("first"); } },
      { onSessionReplaced: () => calls.push("replaced"), dispose: () => calls.push("second") },
    ]);
    const attempt = (action: () => void) => { try { action(); } catch (error) { failures.push(error); } };
    concerns.dispose(attempt);
    concerns.dispose(attempt);
    concerns.replaceSession();
    expect(calls).toEqual(["second"]);
    expect(failures).toHaveLength(1);
  });
});
