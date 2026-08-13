import { mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeAddOneProfile, PI_PROFILE_RESOURCE_DIRECTORIES } from "../../../src/features/launch/index.js";

const roots: string[] = [];
afterEach(async () => await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("AddOne profile initialization", () => {
  it("creates only the selected root and conventional resource directories", async () => {
    const home = await temporaryHome();
    const sandbox = resolve(home, ".a1", "sandbox");
    const result = await initializeAddOneProfile(sandbox);

    expect(result.root).toBe(sandbox);
    expect(result.directories).toEqual(PI_PROFILE_RESOURCE_DIRECTORIES.map(name => resolve(sandbox, name)));
    for (const path of [sandbox, ...result.directories]) expect((await stat(path)).isDirectory()).toBe(true);
    await expect(stat(resolve(home, ".a1", "agent"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(stat(resolve(home, ".pi", "agent"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("preserves all existing selected-profile content", async () => {
    const home = await temporaryHome();
    const profile = resolve(home, ".a1", "agent");
    await mkdir(resolve(profile, "extensions"), { recursive: true });
    await writeFile(resolve(profile, "settings.json"), '{"theme":"custom"}');
    await writeFile(resolve(profile, "extensions", "existing.ts"), "export {};\n");

    await initializeAddOneProfile(profile);

    await expect(readFile(resolve(profile, "settings.json"), "utf8")).resolves.toBe('{"theme":"custom"}');
    await expect(readFile(resolve(profile, "extensions", "existing.ts"), "utf8")).resolves.toBe("export {};\n");
  });

  it("rejects a file at the profile root or resource path", async () => {
    const home = await temporaryHome();
    const rootFile = resolve(home, "profile-file");
    await writeFile(rootFile, "not a directory");
    await expect(initializeAddOneProfile(rootFile)).rejects.toThrow(/not an owned directory/);

    const profile = resolve(home, ".a1", "sandbox");
    await mkdir(profile, { recursive: true });
    await writeFile(resolve(profile, "skills"), "not a directory");
    await expect(initializeAddOneProfile(profile)).rejects.toThrow(/resource path is not an owned directory/);
  });

  it("rejects symlink redirection at the profile root or resource path", async () => {
    const home = await temporaryHome();
    const target = resolve(home, "target");
    await mkdir(target);
    const profileLink = resolve(home, "profile-link");
    await symlink(target, profileLink, process.platform === "win32" ? "junction" : "dir");
    await expect(initializeAddOneProfile(profileLink)).rejects.toThrow(/not an owned directory/);

    const profile = resolve(home, ".a1", "agent");
    await mkdir(profile, { recursive: true });
    await symlink(target, resolve(profile, "prompts"), process.platform === "win32" ? "junction" : "dir");
    await expect(initializeAddOneProfile(profile)).rejects.toThrow(/resource path is not an owned directory/);
  });
});

async function temporaryHome(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "addone-profile-initialize-"));
  roots.push(root);
  return root;
}
