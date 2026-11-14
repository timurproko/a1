import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";
// Protocol: disposable equivalent of the supplied Herdr consumer, not product matching code.
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu;
export function freshHerdrColorBinding(labels: Record<string, string>, now: number) {
  const native = ["a1.session", "a1.runtime", "a1.at"].some(key => Object.hasOwn(labels, key));
  const prefix = native ? "a1" : "custom.a1";
  const sessionId = labels[`${prefix}.session`], runtimeId = labels[`${prefix}.runtime`], at = labels[`${prefix}.at`];
  if (!sessionId || !runtimeId || !at || !UUID.test(sessionId) || !UUID.test(runtimeId) || !/^\d+$/u.test(at)) return undefined;
  const age = now - Number(at);
  return age >= -5000 && age <= 90_000 ? { sessionId, runtimeId } : undefined;
}
export interface FixtureColorTarget { machine: string; terminal: string; space: string; tab: string; sessionId: string; runtimeId: string; color: string }
export interface FixtureColorTerminal { address: string; state: string; app: string; labels: Record<string, string> }
export interface FixtureColorSpace { machine: string; id: string; color: string; tabs: readonly string[] }
export function fixtureColorTargets(spaces: readonly FixtureColorSpace[], panes: readonly { terminal: string; tab: string }[], terminals: readonly FixtureColorTerminal[], now: number): FixtureColorTarget[] {
  const targets: FixtureColorTarget[] = [];
  for (const space of spaces) for (const pane of panes) {
    if (!space.tabs.includes(pane.tab)) continue;
    const terminal = terminals.find(item => item.address === pane.terminal);
    const binding = terminal && freshHerdrColorBinding(terminal.labels, now);
    if (terminal?.state !== "live" || terminal.app !== PRODUCT_IDENTITY.commandName || !binding) continue;
    targets.push({ machine: space.machine, terminal: terminal.address, space: space.id, tab: pane.tab, ...binding, color: space.color });
  }
  return targets;
}
export async function syncFixtureColors(targets: readonly FixtureColorTarget[], expiresAt: number, ports: {
  now(): number;
  terminal(target: FixtureColorTarget): Promise<FixtureColorTerminal>;
  get(target: FixtureColorTarget): Promise<{ sessionId: string; color: string }>;
  set(target: FixtureColorTarget): Promise<{ sessionId: string; color: string }>;
}): Promise<FixtureColorTarget[]> {
  const valid = async (target: FixtureColorTarget) => {
    if (ports.now() >= expiresAt || expiresAt > ports.now() + 15_000) return false;
    const terminal = await ports.terminal(target), binding = freshHerdrColorBinding(terminal.labels, ports.now());
    return terminal.address === target.terminal && terminal.state === "live" && terminal.app === PRODUCT_IDENTITY.commandName
      && binding?.sessionId === target.sessionId && binding.runtimeId === target.runtimeId
      && terminal.labels["herdr.space"] === target.space && terminal.labels["herdr.tab"] === target.tab;
  };
  const applied: FixtureColorTarget[] = [];
  for (const target of targets) try {
    if (!await valid(target)) continue;
    const current = await ports.get(target);
    if (current.sessionId !== target.sessionId || !await valid(target)) continue;
    if (current.color !== target.color) {
      if (ports.now() >= expiresAt) continue;
      const result = await ports.set(target);
      if (result.sessionId !== target.sessionId || result.color !== target.color) continue;
    }
    applied.push(target);
  } catch { /* Protocol: unavailable/replaced targets never select a different session. */ }
  return applied;
}
export function herdrLaunchArguments(probe: string, color: string): string[] {
  try { const value = JSON.parse(probe); if (value.version === 1 && value.launchColor === true && value.terminalIdentity === true) return ["--session-color", color]; } catch {}
  return [];
}
