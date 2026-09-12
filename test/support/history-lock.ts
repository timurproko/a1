import { spawn } from "node:child_process";
import { once } from "node:events";

/** Independent SQLite writer, held beyond the former 1.5-second service timeout on Windows and Unix. */
export async function holdHistoryLock(path: string, milliseconds = 3000) {
  const child = spawn(process.execPath, ["--input-type=module", "-e", `
    import { DatabaseSync } from 'node:sqlite';
    const database = new DatabaseSync(process.argv[1]);
    database.exec('PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
    process.send('locked');
    setTimeout(() => { database.exec('ROLLBACK'); database.close(); process.disconnect(); }, Number(process.argv[2]));
  `, path, String(milliseconds)], { stdio: ["ignore", "ignore", "ignore", "ipc"] });
  const released = once(child, "exit").then(([code]) => { if (code !== 0) throw new Error("History lock fixture failed"); });
  // Concurrency: race startup against process exit rather than hanging when a fixture cannot open its store.
  await Promise.race([once(child, "message"), released.then(() => { throw new Error("History lock exited before acquisition"); })]);
  return { released, async stop() {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit"); child.kill(); await exited;
  } };
}
