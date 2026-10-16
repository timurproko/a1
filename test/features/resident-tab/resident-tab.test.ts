import { describe, expect, it } from "vitest";
import { AUTO_NAME_TOKEN_BUDGETS, fallbackAutoName, generateAutoName, normalizeAutoName } from "../../../src/features/resident-tab/auto-name.js";
import { deriveResidentTabStatus } from "../../../src/features/resident-tab/status-deriver.js";
import { RESIDENT_TAB_SHORTCUTS, residentTabShortcutRegistry } from "../../../src/features/resident-tab/shortcuts.js";
import { hotkeysMarkdown, TAB_HOTKEYS } from "../../../src/integrations/pi/components/shell-presenters-info.js";

describe("resident tab auto naming", () => {
  it("normalizes and bounds names", () => {
    expect(normalizeAutoName("  Auth Refactor!! ")).toBe("auth-refactor");
    expect(normalizeAutoName("extraordinarily-long-session-title")).toBe("extraordinarily");
    expect(fallbackAutoName("Fix the login callback failure")).toBe("fix-the-login");
  });

  it("keeps strictly increasing bounded budgets that leave reasoning models room to answer", () => {
    expect(AUTO_NAME_TOKEN_BUDGETS).toEqual([4_096, 32_768]);
    expect(AUTO_NAME_TOKEN_BUDGETS.every((budget, index) => index === 0 || budget > AUTO_NAME_TOKEN_BUDGETS[index - 1]!)).toBe(true);
  });

  it("returns the first normalized answer without spending a larger budget", async () => {
    const budgets: number[] = [];
    await expect(generateAutoName("Fix login callback", async request => {
      budgets.push(request.maxTokens);
      expect(request.prompt).toContain("Fix login callback");
      return "  Login Callback Fix ";
    }, 50)).resolves.toBe("login-callback");
    expect(budgets).toEqual([4_096]);
  });

  it("escalates an answerless first attempt to the larger budget", async () => {
    const budgets: number[] = [];
    await expect(generateAutoName("Fix login callback", async request => {
      budgets.push(request.maxTokens);
      return budgets.length === 1 ? null : "auth-callback";
    }, 50)).resolves.toBe("auth-callback");
    expect(budgets).toEqual([4_096, 32_768]);
  });

  it("falls back deterministically after unusable, failing, or timed-out attempts", async () => {
    const budgets: number[] = [];
    await expect(generateAutoName("Fix login callback", async request => {
      budgets.push(request.maxTokens);
      if (budgets.length === 1) return "!!!";
      throw new Error("provider failed");
    }, 50)).resolves.toBe("fix-login");
    expect(budgets).toEqual([4_096, 32_768]);

    let aborted = 0;
    await expect(generateAutoName("Fix login callback", request => new Promise<string | null>((_, reject) => {
      request.signal.addEventListener("abort", () => { aborted++; reject(new Error("aborted")); });
    }), 5)).resolves.toBe("fix-login");
    expect(aborted).toBe(2);
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
  it("keeps startup presentation aligned with global declarations", () => {
    expect(TAB_HOTKEYS).toEqual(RESIDENT_TAB_SHORTCUTS
      .filter(shortcut => shortcut.scope === "global")
      .map(shortcut => [shortcut.id, shortcut.defaultKey, shortcut.description]));
  });

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
    // Platform: pinned Pi labels Alt as Option on macOS, so the row names the live platform's modifier.
    expect(markdown).toContain(`\`${process.platform === "darwin" ? "Option" : "Alt"}+]\` | View next A1 tab`);
    expect(markdown).toContain("Unbound | Close A1 tab");
  });

  it("labels the Alt modifier as Option only on macOS", () => {
    const platform = Object.getOwnPropertyDescriptor(process, "platform")!;
    try {
      for (const [name, modifier] of [["darwin", "Option"], ["linux", "Alt"], ["win32", "Alt"]] as const) {
        Object.defineProperty(process, "platform", { ...platform, value: name });
        const markdown = hotkeysMarkdown({ "tabs.next": ["alt+]"] }, () => [], "a1", true);
        expect(markdown, name).toContain(`| \`${modifier}+]\` | View next A1 tab |`);
        expect(markdown, name).toContain(`| \`${modifier}+A\` | New A1 tab |`);
      }
    } finally {
      Object.defineProperty(process, "platform", platform);
    }
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
