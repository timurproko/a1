import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { terminalHostZigVersion } from "../../scripts/development/build-terminal-host.mjs";
import {
  expectedTerminalVtIdentity,
  selectLocalTerminalVt,
  terminalVtCacheCompatible,
} from "../../scripts/development/prepare-local-terminal-host.mjs";
import { preflightSteps } from "../../scripts/development/run-preflight.mjs";

describe("resident-ready normal build", () => {
  it("keeps the public build complete and npm lifecycle plus preflight explicitly core-only", async () => {
    const manifest = JSON.parse(await readFile("package.json", "utf8"));
    const build = String(manifest.scripts.build);
    expect(build).toContain("npm run build:managed");
    expect(build).toContain("node scripts/development/prepare-local-terminal-host.mjs");
    expect(build.indexOf("prepare-local-terminal-host.mjs")).toBeLessThan(build.indexOf("generate-runtime-payload-inventory.mjs"));
    expect(manifest.scripts.prepare).toBe("npm run build:core");
    expect(String(manifest.scripts["build:core"])).not.toContain("terminal-host");
    const selection = { docsOnly: false, versionOnly: false, openspecTouched: false, documentation: { required: false }, naming: { required: false }, prCore: { tests: [] } };
    expect(preflightSteps(selection)[0]).toMatchObject({ id: "build", executable: "npm", arguments: ["run", "build:core"] });
  });

  it("accepts only a cache declaring this checkout's platform identity", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-terminal-vt-cache-"));
    await mkdir(join(root, "lib"));
    const expected = await expectedTerminalVtIdentity("win32", "x64");
    await writeFile(join(root, "terminal-vt.manifest.json"), `${JSON.stringify({ ...expected, files: [{ path: "lib/ghostty-vt-static.lib", sha256: "a".repeat(64) }] })}\n`);
    expect(await terminalVtCacheCompatible(root, expected)).toBe(true);
    await writeFile(join(root, "terminal-vt.manifest.json"), `${JSON.stringify({ ...expected, zigCpu: "native", files: [{}] })}\n`);
    expect(await terminalVtCacheCompatible(root, expected)).toBe(false);
  });

  it("prefers an explicit library and otherwise fetches current-branch then develop on Windows", async () => {
    let calls = 0;
    const explicit = await selectLocalTerminalVt({
      platform: "win32", architecture: "x64", environment: { TERMINAL_HOST_PREBUILT_VT: "./chosen" },
      fetch: () => { calls += 1; throw new Error("must not fetch"); },
    });
    expect(explicit).toBe(resolve("chosen"));
    expect(calls).toBe(0);

    const missing = resolve(await mkdtemp(join(tmpdir(), "a1-terminal-vt-missing-")), "cache");
    let request: unknown;
    const selected = await selectLocalTerminalVt({
      platform: "win32", architecture: "x64", environment: {}, cache: missing, branch: "fix/example",
      fetch: (options: { branches: readonly string[]; platform: string; target: string; includeMergedDevelop: boolean }) => { request = options; return { target: missing }; },
    });
    expect(selected).toBe(missing);
    expect(request).toMatchObject({ branches: ["fix/example", "develop"], platform: "win32-x64", target: missing, includeMergedDevelop: true });
  });

  it("does not invoke workstation Zig when linking a verified prebuilt library", () => {
    let observations = 0;
    expect(terminalHostZigVersion({ TERMINAL_HOST_LOCAL_BUILD: "1", TERMINAL_HOST_PREBUILT_VT: "cache" }, () => {
      observations += 1; return "unexpected";
    })).toBe("0.15.2 (prebuilt terminal library)");
    expect(observations).toBe(0);
    expect(terminalHostZigVersion({}, () => "0.15.2")).toBe("0.15.2");
  });

  it("fails actionably when Windows has no verified library", async () => {
    await expect(selectLocalTerminalVt({
      platform: "win32", architecture: "x64", environment: {},
      cache: resolve(await mkdtemp(join(tmpdir(), "a1-terminal-vt-unavailable-")), "cache"),
      branch: "fix/example", fetch: () => { throw new Error("artifact unavailable"); },
    })).rejects.toThrow(/normal build needs a verified Windows terminal library.*artifact unavailable/u);
  });
});
