import type { AvailableRelease, StartupReleaseCheckOptions, StartupUpdateMode } from "../foundation/release/latest-release.js";
import type { ComposedSessionBackend } from "./session-backend.js";
import { readPackageVersion } from "./startup-route.js";

export interface StartupReleaseUpdateObservationOptions {
  readonly backend: Pick<ComposedSessionBackend, "extensions">;
  readonly configDir: string;
  readonly mode: StartupUpdateMode;
  readonly packageVersion: string | null;
  readonly notificationVersion: string | undefined;
  readonly checkForNewerRelease: ((options: StartupReleaseCheckOptions) => Promise<AvailableRelease | null>) | undefined;
  readonly clientVersion?: () => string | null;
}

/** Client readiness is unrelated to the retained Agent's engine version or execution lifecycle. */
class ReleaseUpdateObservation {
  readonly #input: StartupReleaseUpdateObservationOptions;
  readonly #controller = new AbortController();
  #timer: ReturnType<typeof setTimeout> | undefined;
  #announced: string | null = null;
  #eligible: boolean;
  #cadence: number | null = null;
  #nextDelay: number | null = null;
  #started = false;
  #running = false;
  #refresh = false;
  constructor(input: StartupReleaseUpdateObservationOptions) { this.#input = input; this.#eligible = input.mode === "auto"; }

  async #observe(): Promise<void> {
    // Performance: registry modules and their locks stay outside the first-frame startup graph.
    const releases = await import("../foundation/release/latest-release.js");
    this.#cadence = releases.UPDATE_CHECK_INTERVAL_MS; this.#nextDelay = this.#cadence;
    const input = this.#input;
    const check = input.checkForNewerRelease ?? releases.checkForNewerRelease;
    const client = input.clientVersion?.();
    const runningVersion = client ?? input.packageVersion ?? await readPackageVersion();
    const options: StartupReleaseCheckOptions = {
      runningVersion: client ?? (input.mode === "notify" ? input.notificationVersion ?? runningVersion : runningVersion),
      configDir: input.configDir, interactive: process.stdout.isTTY === true, settingMode: input.mode,
      signal: this.#controller.signal, onNextCheckDelay: delay => { this.#nextDelay = delay; },
    };
    if (input.checkForNewerRelease === undefined && releases.startupReleaseCheckSkipReason(options) !== null) {
      this.#eligible = false; return;
    }
    const release = await check(options);
    if (release === null || this.#controller.signal.aborted) return;
    const current = input.clientVersion?.();
    if (current && !releases.isNewerRelease(release.version, current)) return;
    if (input.mode === "notify") { input.backend.extensions.announceReleaseUpdate(release); return; }
    if (input.mode !== "auto") return;
    const installed = await import("../foundation/release/automatic-update.js")
      .then(module => module.requestAutomaticUpdate({ release, runningVersion, signal: this.#controller.signal }));
    const actual = input.clientVersion?.();
    if (installed === null || installed === this.#announced || this.#controller.signal.aborted
      || actual && !releases.isNewerRelease(installed, actual)) return;
    this.#announced = installed;
    input.backend.extensions.announceReleaseUpdate({ status: "installed", version: installed });
  }
  async #run(): Promise<void> {
    if (this.#running) { this.#refresh = true; return; }
    this.#running = true;
    try { await this.#observe(); } catch { /* Rationale: observation is best effort and never interrupts execution. */ }
    this.#running = false;
    if (this.#refresh && !this.#controller.signal.aborted) { this.#refresh = false; void this.#run(); return; }
    if (this.#eligible && this.#cadence !== null && !this.#controller.signal.aborted) {
      this.#timer = setTimeout(() => { void this.#run(); }, this.#nextDelay ?? this.#cadence); this.#timer.unref?.();
    }
  }
  start(): void {
    if (this.#started || this.#controller.signal.aborted) return;
    this.#started = true; void this.#run();
  }
  stop(): void { this.#controller.abort(); if (this.#timer !== undefined) clearTimeout(this.#timer); }
  clientChanged(): void {
    this.#announced = null;
    if (!this.#started || this.#controller.signal.aborted || this.#input.mode === "no") return;
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    void this.#run();
  }
}
export function createStartupReleaseUpdateObservation(input: StartupReleaseUpdateObservationOptions) { return new ReleaseUpdateObservation(input); }
