import {
  mkdir,
  mkdtemp,
  writeFile,
  readFile,
  chmod,
  rm,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createConnection } from "node:net";
import { lookup } from "node:dns/promises";
import { pathToFileURL } from "node:url";
import {
  assertHostedFixtureJob,
  fixtureEnvironment,
  fixtureReceiptPath,
  isolationReceipt,
  writableOutputs,
} from "./native-fixture-isolation-plan.mjs";
import { prepareFixtureCaches } from "./native-fixture-cache.mjs";
import {
  json,
  save,
  powershell,
  invokeWorker,
  readableCommand,
} from "./native-fixture-controller.mjs";
import {
  prepareUnixIsolation,
  cleanupUnixIsolation,
} from "./native-fixture-unix.mjs";
import { requireNativeFixtureContext } from "./native-fixture-policy.mjs";

function stateFile() {
  const receipt = process.env.NATIVE_FIXTURE_ISOLATION_RECEIPT;
  if (!receipt)
    throw new Error("Native fixture receipt path is not configured");
  return `${receipt}.state.json`;
}
async function load() {
  assertHostedFixtureJob(process.env);
  const state = await json(stateFile());
  const head = process.env.NATIVE_FIXTURE_HEAD ?? process.env.GITHUB_SHA;
  const checkout = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (
    checkout !== state.head ||
    state.runId !== process.env.GITHUB_RUN_ID ||
    state.runAttempt !== process.env.GITHUB_RUN_ATTEMPT ||
    state.head !== head ||
    state.repo !== process.cwd()
  )
    throw new Error("Native sandbox belongs to another source or run");
  return state;
}
async function requireRemoteReachability() {
  const { address } = await lookup("registry.npmjs.org", { family: 4 });
  await new Promise((resolve, reject) => {
    const socket = createConnection({ host: address, port: 443 });
    socket.once("connect", () => {
      socket.destroy();
      resolve();
    });
    socket.once("error", reject);
    socket.setTimeout(5000, () => {
      socket.destroy();
      reject(new Error("Parent network reachability control failed"));
    });
  });
  return address;
}
async function prepare(predecessors) {
  assertHostedFixtureJob(process.env);
  const repo = process.cwd();
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (head !== (process.env.NATIVE_FIXTURE_HEAD ?? process.env.GITHUB_SHA))
    throw new Error("Native fixture source head changed");
  const id = randomBytes(8).toString("hex");
  const root = await mkdtemp(
    join(process.platform === "darwin" ? "/tmp" : tmpdir(), "native-ci-"),
  );
  const state = {
    id,
    startedAt: new Date().toISOString(),
    platform: process.platform,
    head,
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    repo,
    node: process.execPath,
    user: `nf${id.slice(0, 12)}`,
    uid: 50000 + Number.parseInt(id.slice(0, 6), 16),
    rule: `native-fixture-${id}`,
    root,
    work: join(root, "work"),
    control: join(root, "control"),
    runnerHome: homedir(),
    toolCache: process.env.RUNNER_TOOL_CACHE,
    runnerTemp: process.env.RUNNER_TEMP ?? tmpdir(),
    stateFile: stateFile(),
    receipt: process.env.NATIVE_FIXTURE_ISOLATION_RECEIPT,
    outputs: writableOutputs(repo),
    bridge: join(repo, "scripts/development/native-fixture-windows-worker.ps1"),
  };
  Object.assign(state, {
    workspace: join(state.work, "repo"),
    home: join(state.work, "home"),
    temp: join(state.work, "tmp"),
    cargo: join(state.work, "cargo"),
    rustup: join(state.work, "rustup"),
    profile: join(state.control, "sandbox.sb"),
    canary: join(state.runnerHome, `.native-fixture-canary-${id}`),
  });
  for (const path of [
    state.work,
    state.control,
    state.home,
    state.temp,
    ...state.outputs,
  ])
    await mkdir(path, { recursive: true });
  await writeFile(state.canary, randomBytes(32), { mode: 0o644 });
  await save(state.receipt, { schema: "pending-isolation" }, 0o644);
  await save(state.stateFile, state);
  try {
    await prepareFixtureCaches(state, { predecessors });
    if (state.platform === "win32") {
      await powershell(state, "prepare");
      Object.assign(state, await json(state.stateFile));
    } else await prepareUnixIsolation(state);
    state.environment = fixtureEnvironment(process.env, state);
    await save(state.stateFile, state);
    const remoteHost = await requireRemoteReachability();
    const probe = await invokeWorker(state, {
      kind: "probe",
      canary: state.canary,
      orchestrator: join(
        repo,
        "scripts/development/native-fixture-controller.mjs",
      ),
      remoteHost,
      environment: state.environment,
    });
    const receipt = isolationReceipt(
      state,
      probe,
      state.platform === "win32" ? true : undefined,
    );
    await save(state.receipt, receipt, 0o644);
    await requireNativeFixtureContext();
  } catch (error) {
    await save(state.stateFile, state);
    throw error;
  }
}
async function run(command) {
  const state = await load();
  await requireNativeFixtureContext();
  if (!command.length) throw new Error("Native fixture command is empty");
  const environment = fixtureEnvironment(process.env, state);
  state.environment = environment;
  const nonce = randomBytes(24).toString("hex");
  // Security: workload output cannot send privileged GitHub workflow commands to the runner.
  console.log(`::stop-commands::${nonce}`);
  try {
    const result = await invokeWorker(state, {
      kind: "run",
      command: await readableCommand(state, command),
      environment,
    });
    if (result.exitCode !== 0)
      throw new Error(`Isolated native workload failed (${result.exitCode})`);
  } finally {
    console.log(`::${nonce}::`);
  }
}
async function cleanup() {
  const state = await load();
  if (state.platform === "win32") await powershell(state, "cleanup");
  else await cleanupUnixIsolation(state);
  await rm(state.canary, { force: true });
  await rm(state.receipt, { force: true });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  assertHostedFixtureJob(process.env);
  process.env.NATIVE_FIXTURE_ISOLATION_RECEIPT = fixtureReceiptPath(
    process.env,
  );
  const [operation, ...args] = process.argv.slice(2);
  if (operation === "prepare") await prepare(args.includes("--predecessors"));
  else if (operation === "run")
    await run(args[0] === "--" ? args.slice(1) : args);
  else if (operation === "cleanup") await cleanup();
  else if (operation === "security") {
    const state = await load();
    if (state.platform === "win32") await powershell(state, "security");
  } else
    throw new Error(
      "Expected native isolation prepare, run, cleanup or security",
    );
}
