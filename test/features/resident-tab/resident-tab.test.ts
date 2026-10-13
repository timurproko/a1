import { describe, expect, it } from "vitest";
import { fallbackAutoName, generateAutoName, normalizeAutoName } from "../../../src/features/resident-tab/auto-name.js";
import { deriveResidentTabStatus } from "../../../src/features/resident-tab/status-deriver.js";
import { RESIDENT_TAB_SHORTCUTS, residentTabShortcutRegistry } from "../../../src/features/resident-tab/shortcuts.js";
import { hotkeysMarkdown } from "../../../src/integrations/pi/components/shell-presenters-info.js";

describe("resident tab auto naming", () => {
  it("normalizes and bounds names", () => {
    expect(normalizeAutoName("  Auth Refactor!! ")).toBe("auth-refactor");
    expect(normalizeAutoName("extraordinarily-long-session-title")).toBe("extraordinarily");
    expect(fallbackAutoName("Fix the login callback failure")).toBe("fix-the-login");
  });

  it("retries once before deterministic fallback", async () => {
    let calls = 0;
    await expect(generateAutoName("Fix login callback", async request => {
      calls++;
      expect(request.maxTokens).toBe(64);
      return null;
    }, 50)).resolves.toBe("fix-login");
    expect(calls).toBe(2);
  });
});

describe("resident tab status", () => {
  it("prioritizes failures, requests, work, and unseen completion", () => {
    expect(deriveResidentTabStatus({ lifecycle: "failed", pendingRequests: 1, queuedInput: 1 })).toBe("failed");
    expect(deriveResidentTabStatus({ lifecycle: "idle", pendingRequests: 1, queuedInput: 0 })).toBe("needs-input");
    expect(deriveResidentTabStatus({ lifecycle: "idle", pendingRequests: 0, queuedInput: 1 })).toBe("working");
    expect(deriveResidentTabStatus({ lifecycle: "idle", pendingRequests: 0, queuedInput: 0, settledUnseen: true })).toBe("done-unseen");
  });
});

describe("resident tab shortcuts", () => {
  it("leaves navigation and reorder assignable but unbound", () => {
    for (const id of ["tabs.next", "tabs.previous", "tabs.moveRight", "tabs.moveLeft"] as const) {
      expect(RESIDENT_TAB_SHORTCUTS.find(shortcut => shortcut.id === id)?.defaultKey).toBeNull();
    }
    expect(residentTabShortcutRegistry({ "tabs.next": "alt+]" }).resolve("alt+]", "global")).toBe("tabs.next");
  });

  it("lists effective assignments and suppresses conflicts in resident hotkeys", () => {
    const markdown = hotkeysMarkdown({
      "tabs.next": ["alt+]"],
      "tabs.close": ["ctrl+x"],
      "tui.editor.deleteToLineEnd": ["ctrl+x"],
    }, () => [], "a1", true);
    expect(markdown).toContain("**Tabs**");
    expect(markdown).toContain("`Alt+]` | View next A1 tab");
    expect(markdown).toContain("Unbound | Close A1 tab");
  });

  it("provides only the approved global defaults", () => {
    const registry = residentTabShortcutRegistry();
    expect(registry.resolve("alt+a", "global")).toBe("tabs.new");
    expect(registry.resolve("alt+w", "global")).toBe("tabs.close");
    expect(registry.resolve("f2", "global")).toBe("tabs.rename");
    expect(registry.resolve("r", "global")).toBeNull();
    expect(registry.resolve("r", "failed-banner")).toBe("tabs.retry");
  });
});
