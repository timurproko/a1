import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { fixture, residentFixture } from "./session-shell-fixture.js";

describe("resident footer session name", () => {
  it("hides the tab-chip name from a resident footer and keeps it in direct footers", async () => {
    const resident = await residentFixture({ requestDetach: async () => true });
    const direct = await fixture([], [], true);
    try {
      for (const { adapter, engine, shell } of [resident, direct]) {
        await expect(shell.submit("/name Footer Fixture")).resolves.toMatchObject({ outcome: "completed" });
        // Rationale: the engine double emits no name event, so a neutral state event delivers the renamed view.
        engine.session.emit({ type: "thinking_level_changed", level: "medium" });
        await adapter.flushEvents();
        expect(shell.view().status.footer?.sessionName).toBe("footer fixture");
      }
      const footerPath = (rows: readonly string[]) => rows.map(row => stripTerminalSequences(row).trimEnd()).find(row => row.includes("D:"));
      const residentPath = footerPath(resident.shell.root.render(100));
      const directPath = footerPath(direct.shell.root.render(100));
      expect(directPath).toMatch(/ • footer fixture$/);
      expect(residentPath).toBe(directPath!.slice(0, -" • footer fixture".length));
    } finally {
      await resident.shell.dispose();
      await direct.shell.dispose();
    }
  });
});
