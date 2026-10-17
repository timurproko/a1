import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const separator = process.argv.indexOf("--");
if (separator < 0 || separator === process.argv.length - 1) throw new Error("owner fixture requires -- <runtime> [arguments]");
const options = parseOptions(process.argv.slice(2, separator));
const [executable, ...arguments_] = process.argv.slice(separator + 1);
const addon = require(resolve(options.addon));
const encodedModes = addon.captureTerminalModes();
const environment = {
  ...process.env,
  ...(options.notice ? { A1_EXIT_NOTICE_PATH: options.notice } : {}),
};
const runtime = addon.spawnContained({
  executable,
  arguments: arguments_,
  cwd: process.cwd(),
  environment,
  instanceId: "integration-owner",
});
const watcherArguments = [
  options.watcher,
  "--guardian-pid", String(process.pid),
  "--notice", options.notice ?? `${options.state}.unused-notice`,
  "--modes", encodedModes,
  "--addon", resolve(options.addon),
  "--runtime-pid", String(runtime.pid),
  ...(runtime.processGroup === null ? [] : ["--process-group", String(runtime.processGroup)]),
  ...(runtime.foregroundGroup === null ? [] : ["--foreground-group", String(runtime.foregroundGroup)]),
];
let watcherPid;
if (process.platform === "win32") {
  watcherPid = addon.spawnWatcher({ executable: process.execPath, arguments: watcherArguments });
} else {
  const watcher = spawn(process.execPath, watcherArguments, { stdio: "inherit", detached: false });
  watcher.unref();
  watcherPid = watcher.pid;
}
await writeFile(options.state, JSON.stringify({
  ownerPid: process.pid,
  watcherPid,
  runtimePid: runtime.pid,
  startIdentity: runtime.startIdentity,
  processGroup: runtime.processGroup,
}));
const exitCode = await runtime.wait();
if (options.notice) addon.deliverExitNotice(options.notice, encodedModes);
runtime.close();
process.exit(exitCode);

function parseOptions(arguments_) {
  const options = {};
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (!name?.startsWith("--") || value === undefined) throw new Error("owner fixture arguments are malformed");
    if (name === "--addon") options.addon = value;
    else if (name === "--watcher") options.watcher = value;
    else if (name === "--state") options.state = value;
    else if (name === "--notice") options.notice = value;
    else throw new Error(`owner fixture received unknown option ${name}`);
  }
  if (!options.addon || !options.watcher || !options.state) throw new Error("owner fixture is missing addon, watcher, or state");
  return options;
}
