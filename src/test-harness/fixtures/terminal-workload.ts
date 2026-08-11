import { appendFileSync } from "node:fs";
import { terminalWorkloadById } from "../generic-terminal-corpus.js";

const workload = terminalWorkloadById(process.env.ADDONE_TERMINAL_WORKLOAD ?? "");
const tracePath = process.env.ADDONE_TERMINAL_WORKLOAD_TRACE;
const startedAt = performance.now();
let sequence = 0;
const trace = (stage: string, detail: Readonly<Record<string, unknown>>) => {
  if (!tracePath) return;
  appendFileSync(tracePath, `${JSON.stringify({ stage, atMs: Math.round(performance.now() - startedAt), sequence: ++sequence, workloadId: workload.id, ...detail })}\n`);
};

process.stdout.write("TERMINAL CORPUS /help\r\nREADY> ");
trace("source-write", { sourceCommitId: "bootstrap-ready", part: "readiness", bytes: 31 });

if (process.stdin.isTTY) process.stdin.setRawMode?.(true);
process.stdin.setEncoding("utf8");
process.stdin.resume();
process.stdin.on("data", data => trace("child-input", { dataHex: Buffer.from(String(data), "utf8").toString("hex") }));
process.on("SIGWINCH", () => trace("child-resize", { columns: process.stdout.columns ?? null, rows: process.stdout.rows ?? null }));

const writesByTime = new Map<number, typeof workload.writes[number][]>();
for (const write of workload.writes) {
  const group = writesByTime.get(write.atMs) ?? [];
  group.push(write);
  writesByTime.set(write.atMs, group);
}
for (const [atMs, writes] of writesByTime) {
  setTimeout(() => {
    for (const write of writes) {
      trace("source-write", {
        sourceCommitId: write.sourceCommitId,
        part: write.part,
        bytes: Buffer.byteLength(write.data, "utf8"),
        dataHex: Buffer.from(write.data, "utf8").toString("hex"),
      });
      process.stdout.write(write.data);
      if (/\x1b\[\?2026l/.test(write.data)) trace("synchronized-commit", { sourceCommitId: write.sourceCommitId });
      if (/\x1b\[[0-9;]*H|\x1b\[[0-6]? q|\x1b\[\?25[hl]/.test(write.data) && /epilogue/.test(write.part)) {
        trace("cursor-epilogue", { sourceCommitId: write.sourceCommitId });
      }
    }
  }, atMs);
}
const finalAt = Math.max(0, ...workload.writes.map(write => write.atMs)) + workload.settleMs;
setTimeout(() => {
  trace("workload-complete", { finalAt });
  process.exit(0);
}, finalAt);
