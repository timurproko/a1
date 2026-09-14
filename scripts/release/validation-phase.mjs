import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const MAX_PHASES = 128;
const LABEL = /^[a-z][a-z0-9-]{0,79}$/u;

/** Records bounded, content-free fixture phases immediately, including incomplete attempts. */
export function createValidationPhaseRecorder(fixture, options = {}) {
  if (!LABEL.test(fixture)) throw new TypeError("invalid validation fixture label");
  const clock = options.clock ?? (() => performance.now());
  const environment = options.environment ?? process.env;
  const invocation = randomUUID();
  const directory = resolve(options.directory ?? ".artifacts/validation/phases");
  const outputPath = resolve(directory, `${fixture}-${invocation}.jsonl`);
  let initialized = false;
  let sequence = 0;
  let candidateSha256 = null;
  const identity = {
    schema: "a1-validation-phase-v1", fixture, invocation,
    nodeVersion: process.version, platform: process.platform, architecture: process.arch,
    head: matched(options.head ?? checkoutHead(), /^[a-f0-9]{40}$/u),
    runId: matched(environment.GITHUB_RUN_ID, /^\d{1,24}$/u),
    runAttempt: matched(environment.GITHUB_RUN_ATTEMPT, /^\d{1,8}$/u),
    runnerOS: matched(environment.RUNNER_OS, /^(Windows|Linux|macOS)$/u),
    cacheState: "unmeasured",
  };
  const emit = options.emit ?? (event => {
    if (!initialized) { mkdirSync(directory, { recursive: true }); initialized = true; }
    const line = `${JSON.stringify(event)}\n`;
    appendFileSync(outputPath, line);
    process.stdout.write(`[validation-phase] ${line}`);
  });

  function start(phase) {
    if (!LABEL.test(phase)) throw new TypeError("invalid validation phase label");
    if (sequence >= MAX_PHASES) throw new Error("validation phase budget exhausted");
    const id = ++sequence;
    const context = { ...identity, candidateSha256, id, phase };
    emit({ ...context, status: "started", durationMs: 0 });
    const startedAt = clock();
    let finished = false;
    return (status = "passed") => {
      if (finished) throw new Error("validation phase already completed");
      if (!["passed", "failed", "deferred"].includes(status)) throw new TypeError("invalid validation phase status");
      finished = true;
      emit({ ...context, status, durationMs: Math.max(0, Math.round(clock() - startedAt)) });
    };
  }

  function failed(finish, error) {
    // Rationale: an evidence-write failure must not replace the fixture's primary error.
    try { finish("failed"); } catch { process.stderr.write("Validation phase failure evidence could not be written.\n"); }
    throw error;
  }

  async function run(phase, operation, disposition = () => "passed") {
    const finish = start(phase);
    let value;
    try { value = await operation(); } catch (error) { return failed(finish, error); }
    finish(disposition(value));
    return value;
  }

  async function cleanup(phase, operation, disposition = () => "passed") {
    let finish;
    let evidenceError;
    try { finish = start(phase); } catch (error) { evidenceError = error; }
    let value;
    try { value = await operation(); } catch (error) { return failed(finish ?? (() => {}), error); }
    if (evidenceError) throw evidenceError;
    finish(disposition(value));
    return value;
  }

  return {
    outputPath,
    start,
    run,
    cleanup,
    bindCandidate(bytes) { candidateSha256 = createHash("sha256").update(bytes).digest("hex"); },
    async runWithCleanup(phase, operation, cleanupPhase, teardown) {
      let operationFailed = false;
      try { return await run(phase, operation); }
      catch (error) { operationFailed = true; throw error; }
      finally {
        try { await cleanup(cleanupPhase, teardown); }
        catch (error) { if (!operationFailed) throw error; }
      }
    },
    runSync(phase, operation) {
      const finish = start(phase);
      let value;
      try { value = operation(); } catch (error) { return failed(finish, error); }
      finish();
      return value;
    },
  };
}

function checkoutHead() {
  // Rationale: GITHUB_SHA can name a synthetic merge rather than the checked-out PR head.
  try { return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5_000, maxBuffer: 1024 }).trim(); }
  catch { return null; }
}

function matched(value, pattern) {
  return typeof value === "string" && pattern.test(value) ? value : null;
}
