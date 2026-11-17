import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ensurePublicationDependencies } from "../../scripts/development/dependency-bootstrap.mjs";
import { inspectDependencies } from "../../scripts/development/dependency-inspection.mjs";
import { blockingFailures, evaluatePrerequisites } from "../../scripts/development/environment-prerequisites.mjs";
import type { NpmExecutor } from "../../scripts/development/dependency-process.mjs";

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));
function fixture() {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), "publication-dependencies-"))); roots.push(root);
  const manifest = { name: "fixture", version: "1.0.0", packageManager: "npm@11.13.0", dependencies: { semver: "7.8.5" } };
  const lock = { name: "fixture", version: "1.0.0", lockfileVersion: 3, packages: { "": { ...manifest }, "node_modules/semver": { version: "7.8.5" } } };
  writeFileSync(join(root, "package.json"), JSON.stringify(manifest)); writeFileSync(join(root, "package-lock.json"), JSON.stringify(lock));
  const installed = join(root, "node_modules/semver");
  const install = (version = "7.8.5", entry = true) => {
    mkdirSync(join(installed, "lib"), { recursive: true });
    writeFileSync(join(installed, "package.json"), JSON.stringify({ name: "semver", version, main: "./lib/index.js" }));
    if (entry) writeFileSync(join(installed, "lib/index.js"), "throw Error('Inspection must not execute dependency code');");
  };
  const npm = vi.fn<NpmExecutor>(async (args, options) => {
    expect(options.cwd).toBe(root);
    if (args[0] === "ci") install();
    return { code: 0, stdout: JSON.stringify({ name: "fixture", dependencies: { semver: { version: "7.8.5" } } }) };
  });
  const logs: string[] = [], options = { root, npm, log: (message: string) => logs.push(message) };
  const lockPath = join(root, ".artifacts/publication-dependencies/repair.lock");
  return { root, manifest, lock, installed, install, npm, logs, options, lockPath };
}

describe("dependency inspection shared with the read-only doctor", () => {
  it("detects absent, missing, stale and manifest-present/entry-missing packages", () => {
    const f = fixture(); expect(inspectDependencies(f.root, f.manifest).present).toBe(false);
    mkdirSync(join(f.root, "node_modules")); expect(inspectDependencies(f.root, f.manifest).missing).toEqual(["semver"]);
    f.install("7.0.0", false);
    expect(inspectDependencies(f.root, f.manifest)).toMatchObject({ mismatched: [{ name: "semver" }], incomplete: ["semver"] });
    f.install(); expect(inspectDependencies(f.root, f.manifest)).toMatchObject({ missing: [], mismatched: [], incomplete: [] });
    expect(f.npm).not.toHaveBeenCalled();
  });
  it("checks import-only exports, scoped packages and binaries without running their code", () => {
    const f = fixture(), directory = join(f.root, "node_modules/@fixture/pkg"); mkdirSync(directory, { recursive: true });
    const pkg = { name: "@fixture/pkg", version: "1.0.0", exports: { ".": { import: "./entry.mjs" } }, bin: { fixture: "./cli.js" } };
    writeFileSync(join(directory, "package.json"), JSON.stringify(pkg));
    writeFileSync(join(directory, "entry.mjs"), "throw Error('Must not import');");
    expect(inspectDependencies(f.root, { dependencies: { "@fixture/pkg": "1.0.0" } }).incomplete).toEqual(["@fixture/pkg"]);
    writeFileSync(join(directory, "cli.js"), "throw Error('Must not execute');");
    expect(inspectDependencies(f.root, { dependencies: { "@fixture/pkg": "1.0.0" } }).incomplete).toEqual([]);
  });
  it("reports incomplete package entries without making doctor install anything", () => {
    const checks = evaluatePrerequisites({ dependencies: { present: true, declared: 1, missing: [], mismatched: [], incomplete: ["semver"] } });
    expect(blockingFailures(checks).find(check => check.id === "dependencies")).toMatchObject({ remedy: "npm ci", detail: expect.stringContaining("missing entry files") });
  });
});

