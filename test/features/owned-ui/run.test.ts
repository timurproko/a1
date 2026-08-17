import { describe, expect, it } from "vitest";
import { createPiEngineAdapter, type PiRuntimeLike, type PiSessionLike } from "../../../src/foundation/pi-engine-adapter/index.js";
import type { PiTuiTerminalPort } from "../../../src/foundation/pi-tui-runtime-adapter/index.js";
import { runOwnedUi } from "../../../src/features/owned-ui/index.js";

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

class Terminal implements PiTuiTerminalPort {
  readonly columns = 80;
  readonly rows = 24;
  readonly kittyProtocolActive = false;
  readonly writes: string[] = [];
  active = false;
  start(): void { this.active = true; }
  stop(): void { this.active = false; }
  async drainInput(): Promise<void> {}
  write(text: string): void { this.writes.push(text); }
  moveBy(): void {}
  hideCursor(): void { this.write("\x1b[?25l"); }
  showCursor(): void { this.write("\x1b[?25h"); }
  clearLine(): void { this.write("\x1b[K"); }
  clearFromCursor(): void { this.write("\x1b[J"); }
  clearScreen(): void { this.write("\x1b[2J\x1b[H"); }
  setTitle(): void {}
  setProgress(): void {}
}

describe("owned UI run", () => {
  it("uses the Pi-backed shell and restores a disposed session", async () => {
    const adapter = await createPiEngineAdapter({
      cwd: process.cwd(),
      sessionId: "owned-run-test",
      createRuntime: async () => new Runtime(),
    });
    await adapter.dispose();
    const terminal = new Terminal();

    const result = await runOwnedUi({ adapter, terminal });
    expect(result).toBe(0);
    expect(terminal.active).toBe(false);
    expect(terminal.writes.join("")).not.toContain("\x1b[?1049h");
    expect(terminal.writes.join("")).not.toContain("\x1b[?1049l");
  });
});
