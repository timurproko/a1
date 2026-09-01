import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const execute = promisify(execFile);
let fakeBin: string;
let selectedVersion: string;

beforeAll(async () => {
  const manifest = JSON.parse(await readFile("package.json", "utf8")) as { dependencies: Record<string, string> };
  selectedVersion = manifest.dependencies["@earendil-works/pi-coding-agent"]!;
  if (process.env.VALIDATION_BUILD_READY !== "1") {
    await execute(process.execPath, [resolve("node_modules/typescript/bin/tsc"), "-p", "tsconfig.build.json"], { cwd: resolve("."), timeout: 120_000 });
  }
  fakeBin = await mkdtemp(join(tmpdir(), "selected-pi-entry-"));
  if (process.platform === "win32") {
    await writeFile(join(fakeBin, "pi.cmd"), "@echo conflicting-ambient-pi\r\n");
  } else {
    const path = join(fakeBin, "pi");
    await writeFile(path, "#!/bin/sh\necho conflicting-ambient-pi\n");
    await chmod(path, 0o755);
  }
}, 150_000);

afterAll(async () => { if (fakeBin) await rm(fakeBin, { recursive: true, force: true }); });

async function launchWithPath(path: string) {
  // Invariant: the engine A1 runs is the pinned dependency, never whichever Pi executable a
  // PATH happens to offer, so the entry that loads it is asked for its version.
  const entry = resolve("dist/integrations/pi/engine/public-main-entry.js");
  return await execute(process.execPath, [entry, "--version"], {
    cwd: resolve("."),
    env: { ...process.env, PATH: path },
    timeout: 30_000,
  });
}

describe("exact selected Pi public entry", () => {
  it("launches the selected dependency when ambient Pi is absent", async () => {
    const result = await launchWithPath("");
    expect(result.stdout.trim()).toBe(selectedVersion);
  }, 30_000);

  it("ignores a conflicting Pi executable first on PATH", async () => {
    const result = await launchWithPath(`${fakeBin}${delimiter}${process.env.PATH ?? ""}`);
    expect(result.stdout.trim()).toBe(selectedVersion);
    expect(result.stdout).not.toContain("conflicting-ambient-pi");
  }, 30_000);
});
