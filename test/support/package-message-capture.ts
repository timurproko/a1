import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { resolve } from "node:path";

interface Pending { resolve(value: unknown): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }

/** File-owned fixed-color producers reuse only module loading, never homes, results, or assertions. */
export class PackageMessageCapture {
  private readonly workers = new Map<string, { child: ChildProcessWithoutNullStreams; pending: Pending | null; output: string; stderr: string; closed: Promise<void>; queue: Promise<unknown>; failure: Error | null }>();

  get producerLaunches(): number { return this.workers.size; }

  async capture(producer: "owned" | "pinned", home: string, cases: readonly unknown[], color: 0 | 1): Promise<unknown> {
    const key = `${producer}:${color}`;
    let worker = this.workers.get(key);
    if (!worker) {
      const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
        ["PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"].includes(name.toUpperCase())));
      const child = spawn(process.execPath, ["--import", "tsx", resolve("test/cli/pinned-package-message-worker.mjs"), producer, "--server"], {
        cwd: process.cwd(), windowsHide: true, stdio: "pipe",
        env: { ...environment, FORCE_COLOR: String(color), PI_OFFLINE: "1", PI_TELEMETRY: "0", PI_SKIP_VERSION_CHECK: "1" },
      });
      let closed!: () => void;
      worker = { child, pending: null, output: "", stderr: "", closed: new Promise<void>(done => { closed = done; }), queue: Promise.resolve(), failure: null };
      const current = worker;
      const fail = (error: Error) => {
        current.failure ??= error;
        if (current.pending) { clearTimeout(current.pending.timer); current.pending.reject(error); current.pending = null; }
        if (child.exitCode === null && child.signalCode === null) child.kill();
      };
      child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
      child.stdout.on("data", (data: string) => {
        current.output += data;
        if (Buffer.byteLength(current.output) > 2 * 1024 * 1024) return fail(new Error("package capture output exceeds bound"));
        const newline = current.output.indexOf("\n");
        if (newline < 0) return;
        const line = current.output.slice(0, newline); current.output = current.output.slice(newline + 1);
        const pending = current.pending;
        if (!pending || current.output.length) return fail(new Error("unexpected package capture response"));
        clearTimeout(pending.timer); current.pending = null;
        try { pending.resolve(JSON.parse(line)); }
        catch { const error = new Error("malformed package capture response"); pending.reject(error); fail(error); }
      });
      child.stderr.on("data", (data: string) => {
        current.stderr += data;
        if (Buffer.byteLength(current.stderr) > 8192) fail(new Error("package capture stderr exceeds bound"));
      });
      child.on("error", error => fail(error));
      child.on("close", (code, signal) => { fail(new Error(`package capture closed (${code ?? signal}): ${current.stderr}`)); closed(); });
      this.workers.set(key, worker);
    }
    const current = worker;
    const request = current.queue.then(() => new Promise<unknown>((done, reject) => {
      if (current.failure) return reject(current.failure);
      if (current.stderr) return reject(new Error(`unexpected package capture stderr: ${current.stderr}`));
      const timer = setTimeout(() => {
        current.failure = new Error("package capture request timed out");
        current.pending = null; current.child.kill(); reject(current.failure);
      }, 60_000);
      current.pending = { resolve: value => current.stderr ? reject(new Error(`unexpected package capture stderr: ${current.stderr}`)) : done(value), reject, timer };
      current.child.stdin.write(`${JSON.stringify({ home, cases })}\n`, error => {
        if (!error) return;
        clearTimeout(timer); current.pending = null; current.failure = error; current.child.kill(); reject(error);
      });
    }));
    // A failed producer is never restarted or retried; later consumers receive the same failure.
    current.queue = request;
    return request;
  }

  async close(): Promise<void> {
    await Promise.all([...this.workers.values()].map(async worker => {
      if (worker.pending) { clearTimeout(worker.pending.timer); worker.pending.reject(new Error("capture disposed")); worker.pending = null; }
      worker.child.stdin.end();
      if (worker.child.exitCode === null && worker.child.signalCode === null) worker.child.kill();
      await worker.closed;
    }));
    this.workers.clear();
  }
}
