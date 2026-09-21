import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, sep } from "node:path";
import { performance } from "node:perf_hooks";
import { PredecessorCommandError, runPredecessorCommand, type PredecessorCommand, type PredecessorCommandEvidence } from "./predecessor-command.js";

type Execute = typeof runPredecessorCommand;
interface FixtureOptions {
  readonly execute?: Execute;
  readonly remove?: (root: string) => Promise<void>;
  readonly report?: (evidence: PredecessorCommandEvidence) => void;
}

/** Owns fixture command lifetimes and temporary roots without changing predecessor release code. */
export class PredecessorFixture {
  readonly #roots = new Set<string>();
  readonly #commands = new Set<Promise<unknown>>();
  readonly #phases = new Set<Promise<unknown>>();
  readonly #execute: Execute;
  readonly #remove: (root: string) => Promise<void>;
  readonly #report: (evidence: PredecessorCommandEvidence) => void;
  #controller: AbortController | undefined;
  #unsafeCleanup = false;
  #closing = false;
  #close: Promise<void> | undefined;

  constructor(options: FixtureOptions = {}) {
    this.#execute = options.execute ?? runPredecessorCommand;
    this.#remove = options.remove ?? (root => rm(root, { recursive: true, force: true }));
    this.#report = options.report ?? (evidence => console.log(`predecessor-phase ${JSON.stringify(evidence)}`));
  }

