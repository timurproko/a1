import { describe, expect, it } from "vitest";
import { createPiEngineAdapter } from "../../../src/foundation/pi-engine-adapter/index.js";
import { runOwnedUi } from "../../../src/features/owned-ui/index.js";
import {
  TestAgentEngine,
  TestPresentationTerminal,
  adapterRuntimeDouble,
} from "./neutral-port-doubles.js";

describe("owned UI run", () => {
  it("uses injected owned test doubles and restores a disposed session", async () => {
    const engine = new TestAgentEngine("owned-run-test");
    const adapter = await createPiEngineAdapter({
      cwd: process.cwd(),
      sessionId: "owned-run-test",
      createRuntime: async () => adapterRuntimeDouble(engine),
    });
    await adapter.dispose();
    const terminal = new TestPresentationTerminal();

    const result = await runOwnedUi({ adapter, terminal });
    expect(result).toBe(0);
    expect(engine.disposed).toBe(true);
    expect(terminal.active).toBe(false);
    expect(terminal.writes.join("")).not.toContain("\x1b[?1049h");
    expect(terminal.writes.join("")).not.toContain("\x1b[?1049l");
  });
});
