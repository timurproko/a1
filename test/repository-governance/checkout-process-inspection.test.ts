import { resolve, join } from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { checkoutProcessInventory, commandArguments, listSystemProcesses, stopCheckoutDevelopmentProcesses, type ProcessSnapshot } from "../../scripts/development/checkout-process-inspection.mjs";

const root = resolve("fixture-checkout");
const caller: ProcessSnapshot = { pid: 100, parent: 0, start: "caller-start", executable: process.execPath, argv: [process.execPath, resolve("worker.mjs")] };
const child = (pid = 10): ProcessSnapshot => ({ pid, parent: 1, start: "child-start", executable: process.execPath, argv: [process.execPath, resolve(root, "bin", "ui.js")] });

describe("checkout process ownership", () => {
  it("observes and stops a real private development child with its native process-start identity", async () => {
    const directory = await mkdtemp(join(tmpdir(), "a1-process-inspection-"));
    await mkdir(join(directory, "bin"));
    const entry = join(directory, "bin", "ui.js");
    await writeFile(entry, "setInterval(() => {}, 1000);\n");
    const child = spawn(process.execPath, [entry], { stdio: "ignore", windowsHide: true });
    const exited = once(child, "exit");
    onTestFinished(async () => { child.kill(); await exited; await rm(directory, { recursive: true, force: true }); });
    const selected = checkoutProcessInventory(await listSystemProcesses(), directory).find(row => row.pid === child.pid);
    expect(selected?.protected).toBe(false);
    expect(selected?.start).toBeTruthy();
    const result = await stopCheckoutDevelopmentProcesses(directory, { deadline: Date.now() + 30000 });
    expect(result.survivors).toEqual([]);
    expect(result.stopped).toContain(child.pid);
    await exited;
  }, 60000);

  it("decodes quoted Windows argv rather than matching arbitrary substrings", () => {
    expect(commandArguments('"C:\\Program Files\\nodejs\\node.exe" "D:\\My Checkout\\bin\\ui.js" --flag')).toEqual(["C:\\Program Files\\nodejs\\node.exe", "D:\\My Checkout\\bin\\ui.js", "--flag"]);
    expect(commandArguments('node "unterminated')).toEqual([]);
  });

  it("selects exact code roots and not other checkouts, releases, or path-looking arguments", () => {
    const foreign = { ...child(11), argv: [process.execPath, resolve("other", "bin", "ui.js")] };
    const argument = { ...child(12), argv: [process.execPath, resolve("worker.mjs"), resolve(root, "bin", "ui.js")] };
    const near = { ...child(13), argv: [process.execPath, resolve(`${root}-other`, "bin", "ui.js")] };
    expect(checkoutProcessInventory([caller, child(), foreign, argument, near], root, 100).map(row => row.pid)).toEqual([10]);
  });

  it("protects the caller and its ancestors even after session context unlinking", async () => {
    const rows = [{ ...caller, parent: 10 }, child()];
    expect(checkoutProcessInventory(rows, root, 100)[0]?.protected).toBe(true);
    const terminate = vi.fn(async () => {});
    await expect(stopCheckoutDevelopmentProcesses(root, { list: async () => rows, self: 100, terminate })).rejects.toThrow("development-process-protected");
    expect(terminate).not.toHaveBeenCalled();
  });

  it("rechecks stable identity immediately before stopping and refuses a reused PID", async () => {
    const list = vi.fn().mockResolvedValueOnce([caller, child()]).mockResolvedValueOnce([caller, { ...child(), start: "reused" }]);
    const terminate = vi.fn(async () => {});
    await expect(stopCheckoutDevelopmentProcesses(root, { list, self: 100, terminate })).rejects.toThrow("development-process-identity-changed");
    expect(terminate).not.toHaveBeenCalled();
  });

  it("stops only verified instances and settles through fresh inventories", async () => {
    let rows = [caller, child()];
    const terminate = vi.fn(async () => { rows = [caller]; });
    expect(await stopCheckoutDevelopmentProcesses(root, { list: async () => rows, self: 100, terminate, sleep: async () => {} })).toEqual({ stopped: [10], survivors: [] });
    expect(terminate).toHaveBeenCalledOnce();
  });

  it("reports survivors without repeatedly terminating an unchanged process", async () => {
    const terminate = vi.fn(async () => {});
    expect(await stopCheckoutDevelopmentProcesses(root, { list: async () => [caller, child()], self: 100, terminate, sleep: async () => {}, passes: 2 })).toEqual({ stopped: [10], survivors: [10] });
    expect(terminate).toHaveBeenCalledOnce();
  });

  it("does not silently treat unavailable inspection or missing start identity as no processes", async () => {
    expect(() => checkoutProcessInventory([caller, { ...child(), start: "" }], root, 100)).toThrow("development-process-unverifiable");
    await expect(stopCheckoutDevelopmentProcesses(root, { list: async () => { throw new Error("access denied"); }, self: 100 })).rejects.toThrow("development-process-inspection-unavailable");
  });
});
