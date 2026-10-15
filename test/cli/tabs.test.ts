import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runTabsCommand } from "../../src/cli/tabs.js";
import type { MaintenanceReport } from "../../src/foundation/resident-tabs/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

async function environment(): Promise<NodeJS.ProcessEnv> {
  const root = await mkdtemp(join(tmpdir(), "a1-tabs-cli-"));
  roots.push(root);
  return { A1_CONFIG_DIR: join(root, "config"), A1_DATA_DIR: join(root, "data"), A1_RUNTIME_DIR: join(root, "runtime") };
}

function report(fields: Partial<MaintenanceReport>): MaintenanceReport {
  return { schema: "a1-tabs-maintenance-v1", command: "list", host: "running", exitCode: 0, ...fields };
}

async function run(request: Parameters<typeof runTabsCommand>[0], answer: MaintenanceReport) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const maintenance = vi.fn(async () => answer);
  const code = await runTabsCommand(request, { environment: await environment(), stdout: value => stdout.push(value), stderr: value => stderr.push(value), maintenance });
  return { code, stdout: stdout.join(""), stderr: stderr.join(""), maintenance };
}

describe("a1 tabs", () => {
  it("reports no running tabs and asks only the maintenance path, never a launch", async () => {
    const result = await run({ action: "list", json: false }, report({ host: "none" }));
    expect(result).toMatchObject({ code: 0, stdout: "No resident tabs are running.\n", stderr: "" });
    expect(result.maintenance).toHaveBeenCalledWith(expect.objectContaining({ action: "list" }));
  });

  it("lists id, name, status, cwd, release, and holder pid", async () => {
    const result = await run({ action: "list", json: false }, report({ result: { tabs: [{ tabId: "tab-1", name: "agent", status: "working", cwd: "/w", release: "/r", holderPid: 42 }] } }));
    expect(result.code).toBe(0);
    expect(result.stdout.split("\n")[0]).toMatch(/^ID\s+NAME\s+STATUS\s+CWD\s+RELEASE\s+HOLDER$/u);
    expect(result.stdout).toMatch(/tab-1\s+agent\s+working\s+\/w\s+\/r\s+42/u);
  });

  it("prints the versioned report with --json", async () => {
    const result = await run({ action: "host-status", json: true }, report({ command: "host-status", result: { pid: 7 } }));
    expect(JSON.parse(result.stdout)).toEqual({ schema: "a1-tabs-maintenance-v1", command: "host-status", host: "running", result: { pid: 7 } });
  });

  it("shows start slots and lifecycle backlog, and flags lifecycle work stuck past ten seconds", async () => {
    const healthy = await run({ action: "host-status", json: false }, report({
      command: "host-status",
      result: { pid: 7, starts: { active: 2, interactiveWaiting: 1, recoverySlots: 2 }, lifecycle: { pending: 1, oldestMs: 900 } },
    }));
    expect(healthy.stdout).toContain("starts: active 2, waiting 1, recovering 2\n");
    expect(healthy.stdout).toContain("lifecycle: pending 1, oldest 900ms\n");
    const stalled = await run({ action: "host-status", json: false }, report({
      command: "host-status",
      result: { pid: 7, starts: { active: 2, interactiveWaiting: 1, recoverySlots: 2 }, lifecycle: { pending: 3, oldestMs: 12_500 } },
    }));
    expect(stalled.stdout).toContain("lifecycle: pending 3, oldest 12500ms (stalled)\n");
    const older = await run({ action: "host-status", json: false }, report({ command: "host-status", result: { pid: 7 } }));
    expect(older.stdout).not.toContain("lifecycle:");
  });

  it("explains an unresponsive host and fails an unknown tab with one line", async () => {
    const unresponsive = await run({ action: "list", json: false }, report({ host: "unresponsive", pid: 9 }));
    expect(unresponsive.stdout).toContain("a1 tabs host stop");
    const unknown = await run({ action: "stop", tabId: "tab-x", json: false }, report({ exitCode: 3, result: { accepted: false, message: "unknown tab" } }));
    expect(unknown.code).toBe(1);
    expect(unknown.stderr.trim().split("\n")).toHaveLength(1);
    expect(unknown.stderr).toContain("no tab tab-x");
  });

  it("confirms stops and the host stop", async () => {
    expect((await run({ action: "stop", tabId: "tab-1", json: false }, report({ result: { accepted: true, stopped: ["tab-1"] } }))).stdout)
      .toBe("Stopped tab tab-1; its session can be resumed.\n");
    expect((await run({ action: "stop-all", json: false }, report({ result: { accepted: true, stopped: ["a", "b"] } }))).stdout)
      .toBe("Stopped 2 tabs; their sessions can be resumed.\n");
    expect((await run({ action: "host-stop", json: false }, report({ host: "stopped" }))).stdout)
      .toBe("Stopped every tab and the resident host.\n");
    const partial = await run({ action: "host-stop", json: false }, report({ exitCode: 3, result: { accepted: false, remaining: ["tab-2"] } }));
    expect(partial.code).toBe(1);
    expect(partial.stderr).toContain("tab-2");
  });

  it("writes the doctor bundle from the host-reported state directory", async () => {
    const doctor = vi.fn(async () => ({ path: "/state/doctor/a1-tabs-doctor.zip", bytes: 10, dropped: [] }));
    const stdout: string[] = [];
    const maintenance = vi.fn(async () => report({ command: "host-status", host: "none", stateDir: "/state" }));
    const code = await runTabsCommand({ action: "doctor", json: false }, { environment: await environment(), stdout: value => stdout.push(value), stderr: () => {}, maintenance, doctor });
    expect(code).toBe(0);
    expect(maintenance).toHaveBeenCalledWith(expect.objectContaining({ action: "host-status" }));
    expect(doctor).toHaveBeenCalledWith(expect.objectContaining({ stateDir: "/state", settings: { tabsMax: 10, tabsAutoName: true } }));
    expect(stdout.join("")).toBe("Wrote /state/doctor/a1-tabs-doctor.zip\n");
  });
});
