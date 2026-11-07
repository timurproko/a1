import type { AvailableRelease, StartupReleaseCheckOptions, StartupUpdateMode } from "../foundation/release/latest-release.js";
import type { ComposedSessionBackend } from "./session-backend.js";

export interface StartupReleaseUpdateObservationOptions {
  readonly backend: Pick<ComposedSessionBackend, "extensions">;
  readonly configDir: string;
  readonly mode: StartupUpdateMode;
  readonly packageVersion: string | null;
  readonly readPackageVersion: () => Promise<string>;
  readonly checkForNewerRelease: ((options: StartupReleaseCheckOptions) => Promise<AvailableRelease | null>) | undefined;
}

/**
 * `Auto` installs a verified newer release in the background; the only thing the user sees is the
 * installed status once the approved active release is newer than the one running here.
 */
class ReleaseUpdateObservation {
  readonly #input: StartupReleaseUpdateObservationOptions;
  readonly #controller = new AbortController();
  #timer: ReturnType<typeof setTimeout> | undefined;
  #installedAnnounced = false;
  #eligible: boolean;
  #cadence: number | null = null;
  #nextDelay: number | null = null;
  #started = false;
  #running = false;
  #refresh = false;
  #stopActiveReleaseObservation: () => void = () => {};
  constructor(input: StartupReleaseUpdateObservationOptions) { this.#input = input; this.#eligible = input.mode === "auto"; }

  #announceInstalled(version: string): void {
    if (this.#installedAnnounced || this.#controller.signal.aborted) return;
    this.#installedAnnounced = true;
    this.#eligible = false;
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#input.backend.extensions.announceReleaseUpdate({ status: "installed", version });
  }
  async #startActiveReleaseObservation(): Promise<void> {
    const runningVersion = this.#input.packageVersion ?? await this.#input.readPackageVersion();
    if (this.#controller.signal.aborted) return;
    const module = await import("../foundation/release/automatic-update.js");
    if (this.#controller.signal.aborted) return;
    this.#stopActiveReleaseObservation = module.observeNewerActiveRelease({
      runningVersion,
      signal: this.#controller.signal,
      onNewer: version => this.#announceInstalled(version),
    });
  }
  async #observe(): Promise<void> {
    // Performance: registry modules and their locks stay outside the first-frame startup graph.
    const releases = await import("../foundation/release/latest-release.js");
    this.#cadence = releases.UPDATE_CHECK_INTERVAL_MS; this.#nextDelay = this.#cadence;
    const input = this.#input;
    const check = input.checkForNewerRelease ?? releases.checkForNewerRelease;
    const runningVersion = input.packageVersion ?? await input.readPackageVersion();
    const options: StartupReleaseCheckOptions = {
      runningVersion,
      configDir: input.configDir, interactive: process.stdout.isTTY === true, settingMode: input.mode,
      signal: this.#controller.signal, onNextCheckDelay: delay => { this.#nextDelay = delay; },
    };
    if (input.checkForNewerRelease === undefined && releases.startupReleaseCheckSkipReason(options) !== null) {
      this.#eligible = false; return;
    }
    const release = await check(options);
    if (release === null || this.#controller.signal.aborted || input.mode !== "auto") return;
    const installed = await import("../foundation/release/automatic-update.js")
      .then(module => module.requestAutomaticUpdate({ release, runningVersion, signal: this.#controller.signal }));
    if (installed !== null) this.#announceInstalled(installed);
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
    this.#started = true;
    void this.#startActiveReleaseObservation().catch(() => undefined);
    void this.#run();
  }
  stop(): void {
    this.#controller.abort();
    this.#stopActiveReleaseObservation();
    if (this.#timer !== undefined) clearTimeout(this.#timer);
  }
}
export function createStartupReleaseUpdateObservation(input: StartupReleaseUpdateObservationOptions) { return new ReleaseUpdateObservation(input); }
