import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { fixture, residentFixture } from "./session-shell-fixture.js";

describe("resident utility tab commands", () => {
  it("refuses /settings, /changelog, and /name in a resident Agent and points to the tab bar", async () => {
    const { shell } = await residentFixture({ requestDetach: async () => true });
    try {
      await expect(shell.submit("/changelog")).resolves.toEqual({
        outcome: "rejected",
        diagnostic: "The changelog opens as its own tab from the command palette (Alt+/).",
      });
      await expect(shell.submit("/settings")).resolves.toEqual({
        outcome: "rejected",
        diagnostic: "Settings is available from the global Settings tab.",
      });
      await expect(shell.submit("/name Release")).resolves.toEqual({
        outcome: "rejected",
        diagnostic: "Rename the session by renaming its tab (F2).",
      });
    } finally {
      await shell.dispose();
    }
  });

  it.each([
    ["/chan", "changelog"],
    ["/nam", "Set session display name"],
  ])("hides %s from resident autocomplete but not from direct A1", async (input, row) => {
    const resident = await residentFixture({ requestDetach: async () => true });
    const direct = await fixture([], [], true);
    try {
      const suggestions = async (shell: typeof direct.shell, terminal: typeof direct.terminal) => {
        terminal.input(input);
        await new Promise(resolve => setTimeout(resolve, 20));
        shell.runtime.renderNow();
        return shell.root.render(100).map(row => stripTerminalSequences(row)).join("\n");
      };
      expect(await suggestions(direct.shell, direct.terminal)).toContain(row);
      expect(await suggestions(resident.shell, resident.terminal)).not.toContain(row);
    } finally {
      await resident.shell.dispose();
      await direct.shell.dispose();
    }
  });
});
