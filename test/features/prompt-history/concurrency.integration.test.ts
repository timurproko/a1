import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { PromptHistoryStore } from "../../../src/features/prompt-history/store.js";

async function child(code: string, args: string[]): Promise<void> {
  const processChild = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "-e", code, ...args], { stdio: "ignore" });
  const [status] = await once(processChild, "exit");
  expect(status).toBe(0);
}

describe("multi-process prompt history", () => {
  it("serializes simultaneous first-open, writes and pruning", async () => {
    const root = await mkdtemp(join(tmpdir(), "history-concurrency-"));
    const path = join(root, "history.sqlite3");
    try {
      await Promise.all([0, 1, 2].map(writer => child(`
        import { PromptHistoryStore, classifyHistoryError } from './src/features/prompt-history/store.ts';
        import { setTimeout as delay } from 'node:timers/promises';
        const retry = async fn => { for(let attempt=0;;attempt++){try{return fn()}catch(error){if(classifyHistoryError(error)!=='busy'||attempt>80)throw error;await delay(25)}} };
        const store = await retry(() => new PromptHistoryStore(process.argv[1], 'shared-profile', 100));
        for(let i=0;i<20;i++) await retry(() => store.record({id:process.argv[2]+'-'+i,text:process.argv[2]+'-'+i,timestamp:i,kind:'prompt'}));
        store.close();
      `, [path, String(writer)])));
      const store = new PromptHistoryStore(path, "shared-profile", 100);
      try {
        const snapshot = store.snapshot();
        expect(snapshot.entries).toHaveLength(60);
        expect(new Set(snapshot.entries.map(item => item.text)).size).toBe(60);
        const smaller = new PromptHistoryStore(path, "shared-profile", 10);
        try {
          store.record({ id: "last", text: "last", timestamp: 0, kind: "prompt" });
          expect(smaller.snapshot().entries).toHaveLength(10);
          expect(smaller.snapshot().entries[0]?.text).toBe("last");
        } finally { smaller.close(); }
      } finally { store.close(); }
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 15000);

  it.each(["write", "initialization"])("recovers after terminating an uncommitted %s", async phase => {
    const root = await mkdtemp(join(tmpdir(), "history-crash-")); const path = join(root, "history.sqlite3");
    if (phase === "write") {
      const seed = new PromptHistoryStore(path, "shared-profile", 100);
      seed.record({ id: "saved", text: "saved", timestamp: 0, kind: "prompt" }); seed.close();
    }
    const writer = spawn(process.execPath, ["--input-type=module", "-e", `
      import { DatabaseSync } from 'node:sqlite';
      const db = new DatabaseSync(process.argv[1]);
      db.exec(process.argv[2] === 'write' ? 'BEGIN IMMEDIATE; DELETE FROM prompts;' : 'BEGIN IMMEDIATE; CREATE TABLE partial_schema(id INTEGER);');
      process.send('transaction-open');
      setInterval(()=>{},1000);
    `, path, phase], { stdio: ["ignore", "ignore", "ignore", "ipc"] });
    try {
      await once(writer, "message");
      const exited = once(writer, "exit"); writer.kill("SIGKILL"); await exited;
      const recovered = new PromptHistoryStore(path, "shared-profile", 100);
      try { expect(recovered.snapshot().entries.map(item => item.text)).toEqual(phase === "write" ? ["saved"] : []); }
      finally { recovered.close(); }
    } finally {
      if (writer.exitCode === null && writer.signalCode === null) { const exited = once(writer, "exit"); writer.kill("SIGKILL"); await exited; }
      await rm(root, { recursive: true, force: true });
    }
  }, 10000);
});
