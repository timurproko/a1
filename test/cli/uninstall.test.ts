import { afterEach, describe, expect, it } from "vitest";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { runUninstall, type UninstallDependencies } from "../../src/cli/uninstall.js";
import { PRODUCT_IDENTITY } from "../../src/product-identity.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(async root => await rm(root, { recursive: true, force: true }))); });

async function machine() {
  const root = await mkdtemp(resolve(tmpdir(), "a1-uninstall-"));
  roots.push(root);
  const home = resolve(root, "home");
  const dataDir = resolve(root, "data");
  const configDir = resolve(root, "config");
  const runtimeDir = resolve(root, "runtime");
  const packageRoot = resolve(root, "prefix", "lib", "node_modules", "@timurproko", "a1");
  const profileHome = resolve(home, ".a1");
  for (const directory of [packageRoot, resolve(dataDir, "releases", "0.2.7-dev.1"), resolve(dataDir, "releases", "0.2.7-dev.2"),
    configDir, runtimeDir, resolve(profileHome, "agent", "sessions")]) await mkdir(directory, { recursive: true });
  await writeFile(resolve(profileHome, "agent", "settings.json"), "{}\n");
  const environment: NodeJS.ProcessEnv = {
    HOME: home,
    [PRODUCT_IDENTITY.environment.dataDir]: dataDir,
    [PRODUCT_IDENTITY.environment.configDir]: configDir,
    [PRODUCT_IDENTITY.environment.runtimeDir]: runtimeDir,
  };
  const events: string[] = [];
  const stdout: string[] = [];
  const stderr: string[] = [];
  const dependencies: UninstallDependencies = {
    packageRoot, environment, home, platform: "linux",
    output: { stdout: message => { stdout.push(message); }, stderr: message => { stderr.push(message); } },
    stopResidentHost: async releaseRoot => { events.push(`host-stop:${releaseRoot.split("/").at(-1)}`); },
    stopSupervisors: async () => { events.push("supervisors"); },
    removePackage: async () => { events.push("package"); },
  };
  return { dataDir, configDir, runtimeDir, profileHome, events, stdout, stderr, dependencies };
}

const exists = async (path: string) => await access(path).then(() => true, () => false);

describe("a1 uninstall", () => {
  it("stops every release host and supervisor before removing the package and A1 state", async () => {
    const setup = await machine();
    await expect(runUninstall({ yes: true, purge: false }, setup.dependencies)).resolves.toBe(0);
    expect(setup.events).toEqual(["host-stop:0.2.7-dev.1", "host-stop:0.2.7-dev.2", "supervisors", "package"]);
    for (const path of [setup.dataDir, setup.configDir, setup.runtimeDir]) expect(await exists(path)).toBe(false);
    expect(await exists(resolve(setup.profileHome, "agent", "settings.json"))).toBe(true);
    expect(setup.stdout.join("")).toBe(`a1 uninstalled; your sessions and settings remain in ${setup.profileHome}\n`);
  });

  it("purges sessions and settings only when asked", async () => {
    const setup = await machine();
    await expect(runUninstall({ yes: true, purge: true }, setup.dependencies)).resolves.toBe(0);
    expect(await exists(setup.profileHome)).toBe(false);
    expect(setup.stdout.join("")).toBe("a1 uninstalled\n");
  });

  it("asks before removing anything and asks separately about user data", async () => {
    const setup = await machine();
    const questions: string[] = [];
    const answers = [true, false];
    await expect(runUninstall({ yes: false, purge: false }, {
      ...setup.dependencies,
      confirm: async question => { questions.push(question); return answers.shift() ?? false; },
    })).resolves.toBe(0);
    expect(questions).toEqual([
      "Remove a1 from this machine? Running Agents will stop. [y/N] ",
      `Also delete your sessions, settings, and sign-ins in ${setup.profileHome}? [y/N] `,
    ]);
    expect(await exists(setup.profileHome)).toBe(true);
  });

  it("removes nothing when the user declines", async () => {
    const setup = await machine();
    await expect(runUninstall({ yes: false, purge: false }, { ...setup.dependencies, confirm: async () => false })).resolves.toBe(1);
    expect(setup.events).toEqual([]);
    expect(await exists(setup.dataDir)).toBe(true);
    expect(setup.stdout.join("")).toBe("a1 was not removed\n");
  });

  it("requires --yes without a terminal", async () => {
    const setup = await machine();
    await expect(runUninstall({ yes: false, purge: false }, setup.dependencies)).resolves.toBe(2);
    expect(setup.events).toEqual([]);
    expect(setup.stderr.join("")).toContain("a1 uninstall --yes");
  });

  it("refuses to run inside an A1 tab it would stop", async () => {
    const setup = await machine();
    const environment = { ...setup.dependencies.environment, [PRODUCT_IDENTITY.environment.tabId]: "tab-1" };
    await expect(runUninstall({ yes: true, purge: true }, { ...setup.dependencies, environment })).resolves.toBe(1);
    expect(setup.events).toEqual([]);
    expect(await exists(setup.dataDir)).toBe(true);
  });

  it("refuses a checkout that is not a managed global installation", async () => {
    const setup = await machine();
    await expect(runUninstall({ yes: true, purge: false }, { ...setup.dependencies, packageRoot: "/work/a1" })).resolves.toBe(1);
    expect(setup.events).toEqual([]);
  });

  it("never removes the home directory through a state-root override", async () => {
    const setup = await machine();
    const removed: string[] = [];
    const home = setup.dependencies.home ?? "";
    const environment = { ...setup.dependencies.environment, [PRODUCT_IDENTITY.environment.configDir]: home };
    await runUninstall({ yes: true, purge: false }, { ...setup.dependencies, environment, remove: async path => { removed.push(path); } });
    expect(removed).not.toContain(home);
    expect(removed).toContain(setup.dataDir);
  });

  it("keeps A1 state when npm cannot remove the package", async () => {
    const setup = await machine();
    await expect(runUninstall({ yes: true, purge: false }, {
      ...setup.dependencies,
      removePackage: async () => { throw new Error("EACCES"); },
    })).resolves.toBe(1);
    expect(await exists(setup.dataDir)).toBe(true);
    expect(setup.stderr.join("")).toContain("npm uninstall --global @timurproko/a1");
  });
});
