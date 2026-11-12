import { createHerdrCommand, type HerdrCommandPort } from "./herdr-command.js";
import { HERDR_IDENTITY_LABELS, validHerdrIdentity, withHerdrBinding, type HerdrBindingReservation, type HerdrPublishedBinding } from "./herdr-binding.js";

interface ReporterOptions {
  readonly reservation: HerdrBindingReservation;
  /** Only an endpoint-published current binding is eligible, never a pending replacement. */
  readonly identity: () => { readonly sessionId: string; readonly binding: number } | undefined;
  readonly command?: HerdrCommandPort;
  readonly now?: () => number;
  readonly schedule?: (callback: () => void, milliseconds: number) => () => void;
}

/** Best-effort endpoint-ready identity reporting, coalesced and fenced across A1 runtimes. */
export function createHerdrReporter(options: ReporterOptions) {
  const command = options.command ?? createHerdrCommand(), now = options.now ?? Date.now;
  let stopped = false, dirty = false, running: Promise<void> | undefined, disposal: Promise<void> | undefined;
  const request = () => {
    if (stopped) return;
    dirty = true;
    if (running) return;
    running = drain().finally(() => { running = undefined; if (dirty && !stopped) request(); });
  };
  async function drain(): Promise<void> {
    while (dirty && !stopped) {
      dirty = false;
      await publish().catch(() => {});
    }
  }
  async function publish(): Promise<void> {
    await withHerdrBinding(options.reservation, async state => {
      const identity = options.identity();
      if (stopped || !identity || !validHerdrIdentity(options.reservation.terminalId, options.reservation.runtimeId, identity.sessionId)) return;
      const labels = await readLabels();
      if (!labels || !canOwn(labels, state.published)) return;
      const current = options.identity();
      if (stopped || current?.sessionId !== identity.sessionId || current.binding !== identity.binding) return;
      const time = now();
      if (!Number.isSafeInteger(time) || time < 0) return;
      const published = { runtimeId: options.reservation.runtimeId, sessionId: identity.sessionId, at: String(time) };
      if (await invoke(["label", options.reservation.terminalId, `${HERDR_IDENTITY_LABELS.session}=${published.sessionId}`, `${HERDR_IDENTITY_LABELS.runtime}=${published.runtimeId}`, `${HERDR_IDENTITY_LABELS.at}=${published.at}`, "--json"]) !== undefined) state.published = published;
    });
  }
  async function invoke(arguments_: string[]): Promise<string | undefined> {
    const result = await command(arguments_);
    if (!result.settled) throw Object.assign(new Error("Core write settlement is unverifiable"), { settled: false });
    return result.ok ? result.stdout : undefined;
  }
  async function readLabels(): Promise<Record<string, unknown> | undefined> {
    const output = await invoke(["get", options.reservation.terminalId, "--json"]);
    if (output === undefined) return undefined;
    const value = JSON.parse(output) as { address?: unknown; labels?: unknown };
    if (value.address !== options.reservation.terminalId || !value.labels || typeof value.labels !== "object" || Array.isArray(value.labels)) return undefined;
    return value.labels as Record<string, unknown>;
  }
  const cancelTimer = (options.schedule ?? scheduleHeartbeat)(request, 30_000);
  request();
  async function shutdown() {
    stopped = true; dirty = false; cancelTimer();
    await running;
    await withHerdrBinding(options.reservation, async state => {
      if (state.published?.runtimeId !== options.reservation.runtimeId) return;
      const labels = await readLabels();
      if (!labels || !matches(labels, state.published)) return;
      if (await invoke(["label", options.reservation.terminalId, `${HERDR_IDENTITY_LABELS.session}=`, `${HERDR_IDENTITY_LABELS.runtime}=`, `${HERDR_IDENTITY_LABELS.at}=`, "--json"]) !== undefined) delete state.published;
    });
  }
  return { request, dispose() { return disposal ??= shutdown(); } };
}
function matches(labels: Record<string, unknown>, published: HerdrPublishedBinding): boolean {
  return labels[HERDR_IDENTITY_LABELS.runtime] === published.runtimeId && labels[HERDR_IDENTITY_LABELS.session] === published.sessionId && labels[HERDR_IDENTITY_LABELS.at] === published.at;
}
function canOwn(labels: Record<string, unknown>, published?: HerdrPublishedBinding): boolean {
  const absent = Object.values(HERDR_IDENTITY_LABELS).every(key => !Object.hasOwn(labels, key));
  return absent || (published !== undefined && matches(labels, published));
}
function scheduleHeartbeat(callback: () => void, milliseconds: number): () => void {
  const timer = setInterval(callback, milliseconds).unref();
  return () => clearInterval(timer);
}
