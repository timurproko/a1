import { describe, expect, it } from "vitest";
import { deriveResidentTabStatus } from "../../../src/features/resident-tab/status-deriver.js";
import { RESIDENT_TAB_SHORTCUTS, residentTabShortcutRegistry } from "../../../src/features/resident-tab/shortcuts.js";

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

  it("provides only the approved global defaults", () => {
    const registry = residentTabShortcutRegistry();
    expect(registry.resolve("alt+a", "global")).toBe("tabs.new");
    expect(registry.resolve("alt+w", "global")).toBe("tabs.close");
    expect(registry.resolve("f2", "global")).toBe("tabs.rename");
    expect(registry.resolve("r", "global")).toBeNull();
    expect(registry.resolve("r", "failed-banner")).toBe("tabs.retry");
  });
});
