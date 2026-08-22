import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const [mode, statePath] = process.argv.slice(2);
const self = fileURLToPath(import.meta.url);

if (mode === "root" || mode === "root-group") {
  const grouped = mode === "root-group";
  spawn(process.execPath, [self, grouped ? "child-group" : "child", statePath], {
    detached: !grouped,
    stdio: "ignore",
    windowsHide: true,
  }).unref();
  await waitForever();
} else if (mode === "child" || mode === "child-group") {
  const grouped = mode === "child-group";
  const grandchild = spawn(process.execPath, [self, "wait"], {
    detached: !grouped,
    stdio: "ignore",
    windowsHide: true,
  });
  grandchild.unref();
  await writeFile(statePath, JSON.stringify({ rootPid: process.ppid, childPid: process.pid, grandchildPid: grandchild.pid }));
  await waitForever();
} else if (mode === "wait") {
  await waitForever();
} else if (mode === "short") {
  await new Promise(resolvePromise => setTimeout(resolvePromise, 1_000));
} else {
  throw new Error(`unknown process-tree fixture mode: ${String(mode)}`);
}

function waitForever() {
  return new Promise(() => {
    setInterval(() => undefined, 1_000);
  });
}