describe("bounded publication dependency repair", () => {
  it("leaves a healthy tree alone and inspects npm locally/offline", async () => {
    const f = fixture(); f.install(); await ensurePublicationDependencies(f.options);
    expect(f.npm).toHaveBeenCalledTimes(1); expect(f.npm.mock.calls[0]![0]).toEqual(["ls", "--all", "--json", "--include=dev", "--offline", "--ignore-scripts"]);
    expect(f.logs).toEqual([]); expect(existsSync(f.lockPath)).toBe(false);
  });
  it.each(["absent", "missing", "stale", "entry"])("repairs %s dependencies once with the lockfile and verifies the result", async mode => {
    const f = fixture(), before = readFileSync(join(f.root, "package-lock.json"), "utf8");
    if (mode === "missing") mkdirSync(join(f.root, "node_modules"));
    if (mode === "stale") f.install("7.0.0");
    if (mode === "entry") f.install("7.8.5", false);
    await ensurePublicationDependencies(f.options);
    expect(f.npm.mock.calls.filter(([args]) => args[0] === "ci")).toHaveLength(1);
    expect(f.npm.mock.calls.find(([args]) => args[0] === "ci")![0]).toEqual(["ci", "--include=dev", "--no-audit", "--no-fund"]);
    expect(f.logs.join(" ")).toContain("continuing the original command"); expect(existsSync(f.lockPath)).toBe(false);
    expect(readFileSync(join(f.root, "package-lock.json"), "utf8")).toBe(before);
  });
  it("repairs invalid transitive dependency state even when direct packages are present", async () => {
    const f = fixture(); f.install(); let repaired = false;
    f.npm.mockImplementation(async args => {
      if (args[0] === "ci") repaired = true;
      return repaired ? { code: 0, stdout: "{}" } : { code: 1, stdout: JSON.stringify({ error: { code: "ELSPROBLEMS" }, problems: ["missing transitive"] }) };
    });
    await ensurePublicationDependencies(f.options); expect(repaired).toBe(true);
  });
  it.each(["exit", "incomplete", "report"])("stops on %s without retrying or leaving its settled lock", async mode => {
    const f = fixture(); if (mode === "report") f.install();
    f.npm.mockResolvedValue({ code: mode === "exit" ? 17 : 0, stdout: "not JSON" });
    await expect(ensurePublicationDependencies(f.options)).rejects.toThrow(mode === "exit" ? /npm ci failed/ : mode === "report" ? /could not inspect/ : /remain incomplete/);
    expect(f.npm.mock.calls.filter(([args]) => args[0] === "ci").length).toBeLessThanOrEqual(1); expect(existsSync(f.lockPath)).toBe(false);
  });
  it("refuses malformed or out-of-sync configuration without calling npm", async () => {
    const f = fixture(); f.lock.packages[""].dependencies.semver = "7.0.0";
    writeFileSync(join(f.root, "package-lock.json"), JSON.stringify(f.lock));
    await expect(ensurePublicationDependencies(f.options)).rejects.toThrow(/declarations and lockfile disagree/); expect(f.npm).not.toHaveBeenCalled();
    writeFileSync(join(f.root, "package-lock.json"), "broken");
    await expect(ensurePublicationDependencies(f.options)).rejects.toThrow(/readable package.json/);
  });
  it("does not install through an external node_modules link or a linked lock directory", async () => {
    const f = fixture(), external = mkdtempSync(join(tmpdir(), "publication-external-")); roots.push(external);
    writeFileSync(join(external, "keep"), "untouched"); symlinkSync(external, join(f.root, "node_modules"), process.platform === "win32" ? "junction" : "dir");
    await expect(ensurePublicationDependencies(f.options)).rejects.toThrow(/refuses a linked/); expect(f.npm).not.toHaveBeenCalled();
    expect(readFileSync(join(external, "keep"), "utf8")).toBe("untouched");
    rmSync(join(f.root, "node_modules")); symlinkSync(external, join(f.root, ".artifacts"), process.platform === "win32" ? "junction" : "dir");
    await expect(ensurePublicationDependencies(f.options)).rejects.toThrow(/Unsafe dependency setup directory/); expect(f.npm).not.toHaveBeenCalled();
  });
  it("serializes concurrent commands and rechecks under the acquired lock", async () => {
    const f = fixture(); let entered!: () => void, finish!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; }), waiting = new Promise<void>(resolve => { finish = resolve; });
    f.npm.mockImplementation(async args => { if (args[0] === "ci") { entered(); await waiting; f.install(); } return { code: 0, stdout: "{}" }; });
    const one = ensurePublicationDependencies(f.options); await started;
    const two = ensurePublicationDependencies(f.options); await new Promise(resolve => setTimeout(resolve, 20)); finish(); await Promise.all([one, two]);
    expect(f.npm.mock.calls.filter(([args]) => args[0] === "ci")).toHaveLength(1); expect(existsSync(f.lockPath)).toBe(false);
  });
  it("preserves a foreign lock on bounded contention", async () => {
    const f = fixture(); mkdirSync(f.lockPath, { recursive: true }); writeFileSync(join(f.lockPath, "owner"), "foreign");
    await expect(ensurePublicationDependencies({ ...f.options, lockWaitMs: 1 })).rejects.toThrow(/busy or a previous setup/);
    expect(readFileSync(join(f.lockPath, "owner"), "utf8")).toBe("foreign"); expect(f.npm).not.toHaveBeenCalled();
  });
  it("does not admit a seemingly healthy tree while another repair is still active", async () => {
    const f = fixture(); f.install(); mkdirSync(f.lockPath, { recursive: true }); writeFileSync(join(f.lockPath, "owner"), "install-in-progress");
    await expect(ensurePublicationDependencies({ ...f.options, lockWaitMs: 1 })).rejects.toThrow(/busy or a previous setup/);
    expect(f.npm.mock.calls.every(([args]) => args[0] === "ls")).toBe(true);
    expect(readFileSync(join(f.lockPath, "owner"), "utf8")).toBe("install-in-progress");
  });
  it("holds the lock until cancellation settles and retains it when settlement is unknown", async () => {
    const f = fixture(), controller = new AbortController(); let started!: () => void, settle!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; }), stopped = new Promise<void>(resolve => { settle = resolve; });
    f.npm.mockImplementation(async () => { started(); await stopped; throw Object.assign(new Error("Cancelled"), { name: "AbortError" }); });
    const pending = ensurePublicationDependencies({ ...f.options, signal: controller.signal }); await entered; controller.abort();
    expect(existsSync(f.lockPath)).toBe(true); settle(); await expect(pending).rejects.toThrow("Cancelled"); expect(existsSync(f.lockPath)).toBe(false);
    f.npm.mockRejectedValue(Object.assign(new Error("Unsettled installer"), { settled: false }));
    await expect(ensurePublicationDependencies(f.options)).rejects.toThrow("Unsettled"); expect(existsSync(f.lockPath)).toBe(true);
  });
  it("refuses continuation if the manifest/lockfile changes during installation", async () => {
    const f = fixture(); f.npm.mockImplementation(async () => { writeFileSync(join(f.root, "package.json"), JSON.stringify({ ...f.manifest, description: "changed" })); return { code: 0, stdout: "{}" }; });
    await expect(ensurePublicationDependencies(f.options)).rejects.toThrow(/changed during installation/); expect(existsSync(f.lockPath)).toBe(false);
  });
});
