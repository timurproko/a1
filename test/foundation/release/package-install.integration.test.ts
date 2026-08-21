import crossSpawn from "cross-spawn";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadValidationCandidate } from "./package-candidate-fixture.js";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
let root = "";
let prefix = "";
let candidate: Awaited<ReturnType<typeof loadValidationCandidate>>;

beforeAll(async () => {
  candidate = await loadValidationCandidate();
  root = await mkdtemp(resolve(tmpdir(), "a1-package-install-"));
  prefix = resolve(root, "prefix");
  const installed = await runAsync(npm, ["install", "--global", "--prefix", prefix, candidate.path, "--ignore-scripts", "--no-audit", "--no-fund"], root);
  expect(installed.status, installed.stderr).toBe(0);
}, 600_000);

afterAll(async () => {
  if (root) await rm(root, { recursive: true, force: true });
}, 60_000);

describe("clean installation of the exact candidate", () => {
  it("installs only the authoritative a1 command and package identity", async () => {
    const packageRoot = resolve(prefix, "node_modules", "@timurproko", "a1");
    const manifest = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8")) as {
      name: string; version: string; bin: Record<string, string>; dependencies: Record<string, string>;
    };
    expect(manifest).toMatchObject({
      name: "@timurproko/a1",
      version: candidate.manifest.version,
      bin: { "a1": "bin/a1.js" },
    });
    expect(Object.keys(manifest.bin)).toEqual(["a1"]);
    expect(manifest.dependencies["@earendil-works/pi-coding-agent"]).toMatch(/^\d+\.\d+\.\d+$/);

    const identityJson = JSON.parse(await readFile(resolve(packageRoot, "dist", "src", "product-identity.json"), "utf8")) as { packageName: string };
    const identityModule = await import(pathToFileURL(resolve(packageRoot, "dist", "src", "product-identity.js")).href) as {
      PRODUCT_IDENTITY: { packageName: string; commandName: string };
    };
    expect(identityJson.packageName).toBe("@timurproko/a1");
    expect(identityModule.PRODUCT_IDENTITY).toMatchObject({ packageName: "@timurproko/a1", commandName: "a1" });
    expect(Object.isFrozen(identityModule.PRODUCT_IDENTITY)).toBe(true);

    const bin = process.platform === "win32" ? prefix : resolve(prefix, "bin");
    await expect(access(resolve(bin, process.platform === "win32" ? "a1.cmd" : "a1"))).resolves.toBeUndefined();
    await expect(access(resolve(bin, process.platform === "win32" ? "addone.cmd" : "addone"))).rejects.toThrow();
  });
});

function runAsync(command: string, arguments_: readonly string[], cwd: string) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolvePromise, rejectPromise) => {
    const child = crossSpawn(command, [...arguments_], { cwd, env: process.env, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr?.on("data", chunk => { stderr += chunk.toString(); });
    child.once("error", rejectPromise);
    child.once("close", status => resolvePromise({ status, stdout, stderr }));
  });
}
