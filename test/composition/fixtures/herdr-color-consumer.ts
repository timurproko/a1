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
export function herdrLaunchArguments(probe: string, color: string): string[] {
  try { const value = JSON.parse(probe); if (value.version === 1 && value.launchColor === true && value.terminalIdentity === true) return ["--session-color", color]; } catch {}
  return [];
}
