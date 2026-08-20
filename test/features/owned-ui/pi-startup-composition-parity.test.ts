import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { captureA1FooterRows, captureA1Startup } from "./pi-a1-startup-fixture.js";
import { capturePinnedUpstreamFooterRows, capturePinnedUpstreamStartup, PINNED_STARTUP_STATES } from "./pi-upstream-startup-fixture.js";

describe("independent pinned Pi startup composition parity", () => {
  it("matches separate upstream and A1 captures at fixed widths and startup states", () => {
    for (const state of PINNED_STARTUP_STATES) {
      const upstream = capturePinnedUpstreamStartup(state);
      const a1 = captureA1Startup(state);
      expect(a1, state.id).toEqual(upstream);
      expect(upstream.rows.every(row => !row.includes("\u001b")), state.id).toBe(true);
    }
  });

  it("matches raw ANSI for populated pinned footer usage and status data", () => {
    const state = PINNED_STARTUP_STATES.find(candidate => candidate.id === "populated-footer-80");
    expect(state).toBeDefined();
    expect(captureA1FooterRows(state!)).toEqual(capturePinnedUpstreamFooterRows(state!));
    expect(capturePinnedUpstreamFooterRows(state!).join("\n")).toContain("\u001b[");
  });

  it("keeps the two producers independent", async () => {
    const upstreamSource = await readFile("test/features/owned-ui/pi-upstream-startup-fixture.ts", "utf8");
    const a1Source = await readFile("test/features/owned-ui/pi-a1-startup-fixture.ts", "utf8");
    expect(upstreamSource).not.toMatch(/OwnedUiSessionShell|pi-component-adapter|src\/features\/owned-ui/);
    expect(upstreamSource).toContain("FooterComponent");
    expect(upstreamSource).toContain("CustomEditor");
    expect(a1Source).toContain("OwnedUiSessionShellRoot");
    expect(a1Source).not.toContain("FooterComponent");
  });
});
