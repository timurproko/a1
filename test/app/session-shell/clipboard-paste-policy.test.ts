import { describe, expect, it } from "vitest";
import { nativePasteAccess } from "../../../src/app/session-shell/clipboard-paste-policy.js";
import { responseCopyDestination } from "../../../src/app/session-shell/response-copy-policy.js";

describe("independent native paste access", () => {
  it.each([{}, { HC_TERMINAL_ID: "", TERM_PROGRAM: "" }, { TERM_PROGRAM: "ghostty" }])("retains native full-content access for %j", env => {
    expect(nativePasteAccess(env)).toBe("content");
    expect(responseCopyDestination(env)).toBe("native");
  });

  it.each([
    { HC_TERMINAL_ID: "id" }, { HC_TERMINAL_ID: "id", TERM_PROGRAM: "ghostty" },
    { HC_TERMINAL_ID: "id", TERM_PROGRAM: "herdr" }, { HC_TERMINAL_ID: "id", TERM_PROGRAM: "" },
    { TERM_PROGRAM: "herdr" }, { HC_TERMINAL_ID: "", TERM_PROGRAM: "herdr" },
  ])("permits raw host images without changing terminal copy for %j", env => {
    // Policy exception, not locality inference: markerless remote raw keys receive this access too.
    expect(nativePasteAccess(env)).toBe("image");
    expect(responseCopyDestination(env)).toBe("terminal");
  });

  it.each(["SSH_CONNECTION", "SSH_CLIENT", "SSH_TTY", "TMUX", "STY", "WSL_DISTRO_NAME"])("retains %s restrictions with and without Herdr", marker => {
    for (const identity of [{}, { HC_TERMINAL_ID: "id", TERM_PROGRAM: "ghostty" }, { TERM_PROGRAM: "herdr" }]) {
      const env = { ...identity, [marker]: "present" };
      expect(nativePasteAccess(env)).toBe("denied");
      expect(responseCopyDestination(env)).toBe("terminal");
    }
  });
});
