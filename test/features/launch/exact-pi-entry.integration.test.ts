import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { selectTransparentChild } from "../../../src/composition/transparent-runtime.js";

const execute = promisify(execFile);
let fakeBin: string;
let selectedVersion: string;

beforeAll(async () => {
  const manifest = JSON.parse(await readFile("package.json", "utf8")) as { dependencies: Record<string, string> };
  selectedVersion = manifest.dependencies["@earendil-works/pi-coding-agent"]!;
  await execute(process.execPath, [resolve("node_modules/typescript/bin/tsc"), "-p", "tsconfig.build.json"], { cwd: resolve("."), timeout: 120_000 });
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
  const compositionUrl = new URL("../../../dist/src/composition/transparent-runtime.js", import.meta.url).href;
  const selected = selectTransparentChild({ A1_LAUNCH_ARGUMENTS_JSON: '["--version"]', PATH: path }, process.execPath, compositionUrl);
  return await execute(selected.executable, [...selected.arguments], {
    cwd: resolve("."),
    env: { ...process.env, PATH: path },
    timeout: 30_000,
  });
}

describe("exact selected Pi public entry", () => {
  it("launches the selected dependency when ambient Pi is absent", async () => {
    const result = await launchWithPath("");
    expect(result.stdout.trim()).toBe(selectedVersion);
  });

  it("ignores a conflicting Pi executable first on PATH", async () => {
    const result = await launchWithPath(`${fakeBin}${delimiter}${process.env.PATH ?? ""}`);
    expect(result.stdout.trim()).toBe(selectedVersion);
    expect(result.stdout).not.toContain("conflicting-ambient-pi");
  });
});
