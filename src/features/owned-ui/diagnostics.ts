import type { OwnedUiDiagnostics } from "../../contracts/owned-ui/index.js";

export interface OwnedUiFrameObservation {
  readonly requestedFrames: number;
  readonly presentedFrames: number;
  readonly failedFrames: number;
  readonly lastFrameBytes: number;
}

export interface OwnedUiResourceObservation {
  readonly cpuUserMicros: number;
  readonly cpuSystemMicros: number;
  readonly residentMemoryBytes: number;
  readonly heapBytes: number;
}

export interface OwnedUiDiagnosticsSnapshot {
  readonly entries: readonly OwnedUiDiagnostics[];
  readonly frames: OwnedUiFrameObservation;
  readonly resources: OwnedUiResourceObservation | null;
  readonly terminalRestorationFailed: boolean;
}

/** Retains bounded, redacted UI diagnostics together with frame and resource observations. */
export class OwnedUiDiagnosticsRecorder {
  readonly #entries: OwnedUiDiagnostics[] = [];
  #sequence = 0;
  #requestedFrames = 0;
  #presentedFrames = 0;
  #failedFrames = 0;
  #lastFrameBytes = 0;
  #resources: OwnedUiResourceObservation | null = null;
  #terminalRestorationFailed = false;

  constructor(readonly maximumEntries = 100) {
    if (!Number.isSafeInteger(maximumEntries) || maximumEntries <= 0) throw new RangeError("diagnostic capacity must be positive");
  }

  entries(): readonly OwnedUiDiagnostics[] {
    return this.#entries.map(entry => ({ ...entry }));
  }

  record(
    severity: OwnedUiDiagnostics["severity"],
    code: string,
    message: string,
    recoverable = true,
  ): OwnedUiDiagnostics {
    const entry: OwnedUiDiagnostics = {
      sequence: this.#sequence++,
      code: sanitizeDiagnosticCode(code),
      severity,
      message: redactDiagnosticMessage(message),
      recoverable,
    };
    this.#entries.push(entry);
    if (this.#entries.length > this.maximumEntries) this.#entries.shift();
    return { ...entry };
  }

  noteFrame(bytes: number, failed = false): OwnedUiFrameObservation {
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new RangeError("frame byte count is invalid");
    this.#requestedFrames += 1;
    if (failed) this.#failedFrames += 1;
    else this.#presentedFrames += 1;
    this.#lastFrameBytes = bytes;
    return this.frames();
  }

  noteResources(observation: OwnedUiResourceObservation): OwnedUiResourceObservation {
    for (const value of Object.values(observation)) {
      if (!Number.isFinite(value) || value < 0) throw new RangeError("resource observations must be non-negative finite values");
    }
    this.#resources = Object.freeze({ ...observation });
    return this.#resources;
  }

  captureResources(read: () => NodeJS.ResourceUsage = () => process.resourceUsage()): OwnedUiResourceObservation {
    const usage = read();
    return this.noteResources({
      cpuUserMicros: usage.userCPUTime,
      cpuSystemMicros: usage.systemCPUTime,
      residentMemoryBytes: process.memoryUsage().rss,
      heapBytes: process.memoryUsage().heapUsed,
    });
  }

  noteTerminalRestorationFailure(error: unknown): OwnedUiDiagnostics {
    this.#terminalRestorationFailed = true;
    return this.record(
      "error",
      "terminal-restoration",
      error instanceof Error ? error.message : String(error),
      false,
    );
  }

  frames(): OwnedUiFrameObservation {
    return {
      requestedFrames: this.#requestedFrames,
      presentedFrames: this.#presentedFrames,
      failedFrames: this.#failedFrames,
      lastFrameBytes: this.#lastFrameBytes,
    };
  }

  snapshot(): OwnedUiDiagnosticsSnapshot {
    return {
      entries: this.entries(),
      frames: this.frames(),
      resources: this.#resources === null ? null : { ...this.#resources },
      terminalRestorationFailed: this.#terminalRestorationFailed,
    };
  }
}

export function redactDiagnosticMessage(message: string): string {
  return message
    .replace(/[A-Za-z0-9_\-]{24,}\.[A-Za-z0-9_\-]{12,}\.[A-Za-z0-9_\-]{12,}/g, "[redacted-token]")
    .replace(/(api[_-]?key|token|secret|password)=([^\s]+)/gi, "$1=[redacted]")
    .replace(/[A-Z]:\\Users\\[^\\\s]+/gi, "[home]")
    .replace(/\/home\/[^/\s]+/g, "[home]")
    .slice(0, 4_096);
}

function sanitizeDiagnosticCode(code: string): string {
  const normalized = code.toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!normalized) throw new TypeError("diagnostic code is invalid");
  return normalized.slice(0, 128);
}
