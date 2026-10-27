import { readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it } from "vitest";
import { createResidentFixtureRoot, writeFixtureRoleEntry } from "../../scripts/development/resident-input-responsiveness.mjs";
import { chaosChildSource } from "../../scripts/development/run-resident-chaos.mjs";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe("resident certification custody", () => {
  it.each(["verify-interaction-parity", "measure-resident-tabs", "verify-resident-parallel-progress", "run-resident-chaos"])(
    "%s uses short roots and a fixed artifact entry rather than the environment-gated shipping loader", async name => {
      const source = await readFile(`scripts/development/${name}.mjs`, "utf8");
      expect(source).toMatch(/await createResidentFixtureRoot\(/u);
      expect(source).toMatch(/hostEntry = await writeFixtureRoleEntry\(/u);
      expect(source).not.toContain('hostEntry = resolve("dist/foundation/resident-tabs/host-entry.js")');
    },
  );

  it("keeps canonical artifact custody over three sanitized or stale detached generations", async () => {
    const root = await createResidentFixtureRoot("a1-custody-");
    roots.push(root);
    const artifact = join(root, "quoted'addon.node");
    await writeFile(artifact, "fixture bytes");
    const canonical = await realpath(artifact);
    const entry = await writeFixtureRoleEntry(root, artifact);
    const source = await readFile(entry, "utf8");
    for (const role of ["server", "holder", "server"]) {
      const process = { env: { A1_TERMINAL_HOST_PATH: "wrong.node" }, execPath: "fixed-node", argv: ["fixed-node", entry, "--resident-role-child", role], exitCode: -1 };
      const calls: unknown[] = [];
      runInNewContext(source, {
        __filename: entry, process,
        require(path: string) {
          expect(path).toBe(canonical);
          return { runRole(...args: unknown[]) { calls.push(args); process.env = {} as typeof process.env; return 0; } };
        },
      });
      expect(calls).toEqual([[process.argv.slice(2), { executable: "fixed-node", entry, artifact: canonical }]]);
      expect(process.exitCode).toBe(0);
    }
    if (process.platform !== "win32") {
      expect(join(await realpath(root), "runtime", "resident.sock").length).toBeLessThan(96);
      expect((await stat(root)).mode & 0o077).toBe(0);
    }
  });

  it("keeps the certified chaos child on inherited PTY handles and records actual spawn readiness", () => {
    const callbacks = new Map<string, (...args: any[]) => void>();
    const calls: unknown[] = [];
    const writes: string[] = [];
    const exits: number[] = [];
    const child = { pid: 77, once: (event: string, callback: (...args: any[]) => void) => callbacks.set(event, callback) };
    const process = { pid: 55, argv: ["node", "ui.js", "--tab-data-dir", "/owned/tab"], exit: (code: number) => exits.push(code) };
    runInNewContext(chaosChildSource("/certified/fake-tab"), {
      process, console: { error: () => {} },
      require(name: string) {
        if (name === "node:child_process") return { spawn: (...args: unknown[]) => { calls.push(args); return child; } };
        if (name === "node:fs") return { mkdirSync: () => {}, writeFileSync: (_path: string, text: string) => writes.push(text) };
        if (name === "node:path") return { join };
        throw new Error(`unexpected module ${name}`);
      },
    });
    expect(calls).toEqual([["/certified/fake-tab", process.argv.slice(2), { stdio: "inherit" }]]);
    expect(writes).toEqual([]);
    callbacks.get("spawn")!();
    expect(JSON.parse(writes[0]!)).toEqual({ parent: 55, pid: 77 });
    callbacks.get("exit")!(17);
    callbacks.get("error")!(new Error("fixture refused"));
    expect(exits).toEqual([17, 1]);
  });

  it("refuses vacuous chaos success and cleans measurement hosts outside timed samples", async () => {
    const chaos = await readFile("scripts/development/run-resident-chaos.mjs", "utf8");
    expect(chaos).toContain('violations.push("chaos exercised no ready fixture tabs")');
    expect(chaos).toContain('violation: "tab did not start its certified fixture child"');
    const measurement = await readFile("scripts/development/measure-resident-tabs.mjs", "utf8");
    expect(measurement).toContain('"tabs", "host-stop"');
    expect(measurement).not.toContain('"tab-close"');
  });
});
