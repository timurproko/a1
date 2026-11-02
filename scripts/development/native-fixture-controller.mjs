import { spawn } from "node:child_process";
import { readFile, writeFile, copyFile, access } from "node:fs/promises";
import { join, resolve, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { unixInvocation, shareUnixRequest } from "./native-fixture-unix.mjs";

export const json = async (file) =>
  JSON.parse((await readFile(file, "utf8")).replace(/^\uFEFF/u, ""));
export async function save(file, value, mode = 0o600) {
  await writeFile(file, JSON.stringify(value, null, 2) + "\n", { mode });
}
export function execute(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      windowsHide: true,
      ...options,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      code === 0
        ? resolve()
        : reject(
            new Error(`native isolation command failed (${code ?? signal})`),
          ),
    );
  });
}
function powershell(state, operation, request) {
  const script = join(
    state.repo,
    "scripts/development/native-fixture-windows.ps1",
  );
  return execute("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-File",
    script,
    "-Operation",
    operation,
    "-State",
    state.stateFile,
    ...(request ? ["-Request", request] : []),
  ]);
}
export { powershell };

/** GitHub-generated shell scripts are copied read-only, never exposing the runner's special-file directory. */
export async function readableCommand(state, command) {
  const copied = [];
  for (const arg of command) {
    const path = resolve(arg);
    if (
      path.startsWith(resolve(state.runnerTemp)) &&
      [".sh", ".ps1"].includes(extname(path))
    ) {
      await access(path);
      const target = join(
        state.control,
        `script-${randomUUID()}${extname(path)}`,
      );
      await copyFile(path, target);
      copied.push(target);
    } else copied.push(arg);
  }
  return copied;
}
export async function invokeWorker(state, plan) {
  const id = randomUUID();
  const request = join(state.control, `request-${id}.json`);
  Object.assign(plan, {
    node: state.node,
    repo: state.workspace ?? state.repo,
    sid: state.sid,
    uid: state.uid,
    worker: join(state.repo, "scripts/development/native-fixture-worker.mjs"),
    result: join(state.work, `result-${id}.json`),
    completed: join(state.work, `complete-${id}`),
    stdout: join(state.work, `stdout-${id}.log`),
    stderr: join(state.work, `stderr-${id}.log`),
  });
  await save(request, plan, 0o644);
  if (state.platform === "win32") await powershell(state, "run", request);
  else {
    await shareUnixRequest(state, request);
    const invocation = unixInvocation(state, request);
    await execute(invocation.command, invocation.args, { env: process.env });
  }
  return json(plan.result);
}
