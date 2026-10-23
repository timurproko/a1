import type { TabBridgeClient } from "../foundation/resident-tabs/bridge-client.js";
import { consumeSeedPrompt } from "../foundation/resident-tabs/seed-prompt.js";

/** What a resident Agent tab's seeded first prompt waits for and is submitted through. */
export interface ResidentTabSeedPorts {
  readonly dataDir: string;
  readonly presenter: {
    submit(text: string): Promise<unknown>;
    view(): { readonly dialog?: unknown };
    readonly root: { usesDefaultInputSurface(): boolean };
  };
  readonly runtime: { readonly active: boolean; hasOverlay(): boolean };
}

/** How often a retained seed rechecks the screen. */
const SEED_RETRY_MS = 25;
/**
 * How long the screen must stay free before the seed is submitted. Rationale: it outlasts the
 * startup route's own retry interval, so a retained release note or Settings route reopens first.
 */
const SEED_SETTLE_MS = 60;

/**
 * Takes the tab's seeded first prompt from its private file, at bind and whenever the server
 * announces one, and submits it exactly once through the ordinary submission path once the shell
 * runs and no startup route, overlay, dialog, or replacement input surface holds the screen.
 * Returns the unbinding.
 */
export function bindResidentTabSeed(
  tabBridge: Pick<TabBridgeClient, "onCommand">,
  ports: ResidentTabSeedPorts,
  now: () => number = Date.now,
): () => void {
  let seed: string | null = null;
  let submitted = false;
  let freeSince: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const screenFree = () => ports.runtime.active
    && !ports.runtime.hasOverlay()
    && ports.presenter.root.usesDefaultInputSurface()
    && ports.presenter.view().dialog == null;
  const attempt = () => {
    timer = undefined;
    if (seed === null || submitted) return;
    if (!screenFree()) freeSince = undefined;
    else if (freeSince === undefined) freeSince = now();
    else if (now() - freeSince >= SEED_SETTLE_MS) {
      const text = seed;
      submitted = true;
      seed = null;
      void ports.presenter.submit(text).catch(() => undefined);
      return;
    }
    timer = setTimeout(attempt, SEED_RETRY_MS);
    timer.unref?.();
  };
  const take = () => {
    const text = consumeSeedPrompt(ports.dataDir);
    if (text === null || submitted || seed !== null) return;
    seed = text;
    attempt();
  };
  take();
  const unsubscribe = tabBridge.onCommand(command => {
    if (command.type !== "seed") return;
    take();
    command.acknowledge();
  });
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    seed = null;
    unsubscribe();
  };
}
