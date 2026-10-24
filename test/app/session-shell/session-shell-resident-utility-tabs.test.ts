import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { fixture, residentFixture } from "./session-shell-fixture.js";

describe("resident utility tab commands", () => {
  it("refuses /settings and /changelog in a resident Agent and points to their tabs", async () => {
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
    } finally {
      await shell.dispose();
    }
  });

  it("hides the utility tab commands from resident autocomplete but not from direct A1", async () => {
    const resident = await residentFixture({ requestDetach: async () => true });
    const direct = await fixture([], [], true);
    try {
      const suggestions = async (shell: typeof direct.shell, terminal: typeof direct.terminal) => {
        terminal.input("/chan");
        await new Promise(resolve => setTimeout(resolve, 20));
        shell.runtime.renderNow();
        return shell.root.render(100).map(row => stripTerminalSequences(row)).join("\n");
      };
      expect(await suggestions(direct.shell, direct.terminal)).toContain("changelog");
      expect(await suggestions(resident.shell, resident.terminal)).not.toContain("changelog");
    } finally {
      await resident.shell.dispose();
      await direct.shell.dispose();
    }
  });
});
