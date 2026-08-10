import { appendFileSync, readFileSync } from "node:fs";

const logPath = process.env.ADDONE_FIXTURE_LOG;
const log = (message: string) => {
  if (logPath) appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`);
};
const size = () => {
  const path = process.env.ADDONE_TEST_TERMINAL_SIZE_PATH;
  if (path) {
    try {
      const outer = JSON.parse(readFileSync(path, "utf8")) as { columns?: number; rows?: number };
      if (outer.columns && outer.rows) return `${outer.columns}x${Math.max(1, outer.rows - 4)}`;
    } catch {}
  }
  return `${process.stdout.columns ?? 80}x${process.stdout.rows ?? 24}`;
};
const paint = () => {
  process.stdout.write(`\x1b[2J\x1b[H\x1b[1;32mPI FIXTURE\x1b[0m\r\nSIZE:${size()}\r\nREADY> `);
  log(`paint size=${size()}`);
};
let command = "";
if (process.stdin.isTTY) process.stdin.setRawMode?.(true);
process.stdin.setEncoding("utf8");
process.stdin.resume();
process.stdin.on("data", data => {
  const text = String(data);
  log(`input=${JSON.stringify(text)}`);
  process.stdout.write(`\r\nINPUT:${JSON.stringify(text)}\r\nREADY> `);
  command += text;
  const match = /exit\s+(-?\d+)\r?$/.exec(command);
  if (match) {
    const exitCode = Number(match[1]);
    process.stdout.write(`\r\nFINAL SURFACE exit=${exitCode}\r\n`);
    log(`exit=${exitCode}`);
    setTimeout(() => process.exit(exitCode), 20);
  }
  if (command.length > 256) command = command.slice(-256);
});
process.on("SIGWINCH", () => {
  process.stdout.write(`\r\nRESIZED:${size()}\r\nREADY> `);
  log(`resize=${size()}`);
});
process.on("SIGTERM", () => { log("SIGTERM"); process.exit(143); });
paint();
