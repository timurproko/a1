import { describe, expect, it } from "vitest";
import { createPiEngineAdapter, type PiRuntimeLike, type PiSessionLike } from "../../../src/foundation/pi-engine-adapter/index.js";
import {
  createProcessTerminalHost,
  runOwnedUiDevelopmentMode,
  type OwnedTerminalHost,
} from "../../../src/features/owned-ui/index.js";

class Session implements PiSessionLike {
  readonly sessionId = "pi-session";
  readonly model = null;
  readonly thinkingLevel = "medium";
  readonly isStreaming = false;
  readonly isIdle = true;
  readonly isRetrying = false;
  readonly isCompacting = false;
  readonly messages = [];
  subscribe(): () => void { return () => {}; }
  async prompt(): Promise<void> {}
  async steer(): Promise<void> {}
  async followUp(): Promise<void> {}
  async abort(): Promise<void> {}
  abortRetry(): void {}
  abortCompaction(): void {}
  async compact(): Promise<void> {}
  async setModel(): Promise<void> {}
  setThinkingLevel(): void {}
  dispose(): void {}
}

class Runtime implements PiRuntimeLike {
  readonly session = new Session();
  readonly services = { modelRuntime: { getModel: () => undefined }, diagnostics: [] };
  readonly diagnostics = [];
  setRebindSession(): void {}
  async newSession(): Promise<void> {}
  async switchSession(): Promise<void> {}
  async dispose(): Promise<void> { this.session.dispose(); }
}

class Host implements OwnedTerminalHost {
  readonly columns = 80;
  readonly rows = 24;
  readonly writes: string[] = [];
  active = false;
  write(text: string): void { this.writes.push(text); }
  setActive(active: boolean): void { this.active = active; }
  onInput(): () => void { return () => {}; }
  onResize(): () => void { return () => {}; }
}

describe("owned UI development run", () => {
  it("provides a process host and restores an explicitly selected disposed session", async () => {
    expect(createProcessTerminalHost().columns).toBeGreaterThan(0);
    const adapter = await createPiEngineAdapter({
      cwd: process.cwd(),
      sessionId: "owned-run-test",
      createRuntime: async () => new Runtime(),
    });
    await adapter.dispose();
    const host = new Host();

    const result = await runOwnedUiDevelopmentMode({ adapter, host });
    expect(result).toBe(0);
    expect(host.active).toBe(false);
    expect(host.writes[0]).toContain("\x1b[?1049h");
    expect(host.writes.at(-1)).toContain("\x1b[?1049l");
  });
});
