import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TerminalParitySession, inputForAction } from "./pi-terminal-parity/terminal-session.mjs";
import { applyIntentionalMutation, compareParityRun, renderSideBySideDiff } from "./pi-terminal-parity/comparator.mjs";
import {
  commonParityEnvironment,
  DEFAULT_COLUMNS,
  DEFAULT_ROWS,
  FULL_GATE_TIMEOUT_MS,
  PINNED_PI_COMMIT,
  PINNED_PI_VERSION,
  prepareParityFixture,
  TERMINAL_PARITY_ACTIONS,
  TERMINAL_PARITY_TOLERANCES,
} from "./pi-terminal-parity/scenario.mjs";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const artifactRoot = resolve(packageRoot, "artifacts", "pi-terminal-parity", "latest");
const workRoot = resolve(artifactRoot, "work");
const piPackageRoot = resolve(packageRoot, "node_modules", "@earendil-works", "pi-coding-agent");
const piCliPath = resolve(piPackageRoot, "dist", "cli.js");
const addoneCliPath = resolve(packageRoot, "bin", "a1-ui.js");
const sessions = [];
let interrupted = false;

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    interrupted = true;
    void cleanup().finally(() => process.exit(130));
  });
}

await rm(artifactRoot, { recursive: true, force: true });
await mkdir(artifactRoot, { recursive: true });

try {
  const result = await withTimeout(runGate(), FULL_GATE_TIMEOUT_MS, "terminal parity gate");
  await writeArtifacts(result);
  process.stdout.write(renderSideBySideDiff(result.comparison, result.upstream, result.addone));
  process.stdout.write(`Artifacts: ${artifactRoot}\n`);
  process.exitCode = result.comparison.passed ? 0 : 1;
} catch (error) {
  const partialCaptures = await Promise.allSettled(sessions.map(session => session.result()));
  const diagnostic = {
    schemaVersion: 1,
    passed: false,
    kind: "harness-failure",
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack?.split("\n").slice(0, 20).join("\n") } : { message: String(error) },
    interrupted,
    producers: partialCaptures.map(result => result.status === "fulfilled"
      ? result.value
      : { captureError: result.reason instanceof Error ? result.reason.message : String(result.reason) }),
  };
  await writeFile(resolve(artifactRoot, "report.json"), `${JSON.stringify(diagnostic, null, 2)}\n`, "utf8");
  await writeFile(resolve(artifactRoot, "diff.txt"), `Pi terminal parity harness failure\n${diagnostic.error.message}\n`, "utf8");
  console.error(`Pi terminal parity harness failed: ${diagnostic.error.message}`);
  console.error(`Artifacts: ${artifactRoot}`);
  process.exitCode = 2;
} finally {
  await cleanup();
}
process.exit(process.exitCode ?? 0);

async function runGate() {
  const identity = await pinnedIdentity();
  const fixture = await prepareParityFixture(workRoot);
  const upstream = new TerminalParitySession({
    producer: "upstream-pi",
    executable: process.execPath,
    arguments: [piCliPath, "--offline", "--approve"],
    cwd: fixture.cwd,
    environment: commonParityEnvironment(fixture.profiles["upstream-pi"]),
    columns: DEFAULT_COLUMNS,
    rows: DEFAULT_ROWS,
  });
  const addone = new TerminalParitySession({
    producer: "addone-owned-ui",
    executable: process.execPath,
    arguments: [addoneCliPath],
    cwd: fixture.cwd,
    environment: {
      ...commonParityEnvironment(fixture.profiles["addone-owned-ui"]),
      A1_LAUNCH_PROFILE: "addone",
      A1_LAUNCH_ARGUMENTS_JSON: "[]",
    },
    columns: DEFAULT_COLUMNS,
    rows: DEFAULT_ROWS,
  });
  sessions.push(upstream, addone);

  for (const action of TERMINAL_PARITY_ACTIONS) {
    await performAction([upstream, addone], action);
  }

  const [upstreamCapture, originalAddoneCapture] = await Promise.all([upstream.result(), addone.result()]);
  const mutation = process.env.A1_PI_PARITY_INTENTIONAL_MUTATION;
  const addoneCapture = mutation === "visual" || mutation === "input-scroll"
    ? applyIntentionalMutation(originalAddoneCapture, mutation)
    : originalAddoneCapture;
  const comparison = compareParityRun(upstreamCapture, addoneCapture, { tolerances: TERMINAL_PARITY_TOLERANCES });
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    identity,
    scenario: {
      id: "pinned-pi-full-terminal-parity",
      timeoutMs: FULL_GATE_TIMEOUT_MS,
      geometry: { columns: DEFAULT_COLUMNS, rows: DEFAULT_ROWS },
      checkpointNames: TERMINAL_PARITY_ACTIONS.filter(action => action.type === "checkpoint").map(action => action.name),
      actionKinds: [...new Set(TERMINAL_PARITY_ACTIONS.map(action => action.type))],
      intentionalMutation: mutation ?? null,
      tolerances: [...TERMINAL_PARITY_TOLERANCES],
    },
    upstream: upstreamCapture,
    addone: addoneCapture,
    comparison,
  };
}

