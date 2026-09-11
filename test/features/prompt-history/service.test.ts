import { Worker } from "node:worker_threads";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { PromptHistoryService } from "../../../src/features/prompt-history/index.js";

function fixture(script: string) {
  let launches = 0;
  const service = new PromptHistoryService({ dataDir: tmpdir(), profileRoot: join(tmpdir(), "synthetic-history-profile"), limit: 100,
    createWorker: () => {
      launches++;
      return new Worker(`const { parentPort } = require('node:worker_threads'); ${script}`, { eval: true, stdout: true, stderr: true });
    },
  });
  const failures: string[] = [];
  service.onFailure(code => failures.push(code));
  return { service, failures, launches: () => launches };
}
const submission = { id: "test", text: "private sentinel", timestamp: 1, kind: "prompt" as const };

describe("history worker failure isolation", () => {
  it("never replays after a worker exits with an uncertain write outcome", async () => {
    const { service, failures, launches } = fixture(`parentPort.postMessage({ id:0, ok:true }); parentPort.on('message', () => process.exit(0));`);
    try {
      expect(await service.record(submission)).toBe("skipped");
      expect(await service.record({ ...submission, id: "second" })).toBe("skipped");
      expect(launches()).toBe(1); expect(failures).toEqual(["unavailable"]);
    } finally { await service.close(); }
  });

  it("contains arbitrary worker diagnostics and malformed replies", async () => {
    const { service, failures } = fixture(`parentPort.postMessage({ id:0, ok:false, code:'private sentinel' });`);
    try { expect(await service.record(submission)).toBe("skipped"); expect(failures).toEqual(["unavailable"]); }
    finally { await service.close(); }
  });

  it("stops a nonresponsive worker within the bounded shutdown window", async () => {
    const { service, failures } = fixture(`parentPort.postMessage({ id:0, ok:true }); parentPort.on('message', () => {});`);
    const pending = service.record(submission);
    const start = performance.now();
    await service.close();
    expect(performance.now() - start).toBeLessThan(3000);
    expect(await pending).toBe("skipped");
    expect(failures).toContain("shutdown");
  });

  it("does not launch or access storage when closed before start", async () => {
    const { service, launches } = fixture("");
    await service.close(); service.start();
    expect(await service.record(submission)).toBe("skipped"); expect(launches()).toBe(0);
  });
});
