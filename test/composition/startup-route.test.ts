import { describe, expect, it, vi } from "vitest";

const claims = vi.hoisted(() => ({
  claim: vi.fn(async () => ({ acknowledge: vi.fn(async () => {}), release: vi.fn(async () => {}) }) as { acknowledge: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> } | null),
}));
vi.mock("../../src/features/owned-ui/release-note-state.js", () => ({ claimReleaseNote: claims.claim }));

const { StartupReleaseNote } = await import("../../src/composition/startup-route.js");

const catalog = {
  completeMarkdown: "# All notes",
  current: (version: string) => version === "1.2.0" ? { version, markdown: "## 1.2.0" } : null,
} as never;

describe("StartupReleaseNote", () => {
  it("presents this version's note once per profile and acknowledges it once", async () => {
    const note = await StartupReleaseNote.load({ ownedSurfaces: true, releaseNotes: catalog, packageVersion: "1.2.0", profileId: "default", configDir: "/config" });
    expect(claims.claim).toHaveBeenCalledWith({ configDir: "/config", profileId: "default", version: "1.2.0" });
    const route = note.startupRoute!;
    expect(route).toMatchObject({ route: "changelog", input: { document: "## 1.2.0" } });
    await route.onClosed!();
    await note.startupRoute!.onClosed!();
    await note.settleAcknowledgement();
    const claim = await claims.claim.mock.results[0]!.value;
    expect(claim!.acknowledge).toHaveBeenCalledOnce();
    await note.releaseClaim();
    expect(claim!.release).toHaveBeenCalledOnce();
  });

  it("shows nothing without a profile, without a note for this version, or for the comparison surfaces", async () => {
    claims.claim.mockClear();
    const unprofiled = await StartupReleaseNote.load({ ownedSurfaces: true, releaseNotes: catalog, packageVersion: "1.2.0", configDir: "/config" });
    const unnoted = await StartupReleaseNote.load({ ownedSurfaces: true, releaseNotes: catalog, packageVersion: "9.9.9", profileId: "default", configDir: "/config" });
    const comparison = await StartupReleaseNote.load({ ownedSurfaces: false, releaseNotes: catalog, profileId: "default", configDir: "/config" });
    for (const note of [unprofiled, unnoted, comparison]) expect(note.startupRoute).toBeUndefined();
    expect(comparison.packageVersion).toBeNull();
    expect(comparison.catalog).toBeNull();
    expect(claims.claim).not.toHaveBeenCalled();
    await expect(unprofiled.releaseClaim()).resolves.toBeUndefined();
  });

  it("propagates a catalog that cannot resolve the running version's note, as composition always has", async () => {
    const failing = { get completeMarkdown(): string { throw new Error("unused"); }, current: () => { throw new Error("broken catalog"); } } as never;
    await expect(StartupReleaseNote.load({ ownedSurfaces: true, releaseNotes: failing, packageVersion: "1.2.0", configDir: "/config" }))
      .rejects.toThrow("broken catalog");
  });
});