async function performAction(producers, action) {
  if (action.type === "wait") {
    await delay(action.milliseconds);
    if (action.until) await Promise.all(producers.map(producer => producer.waitForText(action.until)));
    if (action.settle !== false) await Promise.all(producers.map(producer => producer.settle()));
    return;
  }
  if (action.type === "checkpoint") {
    for (const producer of producers) producer.capture(action.name, action.domains);
    return;
  }
  if (action.type === "resize") {
    for (const producer of producers) producer.resize(action.columns, action.rows);
    await Promise.all(producers.map(producer => producer.settle({ quietMs: 350 })));
    return;
  }
  if (action.type === "wheel") {
    const rows = (action.notches ?? 1) * 3 * (action.direction === "up" ? -1 : 1);
    for (const producer of producers) producer.scrollViewport(rows);
    return;
  }
  if (action.type === "shutdown") {
    await Promise.all(producers.map(producer => producer.shutdown("\x04", 7_000)));
    return;
  }
  const input = inputForAction(action);
  for (const producer of producers) producer.write(input);
  if (action.settle !== false) await Promise.all(producers.map(producer => producer.settle()));
}

async function pinnedIdentity() {
  const manifestSource = await readFile(resolve(piPackageRoot, "package.json"), "utf8");
  const manifest = JSON.parse(manifestSource);
  if (manifest.version !== PINNED_PI_VERSION) {
    throw new Error(`terminal parity requires @earendil-works/pi-coding-agent ${PINNED_PI_VERSION}, found ${manifest.version}`);
  }
  const cliSource = await readFile(piCliPath);
  const addoneManifest = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
  return {
    upstream: {
      package: manifest.name,
      version: manifest.version,
      commit: PINNED_PI_COMMIT,
      cliSha256: createHash("sha256").update(cliSource).digest("hex"),
      executable: process.execPath,
      arguments: [piCliPath, "--offline", "--approve"],
      usesAddoneRenderingCode: false,
    },
    addone: {
      package: addoneManifest.name,
      version: addoneManifest.version,
      executable: process.execPath,
      arguments: [addoneCliPath],
      launchPath: "owned-ui",
    },
  };
}

async function writeArtifacts(result) {
  const report = `${JSON.stringify(result, null, 2)}\n`;
  const maxReportBytes = 4 * 1024 * 1024;
  if (Buffer.byteLength(report) > maxReportBytes) throw new Error(`bounded parity report exceeded ${maxReportBytes} bytes`);
  await Promise.all([
    writeFile(resolve(artifactRoot, "report.json"), report, "utf8"),
    writeFile(resolve(artifactRoot, "diff.txt"), renderSideBySideDiff(result.comparison, result.upstream, result.addone), "utf8"),
    writeFile(resolve(artifactRoot, "upstream-checkpoints.json"), `${JSON.stringify(result.upstream, null, 2)}\n`, "utf8"),
    writeFile(resolve(artifactRoot, "addone-checkpoints.json"), `${JSON.stringify(result.addone, null, 2)}\n`, "utf8"),
  ]);
}

async function cleanup() {
  await Promise.allSettled(sessions.map(session => session.dispose()));
}

async function withTimeout(promise, milliseconds, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => { timer = setTimeout(() => reject(new Error(`${label} exceeded ${milliseconds}ms`)), milliseconds); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
