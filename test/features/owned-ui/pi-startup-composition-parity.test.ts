import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { captureAddOneStartup } from "./pi-addone-startup-fixture.js";
import { capturePinnedUpstreamStartup, PINNED_STARTUP_STATES } from "./pi-upstream-startup-fixture.js";

describe("independent pinned Pi startup composition parity", () => {
  it("matches separate upstream and AddOne captures at fixed widths and startup states", () => {
    for (const state of PINNED_STARTUP_STATES) {
      const upstream = capturePinnedUpstreamStartup(state);
      const addOne = captureAddOneStartup(state);
      expect(addOne, state.id).toEqual(upstream);
      expect(upstream.rows.every(row => !row.includes("\u001b")), state.id).toBe(true);
    }
  });

  it("keeps the two producers independent", async () => {
    const upstreamSource = await readFile("test/features/owned-ui/pi-upstream-startup-fixture.ts", "utf8");
    const addOneSource = await readFile("test/features/owned-ui/pi-addone-startup-fixture.ts", "utf8");
    expect(upstreamSource).not.toMatch(/PiSessionShell|pi-component-adapter|src\/features\/owned-ui/);
    expect(upstreamSource).toContain("FooterComponent");
    expect(upstreamSource).toContain("CustomEditor");
    expect(addOneSource).toContain("PiSessionShellRoot");
    expect(addOneSource).not.toContain("FooterComponent");
  });
});
