import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { captureOwnedFooterRows, captureOwnedStartup } from "./pi-startup-fixture.js";
import { capturePinnedUpstreamFooterRows, capturePinnedUpstreamStartup, PINNED_STARTUP_STATES } from "./pi-upstream-startup-fixture.js";

describe("independent pinned Pi startup composition parity", () => {
  it("matches separate upstream and A1 captures at fixed widths and startup states", () => {
    for (const state of PINNED_STARTUP_STATES) {
      const upstream = capturePinnedUpstreamStartup(state);
      const owned = captureOwnedStartup(state);
      expect(owned, state.id).toEqual(upstream);
      expect(upstream.rows.every(row => !row.includes("\u001b")), state.id).toBe(true);
    }
  });

  it("matches raw ANSI for populated pinned footer usage and status data", () => {
    const state = PINNED_STARTUP_STATES.find(candidate => candidate.id === "populated-footer-80");
    expect(state).toBeDefined();
    expect(captureOwnedFooterRows(state!)).toEqual(capturePinnedUpstreamFooterRows(state!));
    expect(capturePinnedUpstreamFooterRows(state!).join("\n")).toContain("\u001b[");
  });

  it("keeps the two producers independent", async () => {
    const upstreamSource = await readFile("test/features/owned-ui/pi-upstream-startup-fixture.ts", "utf8");
    const ownedSource = await readFile("test/features/owned-ui/pi-startup-fixture.ts", "utf8");
    expect(upstreamSource).not.toMatch(/OwnedUiSessionShell|pi-component-adapter|src\/features\/owned-ui/);
    expect(upstreamSource).toContain("FooterComponent");
    expect(upstreamSource).toContain("CustomEditor");
    expect(ownedSource).toContain("OwnedUiSessionShellRoot");
    expect(ownedSource).not.toContain("FooterComponent");
  });
});
