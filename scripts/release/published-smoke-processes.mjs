import crossSpawn from "cross-spawn";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { listSystemProcesses, terminateSystemProcess } from "../development/checkout-process-inspection.mjs";

const sleep = milliseconds => new Promise(done => setTimeout(done, milliseconds));
const inside = (root, value) => {
  if (typeof value !== "string" || !isAbsolute(value)) return false;
  const path = relative(root, resolve(value));
  return path === "" || (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path));
};
const startedAfter = (child, parent) => /^\d+$/u.test(child) && /^\d+$/u.test(parent)
  ? BigInt(child) >= BigInt(parent) : Date.parse(child) >= Date.parse(parent);

/** Own command deadlines and fixture descendants without killing only a Windows command shell. */
export function createPublishedSmokeRunner(root, {
  spawn = crossSpawn, list = listSystemProcesses, terminate = terminateSystemProcess,
  pause = sleep, self = process.pid, now = Date.now,
  sampleIntervalMs = 10_000, sampleThresholdMs = 5 * 60_000,
} = {}) {
  const children = new Set();
  const known = new Map();
  /** pid -> first/last sighting of every process sampled while a long command ran. */
  const history = new Map();
  const sampling = { samples: 0, errors: 0, lastError: null };
  const selectedProcesses = async (deadline, { record = true } = {}) => {
    const rows = await list({ deadline });
    const byPid = new Map(rows.map(row => [row.pid, row]));
    if (!byPid.has(self)) throw new Error("smoke process inspection cannot identify its caller");
    const protectedIds = new Set();
    let ancestor = self;
    while (ancestor > 0 && !protectedIds.has(ancestor)) {
      protectedIds.add(ancestor);
      ancestor = byPid.get(ancestor)?.parent ?? 0;
    }
    const selected = new Map();
    for (const row of rows) {
      if (protectedIds.has(row.pid)) continue;
      const ownedChild = children.has(row.pid) && row.parent === self;
      const ownedCode = row.argv?.some(argument => inside(root, argument));
      const retained = known.get(row.pid);
      if (ownedChild || ownedCode || (retained && retained.start === row.start)) selected.set(row.pid, row);
    }
    // Security: detached recovery/npm owners also own descendants with relative lifecycle commands.
    let changed = true;
    while (changed) {
      changed = false;
      for (const row of rows) {
        const parent = selected.get(row.parent);
        if (!selected.has(row.pid) && !protectedIds.has(row.pid) && parent && startedAfter(row.start, parent.start)) {
          selected.set(row.pid, row);
          changed = true;
        }
      }
    }
    for (const row of selected.values()) {
      if (!Number.isSafeInteger(row.pid) || row.pid <= 0 || typeof row.start !== "string" || !row.start) {
        throw new Error("smoke process identity is unavailable");
      }
      // Concurrency: observation never records identities; Windows reuses pids within minutes and a
      // reused pid seen only by sampling must not make settlement's identity check fail cleanup.
      if (!record) continue;
      const previous = known.get(row.pid);
      if (previous && previous.start !== row.start) throw new Error("smoke process identity changed");
      known.set(row.pid, row);
    }
    return [...selected.values()];
  };
  const sample = async () => {
    const seenAt = new Date(now()).toISOString();
    try {
      for (const row of await selectedProcesses(now() + Math.min(sampleIntervalMs, 10_000), { record: false })) {
        const key = `${row.pid}:${row.start}`;
        const previous = history.get(key);
        if (previous) previous.lastSeen = seenAt;
        else history.set(key, { pid: row.pid, parent: row.parent, start: row.start, executable: row.executable ?? "", argv: [...(row.argv ?? [])], firstSeen: seenAt, lastSeen: seenAt });
      }
      sampling.samples += 1;
    } catch (error) {
      sampling.errors += 1;
      sampling.lastError = error instanceof Error ? error.message : String(error);
    }
  };
  return {
    /** Every process sampled during long commands, with its first and last sighting. */
    history() {
      return { ...sampling, rows: [...history.values()].sort((left, right) => left.firstSeen.localeCompare(right.firstSeen) || left.pid - right.pid) };
    },
    /** The fixture-owned processes settlement would stop, read without stopping anything. */
    async inventory() {
      return await selectedProcesses(Date.now() + 30_000);
    },
    async run(command, args, options) {
      // Platform: keep the shell alive until cleanup inventories its descendants. spawnSync's timeout kills
      // cmd.exe alone, stranding detached updater/npm owners and any inherited output handles.
      const { failureProbe, ...spawnOptions } = options;
      const child = spawn(command, args, { ...spawnOptions, timeout: undefined, stdio: ["ignore", "pipe", "pipe"] });
      if (child.pid) children.add(child.pid);
      // Rationale: a long command is where a detached updater tree can vanish; periodic sightings show
      // which process went first. One sample at a time so a slow inspection never stacks up.
      let inFlight = null;
      const sampler = options.timeout >= sampleThresholdMs
        ? setInterval(() => { inFlight ??= sample().finally(() => { inFlight = null; }); }, sampleIntervalMs)
        : null;
      sampler?.unref?.();
      let stdout = "", stderr = "", error;
      let overflow = false;
      const capture = (previous, chunk) => {
        const text = previous + chunk.toString("utf8");
        if (text.length > 128_000) overflow = true;
        return text.slice(-128_000);
      };
      child.stdout?.on("data", chunk => { stdout = capture(stdout, chunk); });
      child.stderr?.on("data", chunk => { stderr = capture(stderr, chunk); });
      let timer, probeTimer, probeInFlight = null;
      try {
        return await new Promise(done => {
          if (failureProbe) probeTimer = setInterval(() => {
            probeInFlight ??= Promise.resolve().then(failureProbe).then(failure => {
              if (failure) done({ status: null, signal: null, error: failure, stdout, stderr });
            }).catch(failure => { done({ status: null, signal: null, error: failure, stdout, stderr }); })
              .finally(() => { probeInFlight = null; });
          }, 500);
          timer = setTimeout(() => {
            const timeout = Object.assign(new Error(`published smoke command timed out after ${options.timeout}ms`), { code: "ETIMEDOUT" });
            done({ status: null, signal: null, error: timeout, stdout, stderr });
          }, options.timeout);
          child.once("error", failure => { error = failure; });
          child.once("close", (status, signal) => {
            if (child.pid) children.delete(child.pid);
            done({ status, signal, error: error ?? (overflow ? new Error("published smoke command exceeded output limit") : undefined), stdout, stderr });
          });
        });
      } finally {
        clearTimeout(timer);
        if (probeTimer) clearInterval(probeTimer);
        if (sampler) clearInterval(sampler);
        await probeInFlight;
        await inFlight;
      }
    },
    async close() {
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        const selected = await selectedProcesses(deadline);
        if (selected.length === 0) return;
        for (const record of selected) {
          const fresh = (await selectedProcesses(deadline)).find(row => row.pid === record.pid);
          if (!fresh) continue;
          if (fresh.start !== record.start) throw new Error("smoke process identity changed");
          try { await terminate(fresh, { deadline }); }
          catch (error) {
            if ((await selectedProcesses(deadline)).some(row => row.pid === fresh.pid && row.start === fresh.start)) throw error;
          }
        }
        await pause(100);
      }
      throw new Error("fixture-owned smoke processes did not settle before cleanup");
    },
  };
}
