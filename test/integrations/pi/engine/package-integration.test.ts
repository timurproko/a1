import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertAgentPackagesPort } from "../../../../src/contracts/agent-engine/index.js";
import { createPiPackagesPort } from "../../../../src/integrations/pi/engine/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

async function profile(): Promise<{ root: string; profileRoot: string; cwd: string; extension: string }> {
  const root = await mkdtemp(resolve(tmpdir(), "a1-pi-packages-"));
  roots.push(root);
  const profileRoot = resolve(root, ".a1", "agent");
  const cwd = resolve(root, "work");
  const extension = resolve(root, "extension");
  await Promise.all([mkdir(profileRoot, { recursive: true }), mkdir(cwd), mkdir(extension)]);
  await writeFile(resolve(extension, "index.js"), "export default {};\n");
  return { root, profileRoot, cwd, extension };
}

async function configuredSources(profileRoot: string): Promise<readonly unknown[]> {
  const settingsPath = resolve(profileRoot, "settings.json");
  if (!existsSync(settingsPath)) return [];
  const settings = JSON.parse(await readFile(settingsPath, "utf8")) as { packages?: unknown[] };
  return settings.packages ?? [];
}

describe("official Pi package integration", () => {
  it("satisfies the vendor-neutral packages contract", async () => {
    const { profileRoot, cwd } = await profile();
    const port = createPiPackagesPort({ profileRoot, cwd });
    expect(() => assertAgentPackagesPort(port)).not.toThrow();
    expect(port.profileRoot).toBe(profileRoot);
    expect(port.capabilities).toEqual({ install: true, remove: true, update: true, refreshModels: true });
  });

  it("installs into the given profile root, lists it, and removes it again", async () => {
    const { profileRoot, cwd, extension } = await profile();
    const progress: string[] = [];
    const port = createPiPackagesPort({ profileRoot, cwd, onProgress: event => progress.push(event.operation) });

    const installed = await port.install(extension);
    expect(installed.status).toBe("completed");
    expect(installed.source).toBe(extension);
    expect(await configuredSources(profileRoot)).toHaveLength(1);
    expect(progress).toContain("install");

    const listed = await port.list();
    expect(listed.status).toBe("completed");
    expect(listed.packages.map(entry => entry.source)).toHaveLength(1);

    const removed = await port.remove(extension);
    expect(removed.status).toBe("completed");
    expect(await configuredSources(profileRoot)).toHaveLength(0);
    expect((await port.list()).packages).toHaveLength(0);
  });

  it("writes nothing outside the profile root it was given", async () => {
    const { root, profileRoot, cwd, extension } = await profile();
    const port = createPiPackagesPort({ profileRoot, cwd });

    expect((await port.install(extension)).status).toBe("completed");

    expect(existsSync(resolve(root, ".pi"))).toBe(false);
    expect(existsSync(resolve(cwd, ".pi"))).toBe(false);
  });

  it("reports a source that is not installed here as not found rather than as a failure", async () => {
    const { profileRoot, cwd } = await profile();
    const port = createPiPackagesPort({ profileRoot, cwd });

    expect((await port.remove("npm:not-installed")).status).toBe("not-found");
    expect((await port.update("npm:not-installed")).status).toBe("not-found");
  });

  it("reports an unusable source as a failure with the reason and changes nothing", async () => {
    const { profileRoot, cwd } = await profile();
    const port = createPiPackagesPort({ profileRoot, cwd });

    const outcome = await port.install(resolve(profileRoot, "missing-extension"));
    expect(outcome.status).toBe("failed");
    expect(outcome.detail).toMatch(/does not exist/i);
    expect(await configuredSources(profileRoot)).toHaveLength(0);
  });

  it("updates every configured package when no source is named", async () => {
    const { profileRoot, cwd, extension } = await profile();
    const port = createPiPackagesPort({ profileRoot, cwd });
    expect((await port.install(extension)).status).toBe("completed");

    const outcome = await port.update();
    expect(outcome.status).toBe("completed");
    expect(outcome.source).toBeNull();
    expect(await configuredSources(profileRoot)).toHaveLength(1);
  });
});