  get retainedRoots(): readonly string[] { return [...this.#roots]; }

  /** Uses one existing hook/test budget across all its commands, not a fresh deadline per invocation. */
  async phase<T>(timeoutMs: number, operation: (signal: AbortSignal) => Promise<T>, externalSignal?: AbortSignal): Promise<T> {
    if (this.#closing || this.#controller) throw new Error("predecessor fixture phase overlap or closed fixture");
    const controller = new AbortController();
    this.#controller = controller;
    const abort = () => controller.abort();
    const timer = setTimeout(abort, timeoutMs);
    externalSignal?.addEventListener("abort", abort, { once: true });
    if (externalSignal?.aborted) abort();
    const promise = Promise.resolve().then(async () => {
      controller.signal.throwIfAborted();
      const result = await operation(controller.signal);
      controller.signal.throwIfAborted();
      return result;
    });
    this.#phases.add(promise);
    try { return await promise; }
    finally {
      clearTimeout(timer); externalSignal?.removeEventListener("abort", abort);
      this.#phases.delete(promise); this.#controller = undefined;
    }
  }

  /** Installs only into a recorded private prefix, then checks shipped setup before exposing the package. */
  async install(specifier: string, version?: string): Promise<string> {
    const root = await this.temporaryRoot("a1-predecessor-install-");
    const prefix = resolve(root, "prefix");
    const identity = version === undefined ? {} : { version };
    await this.run({ executable: process.platform === "win32" ? "npm.cmd" : "npm", cwd: root,
      phase: version === undefined ? "install-candidate" : "install-predecessor", ...identity,
      arguments: ["install", "--global", "--prefix", prefix, specifier, "--ignore-scripts", "--no-audit", "--no-fund"] });
    return resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@timurproko", "a1");
  }

  /** Preserves npm's object/array response forms and publication-time predecessor ordering. */
  async publishedVersions(candidateVersion: string): Promise<string[]> {
    const listed = await this.run({ executable: process.platform === "win32" ? "npm.cmd" : "npm", cwd: process.cwd(),
      phase: "registry", arguments: ["view", "@timurproko/a1", "time", "--json"] });
    try { return predecessorVersions(listed.stdout, candidateVersion); }
    catch { throw new PredecessorCommandError({ ...listed.evidence, error: "INVALID_REGISTRY_METADATA" }); }
  }

  /** Measures predecessor-owned phases without changing their code or logging their payloads. */
  async measure<T>(phase: "materialize" | "warm", version: string, operation: () => Promise<T>): Promise<T> {
    if (!/^[A-Za-z0-9_.+-]{1,128}$/.test(version)) throw new Error("invalid predecessor version label");
    const signal = this.#signal();
    const start = performance.now();
    const evidence: PredecessorCommandEvidence = { phase, version, executable: "other", durationMs: 0,
      stdoutBytes: 0, stderrBytes: 0, exitCode: null, signal: null, error: null, cleanupError: null };
    this.#report({ ...evidence, phase: `${phase}-start` });
    try {
      const value = await operation();
      signal.throwIfAborted();
      this.#report({ ...evidence, durationMs: Math.round(performance.now() - start), exitCode: 0 });
      return value;
    } catch (error) {
      this.#report({ ...evidence, durationMs: Math.round(performance.now() - start), error: signal.aborted ? "ABORTED" : "PHASE_FAILED" });
      throw error;
    }
  }

  /**
   * Releases one finished root while its phase budget still applies, so teardown is not left holding
   * every predecessor installation at once. Only a fixture-owned root is reachable, and an active owned
   * command blocks the removal rather than racing it.
   */
  async discard(path: string): Promise<void> {
    const signal = this.#signal();
    if (this.#commands.size > 0) throw new Error(`predecessor discard while ${this.#commands.size} owned command(s) are active`);
    const root = this.#owningRoot(path);
    const start = performance.now();
    const evidence: PredecessorCommandEvidence = { phase: "discard", version: null, executable: "other", durationMs: 0,
      stdoutBytes: 0, stderrBytes: 0, exitCode: null, signal: null, error: null, cleanupError: null, roots: 1 };
    try {
      await this.#remove(root);
      this.#roots.delete(root);
    } catch (error) {
      this.#report({ ...evidence, durationMs: Math.round(performance.now() - start), error: signal.aborted ? "ABORTED" : "DISCARD_FAILED" });
      throw error;
    }
    this.#report({ ...evidence, durationMs: Math.round(performance.now() - start), exitCode: 0 });
    signal.throwIfAborted();
  }

  /** Registers a root before observing cancellation so teardown cannot lose a newly created directory. */
  async temporaryRoot(prefix: string): Promise<string> {
    const signal = this.#signal();
    const root = await mkdtemp(resolve(tmpdir(), prefix));
    this.#roots.add(root);
    signal.throwIfAborted();
    return root;
  }

  /** Never removes roots until active operations settle; cleanup failure retains unsafe roots for diagnosis. */
  close(timeoutMs = 120_000): Promise<void> {
    this.#close ??= this.#finish(timeoutMs);
    return this.#close;
  }

  private async run(command: Omit<PredecessorCommand, "signal">): ReturnType<Execute> {
    const signal = this.#signal();
    const promise = this.#execute({ ...command, signal });
    this.#commands.add(promise);
    try {
      const result = await promise;
      this.#report(result.evidence);
      signal.throwIfAborted();
      return result;
    } catch (error) {
      if (error instanceof PredecessorCommandError) {
        if (error.evidence.cleanupError) this.#unsafeCleanup = true;
        this.#report(error.evidence);
      }
      throw error;
    } finally { this.#commands.delete(promise); }
  }

  #owningRoot(path: string): string {
    const target = resolve(path);
    const owner = [...this.#roots].find(root => target === root || target.startsWith(`${root}${sep}`));
    if (!owner) throw new Error("predecessor discard outside a fixture-owned root");
    return owner;
  }

  #signal(): AbortSignal {
    if (this.#closing || !this.#controller) throw new Error("predecessor command outside active phase");
    this.#controller.signal.throwIfAborted();
    return this.#controller.signal;
  }

  async #finish(timeoutMs: number): Promise<void> {
    this.#closing = true;
    this.#controller?.abort();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.allSettled([...this.#phases, ...this.#commands]),
        new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error("predecessor cleanup: active operation did not close; roots retained")), timeoutMs); }),
      ]);
    } finally { if (timer) clearTimeout(timer); }
    if (this.#unsafeCleanup) throw new Error("predecessor cleanup: child ownership/closure unverified; roots retained");
    // Rationale: a teardown that outgrows its hook budget reads as an opaque hook timeout, so the roots
    // it still had to remove and the time they cost are reported before the outcome is decided.
    const start = performance.now();
    const retained = this.#roots.size;
    const outcomes = await Promise.allSettled([...this.#roots].map(async root => { await this.#remove(root); this.#roots.delete(root); }));
    const failed = outcomes.some(outcome => outcome.status === "rejected");
    this.#report({ phase: "cleanup", version: null, executable: "other", durationMs: Math.round(performance.now() - start),
      stdoutBytes: 0, stderrBytes: 0, exitCode: failed ? null : 0, signal: null, error: failed ? "CLEANUP_FAILED" : null,
      cleanupError: null, roots: retained });
    if (failed) throw new Error("predecessor cleanup: failed to remove fixture roots");
  }
}

function predecessorVersions(stdout: string, candidateVersion: string): string[] {
  const parsed: unknown = JSON.parse(stdout);
  const records = Array.isArray(parsed) ? parsed : [parsed];
  const published = new Map<string, string>();
  for (const record of records) {
    if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("invalid publication map");
    for (const [version, date] of Object.entries(record)) {
      if (!/^[A-Za-z0-9_.+-]{1,128}$/.test(version) || typeof date !== "string" || !Number.isFinite(Date.parse(date))) throw new Error("invalid publication entry");
      published.set(version, date);
    }
  }
  return [...published].filter(([version]) => version !== candidateVersion && version !== "created" && version !== "modified")
    .sort(([, left], [, right]) => Date.parse(right) - Date.parse(left)).map(([version]) => version);
}
