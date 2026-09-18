import { fork, type ChildProcess } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HelperPool } from "../../../../src/integrations/pi/session-ui/helper-pool.js";

const entry = new URL("./helper-pool-fixture.mjs", import.meta.url);
const forked: ChildProcess[] = [];
function pool(options: { idleMs?: number; env?: NodeJS.ProcessEnv } = {}) {
  return new HelperPool({
    fork: () => { const child = fork(entry, [], { stdio: ["ignore", "ignore", "ignore", "ipc"], serialization: "json", ...(options.env === undefined ? {} : { env: options.env }) }); forked.push(child); return child; },
    stop: child => { child.kill("SIGKILL"); child.unref(); child.channel?.unref(); },
    ...(options.idleMs === undefined ? {} : { idleMs: options.idleMs }),
  });
}
const exited = (child: ChildProcess) => vi.waitFor(() => expect(child.exitCode !== null || child.signalCode !== null).toBe(true), { timeout: 5_000 });
const announced = (child: ChildProcess) => new Promise<void>(resolve => { if (!child.connected) resolve(); child.once("message", () => resolve()); });
afterEach(async () => {
  for (const child of forked.splice(0)) { if (child.exitCode === null && child.signalCode === null) { child.kill("SIGKILL"); await exited(child); } }
});

describe("spare helper pool", () => {
  it("hands a warm spare over once, with its announcement remembered, and the child still serves its taker", async () => {
    const spare = pool();
    expect(spare.warmed).toBe(false);
    spare.warm();
    expect(spare.warmed).toBe(true);
    expect(forked).toHaveLength(1);
    await announced(forked[0]!);
    const taken = spare.take();
    expect(taken).toMatchObject({ child: forked[0], ready: true });
    expect(spare.take()).toBeUndefined();
    expect(spare.warmed).toBe(false);
    const echo = new Promise<unknown>(resolve => taken!.child.once("message", resolve));
    taken!.child.send({ kind: "begin" });
    await expect(echo).resolves.toEqual({ kind: "echo", pid: forked[0]!.pid });
    spare.dispose();
  });

  it("hands over a spare that has not announced itself yet, so the taker waits for the announcement", async () => {
    const spare = pool();
    spare.warm();
    const taken = spare.take();
    expect(taken).toMatchObject({ child: forked[0], ready: false });
    await expect(new Promise(resolve => taken!.child.once("message", resolve))).resolves.toEqual({ kind: "ready" });
    spare.dispose();
  });

  it("replenishes only after the owner warmed it, and forks the replacement after a take", () => {
    const spare = pool();
    spare.replenish();
    expect(forked).toHaveLength(0);
    spare.warm();
    spare.replenish();
    expect(forked).toHaveLength(1);
    spare.take();
    spare.replenish();
    expect(forked).toHaveLength(2);
    expect(forked[1]).not.toBe(forked[0]);
    spare.dispose();
  });

  it("stops an idle spare after the idle bound and stops the held spare on dispose", async () => {
    const idle = pool({ idleMs: 50 });
    idle.warm();
    await exited(forked[0]!);
    expect(idle.warmed).toBe(false);
    expect(idle.take()).toBeUndefined();
    const held = pool();
    held.warm();
    held.dispose();
    await exited(forked[1]!);
    expect(held.warmed).toBe(false);
    held.warm();
    expect(forked).toHaveLength(2);
  });

  it("drops a spare that exits on its own and forks a fresh one on the next replenish", async () => {
    const spare = pool({ env: { ...process.env, HELPER_POOL_FIXTURE: "crash" } });
    spare.warm();
    await exited(forked[0]!);
    await vi.waitFor(() => expect(spare.warmed).toBe(false));
    expect(spare.take()).toBeUndefined();
    spare.replenish();
    expect(forked).toHaveLength(2);
    spare.dispose();
  });
});
