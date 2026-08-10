#!/usr/bin/env node
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { connect } from "node:net";
import { fileURLToPath } from "node:url";
import { runUi } from "../dist/src/ui/app.js";
import { resolveAddOnePaths } from "../dist/src/supervisor/paths.js";

const paths = resolveAddOnePaths();
if (!await endpointIsLive(paths.endpoint)) {
  const supervisor = spawn(process.execPath, [fileURLToPath(new URL("./addone-supervisor.js", import.meta.url))], {
    detached: true,
    env: process.env,
    stdio: "ignore",
    windowsHide: true,
  });
  supervisor.unref();
  await waitForEndpoint(paths.endpoint, 8_000);
}
await runUi(paths.endpoint);

async function endpointIsLive(endpoint) {
  return await new Promise(resolve => {
    const socket = connect(endpoint);
    let settled = false;
    const finish = live => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(live);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    setTimeout(() => finish(false), 200).unref();
  });
}

async function waitForEndpoint(endpoint, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await endpointIsLive(endpoint)) return;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  try { await access(paths.supervisorLogPath); } catch {}
  throw new Error(`AddOne supervisor did not start within ${timeoutMs}ms; inspect ${paths.supervisorLogPath}`);
}
