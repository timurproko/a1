import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { claimReleaseNote } from "../../../src/features/owned-ui/release-note-state.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true }))));

async function root(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "a1-release-note-state-"));
  roots.push(path);
  return path;
}

function statePath(configDir: string): string {
  return join(configDir, "release-notes", "a1.json");
}

function claimPath(configDir: string): string {
  return join(configDir, "release-notes", "a1.claim.json");
}

describe("release-note acknowledgement state", () => {
  it("claims first use, releases an unclosed presentation, and acknowledges only after close", async () => {
    const configDir = await root();
    const first = await claimReleaseNote({ configDir, profileId: "a1", version: "1.2.3", now: () => 10 });
    expect(first?.version).toBe("1.2.3");
    await first!.release();
    await expect(readFile(statePath(configDir), "utf8")).rejects.toMatchObject({ code: "ENOENT" });

    const retried = await claimReleaseNote({ configDir, profileId: "a1", version: "1.2.3", now: () => 20 });
    await retried!.acknowledge();
    expect(JSON.parse(await readFile(statePath(configDir), "utf8"))).toEqual({ version: 1, acknowledged: "1.2.3" });
    expect(await claimReleaseNote({ configDir, profileId: "a1", version: "1.2.3", now: () => 30 })).toBeNull();
  });

  it("allows only one concurrent claim for a profile", async () => {
    const configDir = await root();
    const claims = await Promise.all(Array.from({ length: 12 }, () => claimReleaseNote({
      configDir, profileId: "a1", version: "2.0.0", now: () => 100,
    })));
    expect(claims.filter(Boolean)).toHaveLength(1);
    await claims.find(Boolean)!.release();
  });

  it("recovers stale and malformed claims without accepting a live claim", async () => {
    const configDir = await root();
    await mkdir(join(configDir, "release-notes"), { recursive: true });
    await writeFile(claimPath(configDir), JSON.stringify({ version: 1, token: "old", release: "1.0.0", claimedAt: 0 }));
    const recovered = await claimReleaseNote({ configDir, profileId: "a1", version: "1.0.0", now: () => 3_700_000 });
    expect(recovered).not.toBeNull();
    await recovered!.release();

    await writeFile(claimPath(configDir), JSON.stringify({ version: 1, token: "live", release: "1.0.0", claimedAt: 3_700_000 }));
    expect(await claimReleaseNote({ configDir, profileId: "a1", version: "1.0.0", now: () => 3_700_001 })).toBeNull();
    await writeFile(claimPath(configDir), "not-json");
    const malformed = await claimReleaseNote({ configDir, profileId: "a1", version: "1.0.0", now: () => 3_700_002 });
    expect(malformed).not.toBeNull();
    await malformed!.release();
  });

  it("does not claim previews or roll acknowledgement backwards on downgrade", async () => {
    const configDir = await root();
    expect(await claimReleaseNote({ configDir, profileId: "a1", version: "2.0.0-dev" })).toBeNull();
    const newest = await claimReleaseNote({ configDir, profileId: "a1", version: "3.0.0" });
    await newest!.acknowledge();
    expect(await claimReleaseNote({ configDir, profileId: "a1", version: "2.0.0" })).toBeNull();
    expect(JSON.parse(await readFile(statePath(configDir), "utf8")).acknowledged).toBe("3.0.0");
  });

  it("treats malformed state as pending and rewrites it atomically", async () => {
    const configDir = await root();
    await mkdir(join(configDir, "release-notes"), { recursive: true });
    await writeFile(statePath(configDir), "{broken");
    const claim = await claimReleaseNote({ configDir, profileId: "a1", version: "1.0.0" });
    expect(claim).not.toBeNull();
    await claim!.acknowledge();
    expect(JSON.parse(await readFile(statePath(configDir), "utf8")).acknowledged).toBe("1.0.0");
    expect((await readdir(join(configDir, "release-notes"))).filter(name => name.endsWith(".tmp"))).toEqual([]);
  });
});
